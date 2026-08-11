/**
 * A per-page error boundary.
 *
 * THE BOUNDARY SITS AROUND THE PAGE BODY, not around the app. A module that throws should cost
 * that module and nothing else: the sidebar, the scope indicator, the filters and the way out all
 * keep working, so the reader can navigate away from a broken page instead of reloading a white
 * screen. Wrapping the whole app instead would turn one bad page into a dead session.
 *
 * The message names the page and offers the two things that actually recover from a render
 * error — try again, or go somewhere else. It deliberately does not print the stack: a director
 * cannot act on one, and the console already has it.
 *
 * A class, because `componentDidCatch` has no hook equivalent. It is the one place in this
 * codebase that needs one.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { FAINT, MUTED, TONE, mix } from '../exec/system'

interface Props {
  children: ReactNode
  /** Named in the message, so the reader knows which page failed. */
  title?: string
}

interface State {
  error: Error | null
}

export class Boundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /* Left in for the developer. The user-facing message says nothing about it. */
    console.error('Page failed to render', error, info.componentStack)
  }

  private retry = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="px-[var(--gutter-lg)] pt-2" role="alert">
        <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <span
            className="grid size-9 place-items-center rounded-full"
            style={{ backgroundColor: mix(TONE.bad, 0.12) }}
            aria-hidden
          >
            <AlertTriangle size={17} strokeWidth={2} style={{ color: TONE.bad }} />
          </span>
          <h2 className="mt-3 text-body font-semibold text-[#1c1a16]">
            {this.props.title ? `${this.props.title} could not be shown` : 'This page could not be shown'}
          </h2>
          <p className="mt-1.5 text-small" style={{ color: MUTED }}>
            Something went wrong while reading the figures for this page. Nothing has been changed.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={this.retry}
              className="card-press rounded-full px-3.5 py-2 text-caption font-semibold text-white"
              style={{ backgroundColor: '#123a2c' }}
            >
              Try again
            </button>
            <a
              href="#/"
              className="card-press rounded-full bg-[#f2f1ed] px-3.5 py-2 text-caption font-semibold text-[#3d3a34]"
            >
              Command centre
            </a>
          </div>
          <p className="mt-3 font-mono text-caption break-words" style={{ color: FAINT }}>
            {error.message}
          </p>
        </div>
      </div>
    )
  }
}
