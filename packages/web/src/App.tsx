import { GlassCard } from "@/components/glass-card"
import { Button } from "@/components/ui/button"
import { useProjects } from "./hooks/useProjects.js"

export function App(): React.JSX.Element {
  const { projects, isLoading } = useProjects()

  return (
    <div className="min-h-screen bg-(--void)] text-(--text)] p-8">
      <h1 className="text-3xl font-semibold mb-6">
        darun<span className="text-(--iris)]">.dev</span>
      </h1>

      <div className="grid gap-4 max-w-xl">
        <GlassCard className="p-6" glow="iris">
          <h2 className="text-lg font-medium mb-2">Iris glass</h2>
          <p className="text-(--muted)] text-sm mb-4">
            Primary accent surface for featured blocks.
          </p>
          <Button type="button">Continue</Button>
        </GlassCard>

        <GlassCard className="p-6" glow="ember" elevated>
          <h2 className="text-lg font-medium mb-2">Ember elevated</h2>
          <p className="text-(--muted)] text-sm">
            {isLoading
              ? "Loading projects…"
              : `${projects?.length ?? 0} published projects`}
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-medium mb-2">Default glass</h2>
          <p className="text-(--muted)] text-sm">
            Neutral surface — no glow.
          </p>
        </GlassCard>
      </div>
    </div>
  )
}