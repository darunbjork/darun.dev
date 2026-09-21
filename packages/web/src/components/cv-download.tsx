import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CvDownload(): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" asChild>
        <a
          href="/darun-mustafa-cv-en.pdf"
          download="Darun-Mustafa-CV-English.pdf"
          className="inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" aria-hidden />
          CV English
        </a>
      </Button>
      <Button type="button" variant="secondary" asChild>
        <a
          href="/darun-mustafa-cv-sv.pdf"
          download="Darun-Mustafa-CV-Svenska.pdf"
          className="inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" aria-hidden />
          CV Svenska
        </a>
      </Button>
    </div>
  )
}