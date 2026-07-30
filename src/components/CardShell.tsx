import type { ReactNode } from 'react'

interface Props {
  onPress?: () => void
  className: string
  children: ReactNode
}

/**
 * Renders a real <button> only when a handler exists; otherwise a plain <div>,
 * so cards never advertise interactivity they don't have.
 */
export default function CardShell({ onPress, className, children }: Props) {
  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={`card-press cursor-pointer text-left ${className}`}>
        {children}
      </button>
    )
  }
  return <div className={className}>{children}</div>
}
