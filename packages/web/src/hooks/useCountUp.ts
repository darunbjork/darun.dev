import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function useCountUp(
  end: number,
  duration: number = 2
): { ref: React.RefObject<HTMLSpanElement | null>; value: number } {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState<number>(0)

  useEffect(() => {
    const el = ref.current
    if (el === null) return

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    if (reduceMotion) {
      // Async to avoid synchronous setState in effect body
      const raf = requestAnimationFrame(() => setValue(end))
      return () => cancelAnimationFrame(raf)
    }

    const obj = { val: 0 }
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: end,
        duration,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
        },
        onUpdate: (): void => {
          setValue(Math.round(obj.val))
        },
      })
    })

    return (): void => {
      ctx.revert()
    }
  }, [end, duration])

  return { ref, value }
}