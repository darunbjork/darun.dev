import jwt from "jsonwebtoken"
import type { FastifyInstance } from "fastify"
import { env } from "../../env.js"
import { hashPassword, verifyPassword } from "../../utils/hash.js"
import { UnauthorizedError, ConflictError } from "../../utils/errors.js"

export interface JwtPayload {
  adminId: string
  email: string
  iat?: number
  exp?: number
}

export interface LoginResult {
  token: string
  adminId: string
  email: string
}

export class AuthService {
  constructor(private readonly fastify: FastifyInstance) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const admin = await this.fastify.prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (admin === null) {
      throw new UnauthorizedError("Invalid email or password")
    }

    const passwordValid = await verifyPassword(admin.passwordHash, password)
    if (!passwordValid) {
      throw new UnauthorizedError("Invalid email or password")
    }

    const payload: JwtPayload = {
      adminId: admin.id,
      email: admin.email,
    }

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions)

    return {
      token,
      adminId: admin.id,
      email: admin.email,
    }
  }

  async createAdmin(email: string, password: string): Promise<void> {
    const normalised = email.toLowerCase().trim()
    const existing = await this.fastify.prisma.admin.findUnique({
      where: { email: normalised },
    })
    if (existing !== null) {
      throw new ConflictError("Admin with this email")
    }
    const passwordHash = await hashPassword(password)
    await this.fastify.prisma.admin.create({
      data: { email: normalised, passwordHash },
    })
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JwtPayload
    } catch {
      throw new UnauthorizedError("Invalid or expired token")
    }
  }
}