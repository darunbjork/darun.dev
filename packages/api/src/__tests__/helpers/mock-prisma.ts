import { vi, type Mock } from "vitest"
import type { PrismaClient } from "../../generated/prisma/client.js"

type DeepMocked<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any
    ? Mock
    : T[P] extends object
      ? DeepMocked<T[P]>
      : T[P]
}

export function createMockPrisma(): DeepMocked<PrismaClient> {
  return {
    $connect:    vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw:   vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    $executeRaw: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({} as unknown)
    }),

    admin: {
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      findMany:   vi.fn().mockResolvedValue([]),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
      upsert:     vi.fn(),
      count:      vi.fn().mockResolvedValue(0),
    },

    passwordResetToken: {
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    project: {
      findMany:   vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
      count:      vi.fn().mockResolvedValue(0),
      upsert:     vi.fn(),
    },

    projectImage: {
      findMany:   vi.fn().mockResolvedValue([]),
      create:     vi.fn(),
      createMany: vi.fn(),
      update:     vi.fn(),
      delete:     vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },

    visitor: {
      findUnique: vi.fn(),
      findFirst:  vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
      upsert:     vi.fn(),
    },

    projectView: {
      upsert: vi.fn(),
      count:  vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },

    feedback: {
      create:    vi.fn(),
      findFirst: vi.fn(),
      findMany:  vi.fn().mockResolvedValue([]),
      update:    vi.fn(),
      aggregate: vi.fn(),
      groupBy:   vi.fn().mockResolvedValue([]),
      count:     vi.fn().mockResolvedValue(0),
    },

    chatSession: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      findMany:   vi.fn().mockResolvedValue([]),
      update:     vi.fn(),
      count:      vi.fn().mockResolvedValue(0),
    },

    chatMessage: {
      create:   vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },

    chatNotes: {
      create: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as DeepMocked<PrismaClient>
}