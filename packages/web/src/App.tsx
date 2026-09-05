import { useProjects } from "./hooks/useProjects.js"

export function App(): React.JSX.Element {
  const { projects, isLoading, isError, error } = useProjects()

  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      <h1>
        darun<span style={{ color: "#7c3aed" }}>.dev</span>
      </h1>
      <p style={{ color: "#64748b" }}>useProjects()</p>

      {isLoading && <p>Loading projects…</p>}
      {isError && (
        <p style={{ color: "#f87171" }}>
          {error?.message ?? "Failed to load projects"}
        </p>
      )}
      {!isLoading && !isError && (
        <ul>
          {(projects ?? []).map((p) => (
            <li key={p.id}>
              <strong>{p.title}</strong>{" "}
              <span style={{ color: "#64748b" }}>({p.slug})</span>
            </li>
          ))}
          {(projects ?? []).length === 0 && (
            <li style={{ color: "#64748b" }}>No published projects yet.</li>
          )}
        </ul>
      )}
    </div>
  )
}