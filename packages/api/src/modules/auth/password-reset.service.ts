import { randomBytes } from "crypto"
import { Resend } from "resend"
import type { FastifyInstance } from "fastify"
import { env } from "../../env.js"
import { hashToken, hashPassword } from "../../utils/hash.js"
import { AppError } from "../../utils/errors.js"

const resend = new Resend(env.RESEND_API_KEY)
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

export class PasswordResetService {
  constructor(private readonly fastify: FastifyInstance) {}

  async requestReset(email: string): Promise<void> {
    const admin = await this.fastify.prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (admin === null) return

    await this.fastify.prisma.passwordResetToken.deleteMany({
      where: { adminId: admin.id },
    })

    const rawToken = randomBytes(32).toString("hex")
    console.log("RESET TOKEN (dev only):", rawToken)
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + FIFTEEN_MINUTES_MS)

    await this.fastify.prisma.passwordResetToken.create({
      data: {
        adminId: admin.id,
        tokenHash,
        expiresAt,
      },
    })

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`

    await resend.emails.send({
      from: env.RESEND_FROM,
      to: admin.email,
      subject: "Reset your darun.dev password",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
      `,
    })
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new AppError("Password must be at least 8 characters", 400, "VALIDATION_ERROR")
    }

    const tokenHash = hashToken(rawToken)

    const resetToken = await this.fastify.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (resetToken === null) {
      throw new AppError("Invalid or expired reset token", 400, "INVALID_TOKEN")
    }

    const passwordHash = await hashPassword(newPassword)

    await this.fastify.prisma.$transaction([
      this.fastify.prisma.admin.update({
        where: { id: resetToken.adminId },
        data: { passwordHash },
      }),
      this.fastify.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])
  }
}