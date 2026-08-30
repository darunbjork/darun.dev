import { ValidationError } from "./errors.js"

const SIGNATURES: Record<string, number[][]> = {
  jpeg: [[0xff, 0xd8, 0xff]],
  png:  [[0x89, 0x50, 0x4e, 0x47]],
  webp: [[0x52, 0x49, 0x46, 0x46]],
  gif:  [[0x47, 0x49, 0x46, 0x38]],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // ! 10 MB

export async function validateImageBuffer(
  buffer: Buffer,
  filename: string
): Promise<void> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new ValidationError(`File exceeds 10MB limit: ${filename}`)
  }

  if (buffer.length < 12) {
    throw new ValidationError(`File too small to be a valid image: ${filename}`)
  }

  const bytes = Array.from(buffer.subarray(0, 12))

  const isValid = Object.values(SIGNATURES).some((sigs) =>
    sigs.some((sig) => sig.every((byte, i) => bytes[i] === byte))
  )

  if (!isValid) {
    throw new ValidationError(
      `File is not a valid image (JPEG, PNG, WebP, or GIF): ${filename}`
    )
  }
}