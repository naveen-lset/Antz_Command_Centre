/**
 * THE SPECIES PAGE'S LAYOUT KIT — different patterns for different kinds of information.
 *
 * THE DEFECT THIS EXISTS TO FIX. Every tab on the species page was the same thing: a grid of
 * white rounded cards, two beside two, whatever the content was. Reference biology, a lifecycle
 * bridge, an identifier coverage figure and a list of 1,045 animals are four different kinds of
 * information, and giving them one shape means the layout tells the reader nothing about what
 * they are looking at. Ten tabs that look identical are ten tabs nobody can navigate by memory.
 *
 * THE CONTAINER IS OPT-IN, AND THAT IS THE STRUCTURAL FIX. `Band` renders a title, a hairline
 * and its children — no card. A white bordered surface has to be ASKED for with `surface`, and
 * the asking is what makes somebody justify it. Inverting the default is worth more than any
 * amount of instruction not to over-card, because the lazy path is now the correct one.
 *
 * WHAT KEEPS TEN LAYOUTS INSIDE ONE PRODUCT. Every pattern here draws from the same tokens, the
 * same type scale, the same 12px radius and the same hairline, so a tab may be shaped like a
 * document and the next like a table without either looking imported. The kit varies the SHAPE
 * of information, never its VOICE.
 *
 * Nothing here computes a denominator, a percentage or a scale. Every proportion is handed in
 * as the pair it was measured from — see `core/profiles.ts` on why: a coverage figure has a
 * different denominator for every species, and a renderer that supplied one printed "110%".
 */

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FAINT, HAIR, INK, TRACK, VALUE, fmt, useAccent } from '../exec/system'

/* ── 1 · the band, which is not a card ───────────────────────────────────── */

/**
 * A full-width section of the page.
 *
 * Level 2 in the container strategy: separation by TYPOGRAPHY AND A HAIRLINE, not by a box.
 * `surface` opts into the white bordered box for the rare block that genuinely needs lifting
 * off the page — a callout, or a group whose edges the reader has to see to parse it.
 */
export function Band({
  title,
  aside,
  note,
  icon: Glyph,
  surface,
  first,
  children,
}: {
  title?: string
  aside?: string
  note?: string
  icon?: LucideIcon
  /** Ask for a white bordered surface. The default is no container at all. */
  surface?: boolean
  /** Suppresses the top rule — for the first band under a header that already ends in one. */
  first?: boolean
  children: ReactNode
}) {
  /* Read at the top of the component, never inside the conditional JSX below — a hook behind a
     `{title && …}` is a hook that runs on some renders and not others, which is the one thing
     React's rules forbid outright. */
  const accent = useAccent()
  const body = (
    <>
      {title && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="flex items-center gap-2 text-body font-semibold" style={{ color: INK }}>
            {Glyph && <Glyph size={16} strokeWidth={1.75} aria-hidden style={{ color: accent }} />}
            {title}
          </h3>
          {aside && (
            <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
              {aside}
            </span>
          )}
        </div>
      )}
      {note && (
        <p className="-mt-2 mb-4 text-caption" style={{ color: FAINT }}>
          {note}
        </p>
      )}
      {children}
    </>
  )

  if (surface) {
    return (
      <section className="rounded-[var(--radius-card)] border bg-white p-[var(--pad-card)]" style={{ borderColor: HAIR }}>
        {body}
      </section>
    )
  }
  return (
    <section className={first ? '' : 'border-t pt-6'} style={first ? undefined : { borderColor: HAIR }}>
      {body}
    </section>
  )
}

/* ── 2 · metric strip ────────────────────────────────────────────────────── */

export interface Metric {
  label: string
  value: string
  sub?: string
}

/**
 * A horizontal run of related figures on one baseline.
 *
 * VALUES ARE 24px, NOT HERO-SIZED. Five figures at hero scale is five things shouting, which is
 * how the previous header ended up with no primary metric at all. The strip's job is to be
 * read across in one pass; weight and alignment carry the hierarchy, not size.
 *
 * `flex-auto` so each figure starts at its OWN content width and only the surplus is shared —
 * an equal-thirds grid gives "1 : 1.0" the same column as "1,045" and clips one of them.
 */
export function MetricStrip({ items, dense }: { items: Metric[]; dense?: boolean }) {
  if (!items.length) return null
  return (
    <div className={`flex flex-wrap ${dense ? 'gap-x-7 gap-y-3' : 'gap-x-10 gap-y-4'}`}>
      {items.map((m) => (
        <div key={m.label} className="min-w-0 flex-auto">
          <p className="text-caption" style={{ color: FAINT }}>
            {m.label}
          </p>
          <p className="mt-0.5 font-display text-[24px] leading-[1.15] font-semibold tabular-nums" style={{ color: VALUE }}>
            {m.value}
          </p>
          {m.sub && (
            <p className="mt-0.5 text-caption" style={{ color: FAINT }}>
              {m.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── 3 · split layout ────────────────────────────────────────────────────── */

/**
 * One composition in two parts — a visual and the breakdown that reads it.
 *
 * NOT TWO CARDS SIDE BY SIDE. The point is that the left explains the right; putting a border
 * between them would say they are separate findings. They stack on narrow, visual first,
 * because the shape is what a reader takes in before the numbers.
 */
export function SplitLayout({ visual, children }: { visual: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6 @[640px]:flex-row @[640px]:items-center @[640px]:gap-10">
      <div className="shrink-0 @[640px]:w-[220px]">{visual}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* ── 4 · definition list ─────────────────────────────────────────────────── */

export interface Definition {
  label: string
  value: string
  sub?: string
}

/**
 * Reference information as a document, which is what reference information is.
 *
 * The Profile tab is 40-odd facts about an animal. As cards that is eight boxes the reader has
 * to re-orient inside; as label/value rows under sub-headings it is a page they can run an eye
 * down. Two columns on wide screens because the values are short and a single 900px column of
 * them wastes the width the desktop was asked to use.
 */
export function DefinitionList({ items, columns = 'auto' }: { items: Definition[]; columns?: 1 | 2 | 'auto' }) {
  if (!items.length) return null
  /* THREE COLUMNS ONCE THERE IS ROOM FOR THREE, and this is the fix for the complaint that the
     page looked empty on a wide screen. The emptiness was never the page margin — at 2240 the
     tier is the shell's 1440px cap, centred, which is deliberate. It was INSIDE each row: a
     label/value pair in a 668px column puts "Sexual dimorphism" hard left and "Moderate" hard
     right with four hundred pixels of nothing between them, and the eye loses the pairing.
     Splitting into thirds at 1040px gives each pair about 440px — wide enough to read, tight
     enough that the label and its value stay one object — and spends the width on information
     rather than on gap. */
  const cols =
    columns === 1 ? '' : columns === 2 ? '@[560px]:grid-cols-2' : '@[560px]:grid-cols-2 @[1040px]:grid-cols-3'
  return (
    <dl className={`grid gap-x-10 ${cols}`}>
      {items.map((d) => (
        <div
          key={d.label}
          className="flex items-baseline justify-between gap-4 border-b py-2.5 last:border-b-0"
          style={{ borderColor: HAIR }}
        >
          <dt className="shrink-0 text-small" style={{ color: FAINT }}>
            {d.label}
          </dt>
          <dd className="min-w-0 text-right text-small font-medium" style={{ color: INK }}>
            {d.value}
            {d.sub && (
              <span className="ml-1.5 text-caption font-normal" style={{ color: FAINT }}>
                {d.sub}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ── 5 · data table ──────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string
  head: string
  cell: (row: T) => ReactNode
  /** Lower drops first when the width runs out. The primary column should be 3. */
  priority?: 1 | 2 | 3
  align?: 'left' | 'right'
  width?: string
}

/**
 * The data workspace — a real table on desktop, the same rows stacked on a phone.
 *
 * A DESKTOP TABLE IS NOT SHRUNK ONTO A PHONE. Six columns in 390px is six unreadable columns;
 * the mobile form is a stacked row with the primary field on its own line and the rest as a
 * meta line, which is the same information in the shape that width can carry. Both come from
 * one column definition so the two can never drift.
 *
 * PRIORITY DROPS COLUMNS RATHER THAN THE CALLER WRITING A SECOND TABLE. At tablet width the
 * 1s go; below that the table becomes rows.
 */
export function DataTable<T>({
  rows,
  columns,
  keyOf,
  onOpen,
  empty,
}: {
  rows: T[]
  columns: Column<T>[]
  keyOf: (row: T) => string
  onOpen?: (row: T) => void
  empty?: ReactNode
}) {
  if (!rows.length) return <>{empty ?? null}</>
  const primary = columns.find((c) => c.priority === 3) ?? columns[0]
  const rest = columns.filter((c) => c !== primary)

  return (
    <>
      {/* desktop / tablet */}
      <div className="hidden overflow-x-auto @[560px]:block">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`border-b pb-2 text-caption font-medium ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${c.priority === 1 ? 'hidden @[880px]:table-cell' : ''}`}
                  style={{ borderColor: HAIR, color: FAINT, width: c.width }}
                >
                  {c.head}
                </th>
              ))}
              {onOpen && <th className="w-[24px] border-b pb-2" style={{ borderColor: HAIR }} aria-hidden />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={keyOf(r)}
                className={onOpen ? 'card-press cursor-pointer' : undefined}
                onClick={onOpen ? () => onOpen(r) : undefined}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`border-b py-3 text-small ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${
                      c.priority === 1 ? 'hidden @[880px]:table-cell' : ''
                    }`}
                    style={{ borderColor: HAIR, color: INK }}
                  >
                    {c.cell(r)}
                  </td>
                ))}
                {onOpen && (
                  <td className="border-b py-3 text-right" style={{ borderColor: HAIR }}>
                    <ChevronRight size={13} strokeWidth={2.25} style={{ color: FAINT }} aria-hidden />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phone — the same rows, stacked */}
      <ul className="flex flex-col @[560px]:hidden">
        {rows.map((r) => (
          <li key={keyOf(r)} className="border-b last:border-b-0" style={{ borderColor: HAIR }}>
            <button
              type="button"
              onClick={onOpen ? () => onOpen(r) : undefined}
              disabled={!onOpen}
              className="card-press -mx-2 flex w-full items-center gap-3 rounded-[10px] px-2 py-3 text-left disabled:cursor-default"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium" style={{ color: INK }}>
                  {primary.cell(r)}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-2 text-caption" style={{ color: FAINT }}>
                  {rest.map((c) => (
                    <span key={c.key} className="truncate">
                      {c.cell(r)}
                    </span>
                  ))}
                </span>
              </span>
              {onOpen && <ChevronRight size={13} strokeWidth={2.25} style={{ color: FAINT }} aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ── 6 · ranked bars ─────────────────────────────────────────────────────── */

/**
 * A vocabulary with magnitudes — identifier types, breeds, categories.
 *
 * Bars are scaled to the LARGEST ROW, not to the total, because the question these answer is
 * "which of these dominates" rather than "what share of everything". The tail is counted rather
 * than dropped: a reader shown the top eight without being told there are sixty has been told
 * the vocabulary has eight words.
 */
export function RankedBars({
  items,
  unit,
  max = 8,
  total,
  onOpen,
}: {
  items: readonly (readonly [string, number])[]
  unit: string
  max?: number
  /** Supplied only where a share is meaningful. Never derived here. */
  total?: number
  onOpen?: (label: string) => void
}) {
  const accent = useAccent()
  if (!items.length) return null
  const shown = items.slice(0, max)
  const rest = items.slice(max)
  const restValue = rest.reduce((n, [, v]) => n + v, 0)
  const top = Math.max(...items.map(([, v]) => v), 1)

  return (
    <>
      {/* TWO COLUMNS ON A WIDE COLUMN, for the same reason the definition list takes three: a
          ranked row is a label, a figure and a bar, and stretched across 1,440px the bar becomes
          a rule with a word at each end. Paired, each row keeps a readable bar length and the
          list stops being a column of near-empty lines. */}
      <ul className="grid @[1040px]:grid-cols-2 @[1040px]:gap-x-10">
        {shown.map(([label, v]) => {
          const body = (
            <>
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-small" style={{ color: INK }}>
                  {label}
                </span>
                <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(v)}
                  {total !== undefined && total > 0 && (
                    <span className="ml-1.5 text-caption font-normal" style={{ color: FAINT }}>
                      {Math.round((v / total) * 100)}%
                    </span>
                  )}
                </span>
              </span>
              <span className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                <span className="block h-full rounded-full" style={{ width: `${(v / top) * 100}%`, backgroundColor: accent }} />
              </span>
            </>
          )
          return (
            <li key={label} className="py-2">
              {onOpen ? (
                <button type="button" onClick={() => onOpen(label)} className="card-press -mx-2 block w-full rounded-[10px] px-2 text-left">
                  {body}
                </button>
              ) : (
                body
              )}
            </li>
          )
        })}
      </ul>
      {rest.length > 0 && (
        <p className="mt-2 text-caption" style={{ color: FAINT }}>
          <span className="tabular-nums">{rest.length}</span> more · <span className="tabular-nums">{fmt(restValue)}</span> {unit}
        </p>
      )}
    </>
  )
}

/* ── 7 · coverage meter ──────────────────────────────────────────────────── */

export interface Segment {
  label: string
  value: number
  fill: string
}

/**
 * One full-width track carrying parts of a whole, with the legend beneath it.
 *
 * SEGMENTS WITH NOTHING IN THEM ARE NOT DRAWN. A zero-width span still paints its rounded cap
 * against its neighbour, which reads as a hairline of a colour with no animals behind it.
 *
 * The total is HANDED IN. Deriving it from the segments would let a caller pass three parts of
 * a four-part whole and get a chart that silently rebased itself to 100%.
 */
export function CoverageMeter({ segments, total }: { segments: Segment[]; total: number }) {
  const parts = segments.filter((s) => s.value > 0)
  if (!parts.length || total <= 0) return null
  return (
    <>
      <div className="flex h-[10px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        {parts.map((s) => (
          <span
            key={s.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.fill }}
            title={`${s.label} · ${fmt(s.value)}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {parts.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2">
            <span className="size-[8px] shrink-0 translate-y-[-1px] rounded-full" style={{ backgroundColor: s.fill }} aria-hidden />
            <span className="text-small font-medium tabular-nums" style={{ color: INK }}>
              {fmt(s.value)}
            </span>
            <span className="text-caption" style={{ color: FAINT }}>
              {s.label}
            </span>
            <span className="text-caption tabular-nums" style={{ color: FAINT }}>
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

/* ── 8 · flow ladder ─────────────────────────────────────────────────────── */

export interface Step {
  label: string
  value: number
  /** Signed steps print their sign and take a tone; an opening or closing balance does not. */
  signed?: boolean
  tone?: 'good' | 'bad' | 'neutral'
}

/**
 * A balance, the things that moved it, and the balance that resulted.
 *
 * THE RELATIONSHIP BETWEEN THE NUMBERS IS THE CONTENT. Circle of Life as a set of cards gives
 * the reader five figures and leaves them to work out that three of them add up to a fourth.
 * As a ladder — opening, the signed contributions indented beneath a connector, closing — the
 * arithmetic is the layout, and nobody has to be told how to read it.
 */
export function FlowLadder({
  opening,
  steps,
  closing,
  tones,
}: {
  opening: { label: string; value: number }
  steps: Step[]
  closing: { label: string; value: number }
  tones: Record<'good' | 'bad' | 'neutral', string>
}) {
  const sign = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`
  return (
    <div className="flex flex-col">
      <Balance label={opening.label} value={fmt(opening.value)} />
      <ul className="my-1 flex flex-col border-l pl-5" style={{ borderColor: HAIR }}>
        {steps.map((s) => (
          <li key={s.label} className="flex items-baseline justify-between gap-4 py-2">
            <span className="min-w-0 truncate text-small" style={{ color: INK }}>
              {s.label}
            </span>
            <span
              className="shrink-0 text-small font-medium tabular-nums"
              style={{ color: s.value === 0 ? FAINT : tones[s.tone ?? 'neutral'] }}
            >
              {s.signed ? sign(s.value) : fmt(s.value)}
            </span>
          </li>
        ))}
      </ul>
      <Balance label={closing.label} value={fmt(closing.value)} />
    </div>
  )
}

function Balance({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-small font-semibold" style={{ color: INK }}>
        {label}
      </span>
      <span className="font-display text-[22px] leading-none font-semibold tabular-nums" style={{ color: VALUE }}>
        {value}
      </span>
    </div>
  )
}

/* ── 9 · note panel ──────────────────────────────────────────────────────── */

/**
 * What the data cannot tell you, kept quiet and kept present.
 *
 * A tinted panel rather than a card, because a limitation is context for the figures above it
 * and must not compete with them. This product states its gaps rather than hiding them, and
 * this is the shape that lets it do so without the gap looking like a finding.
 */
export function NotePanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-[12px] px-4 py-3.5" style={{ backgroundColor: 'rgba(31,81,91,0.05)' }}>
      {title && (
        <p className="mb-1.5 text-caption font-semibold tracking-[0.04em] uppercase" style={{ color: '#5c6b61' }}>
          {title}
        </p>
      )}
      <div className="text-small leading-relaxed" style={{ color: '#44544a' }}>
        {children}
      </div>
    </div>
  )
}

/* ── the page rhythm ─────────────────────────────────────────────────────── */

/**
 * The stack every tab sits in, so all ten share one left/right boundary and one vertical gap.
 *
 * Bands separate themselves with their own top rule, so the gap here is the rhythm between
 * sections and nothing else — no padding compensating for a missing container.
 */
export function TabBody({ children }: { children: ReactNode }) {
  /* THREE THINGS HERE ARE LOAD-BEARING, and all three were measured rather than guessed.

     `col-span-full`, because `Stack` becomes a two-column grid past 760px of column, and a tab
     body handed to it lands in ONE of those columns. Measured: the Profile definition lists
     rendered 376px wide inside a 964px page, so every value wrapped and the two-column layout
     inside them never engaged at any width. A tab is a page, not a card in a row.

     NO HORIZONTAL PADDING, because `Stack` already applies `px-[var(--gutter)]`. Adding it
     again would indent every species tab past the boundary every other page in the product
     shares, which is the one alignment rule this pass exists to enforce.

     `content-box` and NOT Tailwind's `@container`: the project declares its own
     `container-type: inline-size` utility by that name, and every existing `@[…]` rule in the
     product resolves against it. A second container root would leave two sets of breakpoints
     measuring two different boxes — the drift the species header already hit once, with an
     `@[680px]` that matched at every width because it was asking an ancestor, not the card. */
  return <div className="content-box col-span-full flex flex-col gap-6 pb-4">{children}</div>
}
