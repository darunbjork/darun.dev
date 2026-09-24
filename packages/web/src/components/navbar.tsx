import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { label: "Projects", href: "#projects", id: "projects" },
  { label: "About", href: "#about", id: "about" },
  { label: "CV", href: "#cv", id: "cv" },
  { label: "Contact", href: "#contact", id: "contact" },
] as const

export function Navbar(): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const sections = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0] !== undefined) {
          setActive(visible[0].target.id)
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.25, 0.5] }
    )

    for (const s of sections) observer.observe(s)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = "hidden"

    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("resize", handleResize)
    }
  }, [open])

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-(--border) bg-(--void)/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#" className="font-mono text-lg text-(--text)">
            darun<span className="text-(--iris)">.dev</span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const isActive = active === link.id
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "font-medium text-(--iris-soft)"
                      : "text-slate-300 hover:text-white"
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute bottom-1 left-3 right-3 h-px origin-left bg-(--iris) transition-transform duration-300",
                      isActive
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100"
                    )}
                    aria-hidden
                  />
                </a>
              )
            })}
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-(--text) hover:bg-white/5 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-(--void) px-6 pt-24 pb-8 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute top-4 right-4 rounded-lg p-2 text-(--muted) transition-colors hover:text-white"
          >
            <X size={24} />
          </button>

          <nav className="mt-2 flex flex-col gap-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-2 py-3 text-2xl font-medium text-white transition-colors hover:text-(--iris-soft)"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <a
            href="#contact"
            className="mt-8 block rounded-xl bg-(--iris) px-4 py-4 text-center font-semibold text-white transition-colors hover:bg-(--iris-soft) hover:text-(--void)"
            onClick={() => setOpen(false)}
          >
            Let's Talk
          </a>
        </div>
      )}
    </>
  )
}
