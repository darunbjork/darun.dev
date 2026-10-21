import { Fragment } from "react"

export function InlineText({
  text,
  className = "font-semibold text-(--text)",
}: {
  text: string
  className?: string
}): React.JSX.Element {
  const parts = text.split("**")

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index} className={className}>
            {part}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  )
}
