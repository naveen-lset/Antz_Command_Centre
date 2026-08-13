/**
 * The pieces every module page shares — and deliberately only these.
 *
 * The brief is explicit that no two modules should repeat a layout, so what is shared
 * here is the *chrome*, never the composition: a hero that honours the global site
 * scope, a row that opens a sheet, and the drill sheets that hang off a module page.
 * What each module then does with those is its own business, and the eight pages under
 * this folder have eight different information architectures.
 *
 * Everything visual comes from `exec/system.tsx`. Nothing new is drawn here.
 */

import { useMemo, type ReactNode } from 'react'
import { ChevronRight, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePeriod } from '../../exec/period'
import { siteCut } from '../../exec/sites'
import {
  ACCENT_INK,
  Bars,
  compact,
  FAINT,
  Figure,
  fmt,
  HERO_INK,
  mix,
  Section,
  Stack,
  TONE,
  useAccent,
  VALUE,
} from '../../exec/system'
import { useSheet } from '../sheet'
import { useSite } from '../filters'

type Tone = 'good' | 'warn' | 'bad' | 'neutral'

/**
 * The module headline, cut to the window AND the site scope.
 *
 * `slug` names a module in the shared site model. When one is given the figure is
 * derived from it, so a page headed 23 while its Sites card lists 11+5+3+2+2 cannot
 * happen. When it isn't, the page states its own number and the scope banner above
 * already says the figure is zoo-wide.
 */
export function ModuleHero({
  icon: Glyph,
  slug,
  value,
  unit,
  label,
  status,
  tone = 'neutral',
  stats,
}: {
  icon?: LucideIcon
  slug?: string
  /** Used when there is no site model, or as the label when there is. */
  value: string
  unit?: string
  label: string
  status?: string
  tone?: Tone
  stats?: { value: string; unit?: string; label: string }[]
}) {
  const accent = useAccent()
  const { period, cut } = usePeriod()
  const { site } = useSite()
  const split = slug ? siteCut(slug, cut) : undefined

  let shown = value
  let scopeNote = status
  if (split) {
    const rate = split.kind === 'rate'
    if (site) {
      const row = split.rows.find((r) => r.site.key === site.key)
      shown = rate ? `${Math.round(row?.percent ?? 0)}` : fmt(row?.value ?? 0)
      scopeNote = `${site.name} · ${period.window}`
    } else {
      shown = rate ? `${Math.round(split.overall)}` : fmt(split.overall)
      /* Only override the authored status once the window has moved off the month the
         page was written against — the hand-picked status is a month fact and the best
         version of this line. */
      if (period.key !== 'month') scopeNote = period.window
    }
  }

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={shown} unit={unit ?? (split?.kind === 'rate' ? '%' : undefined)} size={64} color={HERO_INK} />
        <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
          {Glyph && <Glyph size={15} strokeWidth={1.75} style={{ color: accent }} aria-hidden />}
          {label}
        </p>
        {scopeNote && (
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
            <span className="text-small font-medium" style={{ color: TONE[tone] }}>
              {scopeNote}
            </span>
          </p>
        )}
        {stats && stats.length > 0 && (
          <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
            {stats.map((s, i) => (
              <span
                key={`${s.label}-${i}`}
                className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-4' : ''} ${
                  i < stats.length - 1 ? 'pr-4' : ''
                }`}
              >
                <Figure value={s.value} unit={s.unit} size={24} />
                <span className="mt-1 block truncate text-caption text-[#5c574f]">{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * A row that opens a sheet.
 *
 * Module pages drill through sheets, not routes — the brief's "inside every module,
 * details should continue using Bottom Sheets". This is `Facts`' row anatomy with a
 * handler in place of the anchor, the same swap `TapRow` makes on the home.
 */
export function DrillRow({
  label,
  sub,
  value,
  unit,
  tone,
  onOpen,
  lead,
}: {
  label: string
  sub?: string
  value: string
  unit?: string
  tone?: Tone
  onOpen?: () => void
  lead?: LucideIcon
}) {
  const accent = useAccent()
  const Glyph = lead
  const body = (
    <span className="flex items-stretch gap-3">
      {/* The row's share as the weight of a rail, not as a bar under the row — see the note on
          `TapRow`'s `bar` in `v4/panels.tsx`. */}
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {Glyph && (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-[9px]"
            style={{ backgroundColor: mix(accent, 0.1) }}
            aria-hidden
          >
            <Glyph size={15} strokeWidth={1.75} style={{ color: accent }} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small text-[#1c1a16]">{label}</span>
          {sub && <span className="mt-1 block text-caption text-[#736e67]">{sub}</span>}
        </span>
        <span className="shrink-0 text-right">
          <span
            className="text-small font-medium tabular-nums"
            style={{ color: tone && tone !== 'neutral' ? TONE[tone] : VALUE }}
          >
            {value}
          </span>
          {unit && <span className="ml-1 text-caption text-[#736e67]">{unit}</span>}
        </span>
        <span className="w-[10px] shrink-0" style={{ color: onOpen ? ACCENT_INK : 'transparent' }} aria-hidden>
          <ChevronRight size={13} strokeWidth={2.25} />
        </span>
      </span>
    </span>
  )
  return (
    <li className="border-b border-[#f0efec] last:border-0">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-3 text-left">
          {body}
        </button>
      ) : (
        <div className="py-3">{body}</div>
      )}
    </li>
  )
}

export const DrillList = ({ children }: { children: ReactNode }) => <ul className="flex flex-col">{children}</ul>

/* ── the generic second/third level ──────────────────────────────────────── */

export interface Node {
  id: string
  label: string
  sub?: string
  value: number
  unit?: string
  tone?: Tone
  /** Rows one level down. Absent means this is a leaf and the row does not open. */
  children?: Node[]
  /** Leaf detail — label/value pairs shown when there is nothing below. */
  facts?: { label: string; value: string; sub?: string; tone?: Tone }[]
}

/**
 * A branch of any module's own hierarchy, as a sheet.
 *
 * The brief asks every module to drill consistently but not identically — Animals goes
 * Site → Species → Animal, Pharmacy goes Central → Site Pharmacy → Medicine, Medical
 * goes Hospital → Department → Ward → Animal, Users goes Site → Department → User. All
 * of those are the same SHAPE: a named node, a figure, and children. So the shape is
 * what is shared, and each module supplies its own tree.
 */
export function NodePanel({
  title,
  unit,
  nodes,
  trail = [],
}: {
  title: string
  unit?: string
  nodes: Node[]
  trail?: string[]
}) {
  const { open } = useSheet()
  const total = nodes.reduce((n, c) => n + c.value, 0)

  return (
    <>
      <div className="w-full px-[var(--gutter)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={fmt(total)} size={48} color={HERO_INK} />
          <p className="mt-1 text-body text-[#3d3a34]">
            {title}
            {unit ? ` · ${unit}` : ''}
          </p>
          {trail.length > 0 && <p className="mt-3 text-caption text-[#736e67]">{trail.join(' › ')}</p>}
        </section>
      </div>
      <Stack>
        <Section icon={MapPin} label={title} aside={`${nodes.length}`}>
          <DrillList>
            {nodes.map((n) => (
              <DrillRow
                key={n.id}
                label={n.label}
                sub={n.sub}
                value={fmt(n.value)}
                unit={n.unit}
                tone={n.tone}
                onOpen={
                  n.children?.length
                    ? () =>
                        open({
                          title: n.label,
                          eyebrow: [...trail, title].join(' › '),
                          body: <NodePanel title="Breakdown" unit={n.unit} nodes={n.children!} trail={[...trail, n.label]} />,
                        })
                    : n.facts?.length
                      ? () =>
                          open({
                            title: n.label,
                            eyebrow: [...trail, title].join(' › '),
                            body: <LeafPanel node={n} trail={[...trail, n.label]} />,
                          })
                      : undefined
                }
              />
            ))}
          </DrillList>
        </Section>
      </Stack>
    </>
  )
}

/** The bottom of a module's own drill — a record, not another aggregate. */
export function LeafPanel({ node, trail }: { node: Node; trail: string[] }) {
  return (
    <>
      <div className="w-full px-[var(--gutter)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={fmt(node.value)} unit={node.unit} size={48} color={node.tone ? TONE[node.tone] : HERO_INK} />
          <p className="mt-1 text-body text-[#3d3a34]">{node.label}</p>
          {node.sub && <p className="mt-3 text-caption text-[#736e67]">{node.sub}</p>}
        </section>
      </div>
      <Stack>
        <Section icon={MapPin} label="Record" aside={trail[trail.length - 2] ?? ''}>
          <ul className="divide-y divide-[#f0efec]">
            {(node.facts ?? []).map((f) => (
              <li key={f.label} className="flex items-baseline gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1">
                  <span className="block text-small text-[#1c1a16]">{f.label}</span>
                  {f.sub && <span className="mt-1 block text-caption text-[#736e67]">{f.sub}</span>}
                </span>
                <span
                  className="shrink-0 text-small font-medium tabular-nums"
                  style={{ color: f.tone && f.tone !== 'neutral' ? TONE[f.tone] : VALUE }}
                >
                  {f.value}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </Stack>
      <p className="px-[var(--gutter)] pt-1 pb-2 text-center text-caption text-[#736e67]">Deepest level</p>
    </>
  )
}

/**
 * The site split card every module carries, honouring the global scope.
 *
 * With a site picked it shows that site alone and says so, rather than listing six and
 * leaving the reader to find the one they scoped to.
 */
export function SiteSplit({ slug, onOpenSite }: { slug: string; onOpenSite?: (key: string, name: string) => void }) {
  const { cut } = usePeriod()
  const { site } = useSite()
  const split = siteCut(slug, cut)
  const rows = useMemo(
    () => (site ? (split?.rows ?? []).filter((r) => r.site.key === site.key) : (split?.rows ?? [])),
    [split, site],
  )
  if (!split) return null

  const rate = split.kind === 'rate'

  return (
    <DrillList>
      {rows.map((r) => (
        <DrillRow
          key={r.site.key}
          label={r.site.name}
          sub={`${r.site.code} · ${r.site.enclosures} enclosures`}
          value={rate ? `${Math.round(r.percent)}%` : fmt(r.value)}
          unit={rate && r.of ? `${fmt(r.value)}/${fmt(r.of)}` : undefined}
          onOpen={onOpenSite && r.value > 0 ? () => onOpenSite(r.site.key, r.site.name) : undefined}
        />
      ))}
    </DrillList>
  )
}

/** Ranked bars from a plain map — the shape half these pages need for a breakdown. */
export function RankedBars({ items, unit }: { items: [string, number][]; unit?: string }) {
  return <Bars items={items.map(([label, value]) => ({ label, value }))} unit={unit} />
}

/** A compact "N of M" pill used across the operational modules. */
export function OfChip({ n, of, label }: { n: number; of: number; label: string }) {
  const accent = useAccent()
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full px-3 py-1" style={{ backgroundColor: mix(accent, 0.1) }}>
      <span className="font-display text-small font-bold tabular-nums" style={{ color: ACCENT_INK }}>
        {compact(n)}
      </span>
      <span className="text-caption" style={{ color: FAINT }}>
        of {compact(of)} {label}
      </span>
    </span>
  )
}

export { useSheet, useSite }
