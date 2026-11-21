import { describe, expect, it } from "vitest"
import { assertLocalTestEnv } from "./helpers/test-env-guard.js"

const LOCAL_DB = "postgresql://user:pass@localhost:5434/darundev_test"
const LOCAL_REDIS = "redis://127.0.0.1:6380"
const REMOTE_DB = "postgresql://user:s3cret@db.example-host.com:5432/prod"
const REMOTE_REDIS = "rediss://default:s3cret@cache.example-host.com:6379"

describe("assertLocalTestEnv", () => {
  it("accepts localhost and 127.0.0.1", () => {
    expect(() =>
      assertLocalTestEnv({ DATABASE_URL: LOCAL_DB, REDIS_URL: LOCAL_REDIS })
    ).not.toThrow()
    expect(() =>
      assertLocalTestEnv({
        DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/t",
        REDIS_URL: "redis://localhost:6379",
      })
    ).not.toThrow()
  })

  it("throws for a remote DATABASE_URL", () => {
    expect(() =>
      assertLocalTestEnv({ DATABASE_URL: REMOTE_DB, REDIS_URL: LOCAL_REDIS })
    ).toThrow(/DATABASE_URL/)
  })

  it("throws for a remote REDIS_URL", () => {
    expect(() =>
      assertLocalTestEnv({ DATABASE_URL: LOCAL_DB, REDIS_URL: REMOTE_REDIS })
    ).toThrow(/REDIS_URL/)
  })

  it("throws when a URL is missing or unparseable", () => {
    expect(() => assertLocalTestEnv({ REDIS_URL: LOCAL_REDIS })).toThrow(
      /DATABASE_URL/
    )
    expect(() =>
      assertLocalTestEnv({ DATABASE_URL: "not a url", REDIS_URL: LOCAL_REDIS })
    ).toThrow(/DATABASE_URL/)
  })

  it("does not leak credentials or hostnames in the error message", () => {
    let message = ""
    try {
      assertLocalTestEnv({ DATABASE_URL: REMOTE_DB, REDIS_URL: REMOTE_REDIS })
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).not.toBe("")
    expect(message).not.toContain("s3cret")
    expect(message).not.toContain("example-host")
  })
})
