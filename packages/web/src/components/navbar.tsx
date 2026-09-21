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

  return (
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
                    ? "text-(--text)"
                    : "text-(--muted) hover:text-(--text)"
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

      {open && (
        <div className="border-t border-(--border) bg-(--void) px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-(--muted) hover:text-(--text)"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}