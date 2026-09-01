import { v2 as cloudinary } from "cloudinary"
import type { FastifyInstance } from "fastify"
import { validateImageBuffer } from "../../utils/magic-bytes.js"
import { NotFoundError, ValidationError } from "../../utils/errors.js"
import { env } from "../../env.js"
import { CacheKey, invalidate } from "../../utils/cache.js"

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
})

export interface UploadResult {
  id: string
  url: string
  publicId: string
  width: number
  height: number
  format: string
  bytes: number
  alt: string | null
  order: number
}

interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
  bytes: number
}

export class MediaService {
  constructor(private readonly fastify: FastifyInstance) {}

  async uploadProjectImage(
    projectId: string,
    buffer: Buffer,
    filename: string,
    alt: string | undefined
  ): Promise<UploadResult> {
    await validateImageBuffer(buffer, filename)

    const project = await this.fastify.prisma.project.findUnique({
      where: { id: projectId },
    })
    if (project === null) {
      throw new NotFoundError("Project")
    }

    const count = await this.fastify.prisma.projectImage.count({
      where: { projectId },
    })

    const uploadResult = await new Promise<CloudinaryUploadResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `darun-dev/projects/${projectId}`,
            resource_type: "image",
            transformation: [
              { width: 1920, height: 1080, crop: "limit" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error !== undefined || result === undefined) {
              reject(error ?? new Error("Cloudinary upload failed"))
              return
            }
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            })
          }
        )
        stream.end(buffer)
      }
    )

    const image = await this.fastify.prisma.projectImage.create({
      data: {
        projectId,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        alt: alt ?? null,
        order: count,
      },
    })

    await invalidate(
      this.fastify.redis,
      CacheKey.projectsList(),
      CacheKey.projectDetail(project.slug)
    )

    return {
      id: image.id,
      url: image.url,
      publicId: image.publicId,
      width: image.width ?? 0,
      height: image.height ?? 0,
      format: image.format ?? uploadResult.format,
      bytes: image.bytes ?? uploadResult.bytes,
      alt: image.alt,
      order: image.order,
    }
  }

  async deleteImage(imageId: string, projectId: string): Promise<void> {
    const image = await this.fastify.prisma.projectImage.findFirst({
      where: { id: imageId, projectId },
      include: { project: { select: { slug: true } } },
    })

    if (image === null) {
      throw new NotFoundError("Image")
    }

    await cloudinary.uploader.destroy(image.publicId)
    await this.fastify.prisma.projectImage.delete({ where: { id: imageId } })

    await invalidate(
      this.fastify.redis,
      CacheKey.projectsList(),
      CacheKey.projectDetail(image.project.slug)
    )
  }

  async reorderImages(
    projectId: string,
    orderedIds: string[]
  ): Promise<void> {
    if (orderedIds.length === 0) {
      throw new ValidationError("orderedIds must not be empty")
    }

    const project = await this.fastify.prisma.project.findUnique({
      where: { id: projectId },
      select: { slug: true },
    })
    if (project === null) {
      throw new NotFoundError("Project")
    }

    const existing = await this.fastify.prisma.projectImage.findMany({
      where: { projectId },
      select: { id: true },
    })
    const existingIds = new Set(existing.map((i) => i.id))

    for (const id of orderedIds) {
      if (!existingIds.has(id)) {
        throw new ValidationError(`Image ${id} does not belong to this project`)
      }
    }
    
    await this.fastify.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.fastify.prisma.projectImage.update({
          where: { id },
          data: { order: index },
        })
      )
    )

    await invalidate(
      this.fastify.redis,
      CacheKey.projectsList(),
      CacheKey.projectDetail(project.slug)
    )
  }
}