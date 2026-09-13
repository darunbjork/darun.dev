import { useEffect } from "react"

let lockCount = 0
let previousOverflow: string | null = null

function lockBody(): void {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow
  }

  lockCount += 1
  document.body.style.overflow = "hidden"
}

function unlockBody(): void {
  if (lockCount > 0) {
    lockCount -= 1
  }

  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? ""
    previousOverflow = null
  }
}

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === "undefined") {
      return undefined
    }

    lockBody()
    return unlockBody
  }, [isLocked])
}
