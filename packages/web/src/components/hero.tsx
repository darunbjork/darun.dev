import { useRef } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Button } from "@/components/ui/button"

gsap.registerPlugin(useGSAP)

export function Hero(): React.JSX.Element {
  const rootRef = useRef<HTMLElement | null>(null)

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      if (reduceMotion || rootRef.current === null) {
        return
      }

      const ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-hero-item]",
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power2.out",
          }
        )
      }, rootRef)

      return () => ctx.revert()
    },
    { scope: rootRef }
  )

  return (
    <header
      ref={rootRef}
      className="relative flex min-h-[88vh] items-center px-6 pt-24"
    >
      <div className="mx-auto max-w-6xl">
        <p
          data-hero-item
          className="mb-4 font-mono text-sm text-(--iris-soft)]"
        >
          Full-Stack AI Engineer · Stockholm
        </p>

        <h1
          data-hero-item
          className="max-w-3xl text-4xl font-semibold tracking-tight text-(--text)] sm:text-5xl md:text-6xl"
        >
          Building production AI systems
          <span className="text-(--iris)]"> end-to-end</span>
        </h1>

        <p
          data-hero-item
          className="mt-6 max-w-xl text-base text-(--muted)] sm:text-lg"
        >
          Darun Mustafa — MERN background, strict TypeScript, Fastify, RAG
          pipelines, and observable backends. Portfolio, chat, and admin tools
          on one platform.
        </p>

        <div data-hero-item className="mt-8 flex flex-wrap gap-3">
          <Button type="button" asChild>
            <a href="#projects">View projects</a>
          </Button>
          <Button type="button" variant="secondary" asChild>
            <a href="#contact">Contact</a>
          </Button>
        </div>
      </div>
    </header>
  )
}