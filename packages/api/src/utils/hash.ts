import argon2 from "argon2"
import { createHash } from "crypto"

const ARGON_OPTIONS = {
  type: argon2.argon2id as 0 | 1 | 2,
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4,
}

export async function hashPassword(password: string): Promise<string> {
  return (await argon2.hash(password, ARGON_OPTIONS)) as string
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password)
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex")
}