import { Button } from "./components/ui/button.js"
import { useProjects } from "./hooks/useProjects.js"

export function App(): React.JSX.Element {
  const { projects, isLoading } = useProjects()

  return (
    <div className="min-h-screen bg-(--void) text-(--text) p-8">
      <h1 className="text-3xl font-semibold mb-2">
        darun<span className="text-(--iris)">.dev</span>
      </h1>
      <p className="text-(--muted) mb-6">tokens + Tailwind</p>
      <Button type="button">Iris button</Button>
      <p className="mt-6 text-(--muted)">
        {isLoading ? "Loading…" : `${projects?.length ?? 0} projects`}
      </p>
    </div>
  )
}