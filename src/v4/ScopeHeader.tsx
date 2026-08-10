/**
 * THE HEADER EVERY PAGE WEARS — breadcrumbs, title, scope, and when the data was read.
 *
 * The requirement is that a reader should never have to ask which data they are looking at,
 * and that breadcrumbs and a scope indicator appear everywhere. The important word is
 * *everywhere*: a scope banner that only appears on the pages that remembered to render it is
 * worse than none, because its absence then reads as "this page is unscoped" on the pages
 * that simply forgot.
 *
 * So this is one component, rendered by the router rather than by each page. A page cannot
 * omit it, and cannot render a different one.
 *
 * THE SCOPE INDICATOR AND THE FILTER ARE THE SAME OBJECT. The two pills state the scope and
 * changing it is the same gesture as reading it — see `ScopeStrip` for why having both a control
 * and a separate banner restating it is worse than having one.
 *
 * They are present on every page, including when nothing is narrowed. The banner this replaces
 * appeared only under a site scope, which left "Overall" implied by silence — and silence is
 * exactly what a reader cannot verify.
 *
 * THE TIMESTAMP IS THE DATA'S, NOT THE CLOCK'S. "Updated 2 minutes ago" next to a fixed data
 * set would be theatre. It states the last day the ledger holds and the time the page read
 * it, which are two different and both true things.
 */

import { CalendarRange, ChevronRight, Clock, MapPin, RotateCcw } from 'lucide-react'
import { WORLD_TODAY, longDate } from '../core/calendar'
import { TODAY } from '../core/calendar'
import { crumbs, type Scope } from '../core/scope'
import type { Ref } from '../core/entities'
import { ACCENT, FAINT, MUTED, TONE, mix } from '../exec/system'
import { useNow } from '../hooks/useNow'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useScope } from './scope'
import { useSheet } from './sheet'
import { DateSheet, SiteSheet } from './filters'

/* ── breadcrumbs ─────────────────────────────────────────────────────────── */

/**
 * The trail, from the collection down to where the reader is standing.
 *
 * Collapses in the middle on a narrow column rather than wrapping to a second line: a
 * two-line breadcrumb pushes the title down and makes the header the loudest thing on a
 * screen whose job is to show a figure. The first and last two crumbs are always kept,
 * because those are the ones that carry the meaning — where you started and where you are.
 */
export function Breadcrumbs({
  scope,
  moduleTitle,
  entity,
}: {
  scope: Scope
  moduleTitle?: string
  /* The entity being viewed. The trail below it is walked from the entity's own `parent` chain
     rather than accumulated as the reader navigates, so it is the same from a search hit, a
     module row and a pasted link. */
  entity?: Ref
}) {
  const all = crumbs({ ...scope, entity }, moduleTitle)
  if (all.length < 2) return null

  const shown = all.length > 4 ? [all[0], { label: '…' }, ...all.slice(-2)] : all

  /* A SINGLE SCROLLING LINE, never a wrapping one and never a shrinking one.
     Four crumbs of real names do not fit across a 390px phone. Shrinking them truncated every
     crumb to uselessness and overlapped the timestamp beside it; wrapping pushed the title down
     and made the header the loudest thing on a screen whose job is to show a figure. Scrolling
     keeps every crumb readable and costs nothing to the reader who does not need the ones
     off-screen — the last crumb, where they are, is always in view. */
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hidden"
    >
      {shown.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex shrink-0 items-center gap-1">
          {i > 0 && (
            <ChevronRight size={11} strokeWidth={2.5} className="shrink-0" style={{ color: '#c9c4bb' }} aria-hidden />
          )}
          {c.href ? (
            <a
              href={c.href}
              className="text-[11px] font-medium text-[#6d6860] transition-colors hover:text-[#1c1a16] hover:underline"
            >
              {c.label}
            </a>
          ) : (
            <span className="text-[11px] font-medium" style={{ color: FAINT }}>
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

/* ── the scope strip ─────────────────────────────────────────────────────── */

/**
 * The scope indicator AND the control, deliberately the same object.
 *
 * An earlier version of this had both: two filter pills and, underneath, a separate banner
 * restating "Overall · July 2025". That is the same fact twice, and the second copy trains the
 * reader to skip the row — which is how a scope banner ends up not being read at the one moment
 * it matters. So the pills state the scope and changing it is the same gesture as reading it.
 *
 * The resolved dates sit beside them because a label is not a scope: "This month" is friendly and
 * ambiguous, "July 2025" is what the figures below were actually cut against. Both, so the
 * control reads naturally and the statement is unambiguous.
 *
 * Present on EVERY page, because the router renders it rather than each page choosing to. The
 * previous banner appeared only when a site was picked, which left "Overall" implied by silence —
 * and silence is the one thing a reader cannot verify.
 */
export function ScopeStrip({ scope }: { scope: Scope }) {
  const { setSite } = useScope()
  const { open } = useSheet()
  const narrowed = Boolean(scope.site)

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3">
      <ScopePill
        icon={CalendarRange}
        label={scope.win.label}
        onClick={() => open({ title: 'Date range', eyebrow: scope.win.window, body: <DateSheet /> })}
      />
      <ScopePill
        icon={MapPin}
        label={scope.site ? scope.site.name : 'All sites'}
        on={narrowed}
        onClick={() => open({ title: 'Site', eyebrow: scope.site ? scope.site.name : 'All sites', body: <SiteSheet /> })}
      />

      <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] tabular-nums" style={{ color: MUTED }}>
        <span className="truncate">{scope.win.window}</span>
        <span aria-hidden>·</span>
        <span className="truncate">{scope.win.days === 1 ? '1 day' : `${scope.win.days} days`}</span>
      </span>

      {narrowed && (
        <button
          type="button"
          onClick={() => setSite(null)}
          className="card-press flex shrink-0 items-center gap-1 rounded-full px-2.5 py-[4px] text-[11px] font-semibold"
          style={{ backgroundColor: mix(TONE.warn, 0.14), color: TONE.warn }}
        >
          <RotateCcw size={10} strokeWidth={2.5} aria-hidden />
          Clear site
        </button>
      )}
    </div>
  )
}

function ScopePill({
  icon: Glyph,
  label,
  on,
  onClick,
}: {
  icon: typeof MapPin
  label: string
  on?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-press flex min-w-0 shrink-0 items-center gap-1.5 rounded-full px-3 py-[6px] text-[12px] font-medium whitespace-nowrap transition-colors ${
        on ? 'bg-[#123a2c] text-white' : 'bg-white text-[#3d3a34]'
      }`}
    >
      <Glyph size={12} strokeWidth={2} className="shrink-0" style={{ color: on ? '#8fd6ae' : ACCENT }} aria-hidden />
      <span className="max-w-[140px] truncate">{label}</span>
      <span className="shrink-0 text-[9px] opacity-60" aria-hidden>
        ▾
      </span>
    </button>
  )
}

/* ── last updated ────────────────────────────────────────────────────────── */

/**
 * When the figures were last read, and how current the underlying data is.
 *
 * Two facts, deliberately. The clock time is when this render happened; the date is the last
 * day the ledger holds. Collapsing them into one "updated just now" would imply the data is
 * as fresh as the render, which is the specific thing a dashboard should never imply.
 */
export function LastUpdated({ compactForm = false }: { compactForm?: boolean }) {
  /* One minute is the finest granularity worth showing — a seconds-accurate timestamp on a
     board figure invites the reader to watch it rather than read the page. */
  const now = useNow(60_000)
  const at = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <span
      className="flex shrink-0 items-center gap-1.5 text-[10.5px] tabular-nums"
      style={{ color: FAINT }}
      title={`Data complete to ${longDate(TODAY)} · read at ${at}`}
    >
      <Clock size={10} strokeWidth={2} aria-hidden />
      <span>{compactForm ? at : `Read ${at}`}</span>
      {/* The data's own currency is the more important of the two facts and the first to be
          dropped for space, because the title and the scope strip are what a narrow screen needs
          most. The full sentence stays in the tooltip. */}
      {!compactForm && (
        <span className="hidden @[560px]:inline">
          · data to {WORLD_TODAY.getDate()} {WORLD_TODAY.toLocaleString('en-GB', { month: 'short' })}
        </span>
      )}
    </span>
  )
}

/* ── the whole header ────────────────────────────────────────────────────── */

/**
 * Rendered by the router for every module, record and entity page.
 *
 * The back affordance is only present where there is a level to go back to. At tablet and
 * above the sidebar is a permanent way home, so a second one beside it would be chrome; a
 * record or entity page still keeps its single step up to its parent.
 */
export function ScopeHeader({
  title,
  eyebrow,
  moduleTitle,
  entity,
  onBack,
  actions,
}: {
  title: string
  /** One short line above the title. Usually the entity's kind or the module it belongs to. */
  eyebrow?: string
  /** Inserted into the breadcrumb between the site and the entity trail. */
  moduleTitle?: string
  /** The entity on show, so the breadcrumb can walk its lineage. */
  entity?: Ref
  onBack?: () => void
  actions?: React.ReactNode
}) {
  const { scope } = useScope()
  /* THE TRAIL ROW IS A SHELL-TIER MARK, not a phone one.
     On a phone the header was four rows deep before the page said anything: crumbs and a read
     time, then an eyebrow, then the title, then the scope pills — three of them restating what
     the back chevron and the title already say. Above 768 the sidebar and the wider column give
     the trail somewhere to live and a second way to navigate, so nothing changes there.
     The same 768 the shell and the sheet use, so the product has one tier boundary. */
  const shell = useMediaQuery('(min-width: 768px)')

  return (
    <header className="px-[var(--gutter-lg)] pt-6 pb-3">
      {shell && (
        <div className="flex items-center gap-3">
          <Breadcrumbs scope={scope} moduleTitle={moduleTitle} entity={entity} />
          <LastUpdated />
        </div>
      )}

      <div className={`flex items-start gap-3 ${shell ? 'mt-2' : ''}`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 mt-1 grid size-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/70 active:bg-white/60"
          >
            <ChevronRight size={20} strokeWidth={2} className="rotate-180 text-[#55524a]" aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {/* "Monthly report" / "Operations" above "Animal Population" is a classification of the
              page, not information about it — the shell keeps it beside the crumbs it belongs
              with, the phone opens on the title. */}
          {eyebrow && shell && (
            <p className="truncate text-[11px] font-medium tracking-[0.06em] uppercase" style={{ color: FAINT }}>
              {eyebrow}
            </p>
          )}
          <h1 className="mt-[3px] truncate text-[length:var(--fs-name)] leading-[1.2] font-semibold tracking-[-0.02em] text-[#16150f]">
            {title}
          </h1>
        </div>
        {actions}
      </div>

      <ScopeStrip scope={scope} />
    </header>
  )
}
