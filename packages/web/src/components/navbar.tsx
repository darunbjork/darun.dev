import { useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const links = [
  { label: "Projects", href: "#projects" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
] as const

export function Navbar(): React.JSX.Element {
  const [open, setOpen] = useState<boolean>(false)

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full border-b border-(--border)]",
        "bg-(--void)]/80 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="font-mono text-lg text-(--text)]">
          darun<span className="text-(--iris)]">.dev</span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-(--muted)] transition-colors hover:text-(--text)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          className="md:hidden rounded-lg p-2 text-(--text)] hover:bg-white/5"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-(--border)] bg-(--void)] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-(--muted)] hover:text-(--text)]"
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