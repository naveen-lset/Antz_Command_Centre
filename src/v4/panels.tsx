/**
 * What is inside a sheet.
 *
 * Every panel here is assembled from `exec/system.tsx` — `Section`, `Facts`,
 * `Snapshot`, `Scoreboard`, `Bars`, `Events`, `Trend`, `Roster`. Nothing is redrawn
 * and no new visual vocabulary is introduced; the sheet is the existing card stack
 * on the existing sage ground, reached by a tap instead of by a route.
 *
 * The only genuinely new primitive is `TapRow`, and it is new because it has to be:
 * `Facts` can carry an `href`, which navigates, and the whole point of this layer is
 * that going a level deeper does NOT navigate. It is the same row anatomy — label,
 * sub, figure, chevron — with a handler instead of an anchor.
 */

import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Dna,
  Layers,
  MapPin,
  PawPrint,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePeriod } from '../exec/period'
import {
  ACCENT_INK,
  Bars,
  Events,
  FAINT,
  Facts,
  Figure,
  Highlights,
  MUTED,
  Section,
  Snapshot,
  Stack,
  StatusList,
  TONE,
  TRACK,
  Trend,
  VALUE,
  compact,
  fmt,
  mix,
  useAccent,
} from '../exec/system'
import {
  ANIMAL_CAP,
  DRILL,
  animalRecord,
  animalsFor,
  animalFromId,
  sitesFor,
  speciesFor,
  type AnimalRecord,
  type AnimalRow,
} from './drill'
import {
  LEVEL_TONE,
  type AlertRow,
  type ApprovalGroup,
  type ApprovalRequest,
  type CriticalAlert,
  type DueRow,
  type Measure,
  type Risk,
  type TrendCard,
  type UpcomingGroup,
} from './data'
import { useSheet } from './sheet'

/* ── the tappable row ────────────────────────────────────────────────────── */

/**
 * `Facts`' row, with a handler instead of an anchor.
 *
 * The chevron column is reserved on every row of a list, linked or not, so the
 * figures stay in one column instead of stepping in and out — the same reasoning
 * `Facts` and `RedList` already apply.
 */
export function TapRow({
  label,
  sub,
  value,
  unit,
  tone,
  onOpen,
  lead,
  bar,
}: {
  label: string
  sub?: string
  value: string
  unit?: string
  tone?: 'good' | 'warn' | 'bad' | 'neutral'
  onOpen?: () => void
  /** A small tinted glyph tile, for lists whose rows are kinds rather than records. */
  lead?: LucideIcon
  /** 0–100. Draws the row's share as a hairline bar under it. */
  bar?: number
}) {
  const accent = useAccent()
  const Glyph = lead
  const inner = (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
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
          <span className="block truncate text-[13.5px] text-[#1c1a16]">{label}</span>
          {/* The sub WRAPS where the label truncates, which is the rule `Records`
              already sets in the design system: the label is an identifier and can be
              clipped, but the sub carries the where and the when — "ANM-22140 ·
              Savanna · Zone A ·…" has thrown away the only part that was new. */}
          {sub && <span className="mt-0.5 block text-[11px] leading-[15px] text-[#9b958b]">{sub}</span>}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span
          className="text-[14px] font-medium tabular-nums"
          style={{ color: tone && tone !== 'neutral' ? TONE[tone] : VALUE }}
        >
          {value}
        </span>
        {unit && <span className="ml-1 text-[11px] text-[#9b958b]">{unit}</span>}
      </span>
      <span
        className="w-[10px] shrink-0"
        style={{ color: onOpen ? ACCENT_INK : 'transparent' }}
        aria-hidden
      >
        <ChevronRight size={13} strokeWidth={2.25} />
      </span>
    </>
  )

  const body = (
    <>
      <span className="flex items-center gap-3">{inner}</span>
      {bar !== undefined && (
        <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.max(3, Math.min(100, bar))}%`, backgroundColor: mix(accent, 0.72) }}
          />
        </span>
      )}
    </>
  )

  return (
    <li className="border-b border-[#f0efec] last:border-0">
      {onOpen ? (
        <button type="button" onClick={onOpen} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left">
          {body}
        </button>
      ) : (
        <div className="py-2.5">{body}</div>
      )}
    </li>
  )
}

export const TapList = ({ children }: { children: ReactNode }) => <ul className="flex flex-col">{children}</ul>

/** Leaves the sheet for the module that owns what you are looking at. */
function OpenModule({ href, label }: { href: string; label: string }) {
  const { close } = useSheet()
  const accent = useAccent()
  return (
    <div className="px-[var(--gutter-lg)] pt-1 pb-2">
      <button
        type="button"
        onClick={() => {
          close()
          window.location.hash = href
        }}
        className="card-press flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-card)] bg-white py-3 text-[13px] font-medium"
        style={{ color: ACCENT_INK }}
      >
        <ArrowUpRight size={15} strokeWidth={2} style={{ color: accent }} aria-hidden />
        {label}
      </button>
    </div>
  )
}

/* ── level 1 · overall, split by site ────────────────────────────────────── */

/**
 * The first level of every KPI drill: the zoo-wide figure, then the six sites.
 *
 * Overall is stated above the rows it is the sum of, and the rows are the shared
 * site model's — so this level cannot disagree with the module page the KPI links
 * to. Rate metrics scale their bars against 100%, counts against the widest row;
 * `Sites` on the module pages makes the same distinction for the same reason.
 */
export function SitesPanel({ metric }: { metric: string }) {
  const { period } = usePeriod()
  const { open } = useSheet()
  const def = DRILL[metric]
  const level = sitesFor(metric, period.key)
  if (!level || !def) return null

  const rate = level.kind === 'rate'
  const widest = Math.max(...level.rows.map((r) => r.percent), 1)

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={rate ? `${Math.round(level.overall)}` : fmt(level.overall)} unit={rate ? '%' : undefined} size={52} />
          <p className="mt-1 text-[15px] text-[#3d3a34]">
            {def.title} · {period.label.toLowerCase()}
          </p>
          <p className="mt-3 text-[12px] text-[#9b958b]">
            {level.rows.length} sites · tap a site for its species
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={MapPin} label="Sites" aside={level.unit}>
          <TapList>
            {level.rows.map((r) => (
              <TapRow
                key={r.site.key}
                label={r.site.name}
                sub={`${r.site.code} · ${r.site.enclosures} enclosures`}
                value={rate ? `${Math.round(r.percent)}%` : fmt(r.value)}
                unit={rate && r.of ? `${fmt(r.value)}/${fmt(r.of)}` : undefined}
                bar={rate ? r.percent : (r.percent / widest) * 100}
                onOpen={
                  r.value > 0
                    ? () =>
                        open({
                          title: r.site.name,
                          eyebrow: `${def.title} · ${rate ? `${Math.round(r.percent)}%` : fmt(r.value)}`,
                          body: <SpeciesPanel metric={metric} siteKey={r.site.key} siteName={r.site.name} />,
                        })
                    : undefined
                }
              />
            ))}
          </TapList>
        </Section>
      </Stack>
      <OpenModule href={def.href} label={`Open ${def.title}`} />
    </>
  )
}

/* ── level 2 · species within a site ─────────────────────────────────────── */

export function SpeciesPanel({
  metric,
  siteKey,
  siteName,
}: {
  metric: string
  siteKey: string
  siteName: string
}) {
  const { period } = usePeriod()
  const { open } = useSheet()
  const def = DRILL[metric]
  const level = sitesFor(metric, period.key)
  const row = level?.rows.find((r) => r.site.key === siteKey)
  const rows = useMemo(() => speciesFor(metric, siteKey, period.key), [metric, siteKey, period.key])
  if (!def || !level || !row) return null

  const rate = level.kind === 'rate'
  const widest = Math.max(...rows.map((r) => r.percent), 1)
  const classes = new Set(rows.map((r) => r.cls)).size

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={rate ? `${Math.round(row.percent)}` : fmt(row.value)} unit={rate ? '%' : undefined} size={48} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <MapPin size={15} strokeWidth={1.75} aria-hidden />
            {siteName}
          </p>
          <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
            <span className="min-w-0 flex-1 pr-4">
              <Figure value={`${rows.length}`} size={22} />
              <span className="mt-0.5 block text-[12px] text-[#6d6860]">Species</span>
            </span>
            <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4 pr-4">
              <Figure value={`${classes}`} size={22} />
              <span className="mt-0.5 block text-[12px] text-[#6d6860]">Classes</span>
            </span>
            <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
              <Figure value={`${row.site.enclosures}`} size={22} />
              <span className="mt-0.5 block text-[12px] text-[#6d6860]">Enclosures</span>
            </span>
          </div>
        </section>
      </div>
      <Stack>
        <Section icon={Layers} label="Species" aside={`${rows.length} held`}>
          <TapList>
            {rows.map((s) => (
              <TapRow
                key={s.name}
                label={s.name}
                sub={s.cls}
                value={rate ? `${Math.round(s.percent)}%` : fmt(s.value)}
                unit={rate && s.of ? `${fmt(s.value)}/${fmt(s.of)}` : undefined}
                bar={rate ? s.percent : (s.percent / widest) * 100}
                onOpen={
                  s.value > 0
                    ? () =>
                        open({
                          title: s.name,
                          eyebrow: `${siteName} · ${def.title}`,
                          body: <AnimalsPanel metric={metric} siteKey={siteKey} siteName={siteName} species={s.name} />,
                        })
                    : undefined
                }
              />
            ))}
          </TapList>
        </Section>
      </Stack>
    </>
  )
}

/* ── level 3 · animals within a species ──────────────────────────────────── */

export function AnimalsPanel({
  metric,
  siteKey,
  siteName,
  species,
}: {
  metric: string
  siteKey: string
  siteName: string
  species: string
}) {
  const { period } = usePeriod()
  const { open } = useSheet()
  const def = DRILL[metric]
  const { rows, total } = useMemo(
    () => animalsFor(metric, siteKey, species, period.key),
    [metric, siteKey, species, period.key],
  )
  if (!def) return null

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={fmt(total)} size={48} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <PawPrint size={15} strokeWidth={1.75} aria-hidden />
            {species} · {siteName}
          </p>
          {total > ANIMAL_CAP && (
            /* Never let forty rows imply forty animals. The cap is a reading limit
               and has to be stated as one. */
            <p className="mt-3 text-[12px] text-[#9b958b]">
              Showing {ANIMAL_CAP} of {fmt(total)} — open the module for the full register
            </p>
          )}
        </section>
      </div>
      <Stack>
        {Object.keys(byStatus).length > 1 && (
          <Section icon={ClipboardList} label="Status" aside={`${rows.length} shown`}>
            <StatusList
              items={Object.entries(byStatus).map(([label, value]) => ({
                label,
                value: String(value),
                tone: rows.find((r) => r.status === label)?.tone ?? 'neutral',
              }))}
            />
          </Section>
        )}
        <Section icon={PawPrint} label="Animals" aside={total > ANIMAL_CAP ? `${ANIMAL_CAP} of ${fmt(total)}` : `${total}`}>
          <TapList>
            {rows.map((a) => (
              <TapRow
                key={a.id}
                label={a.id}
                sub={`${a.enclosure} · ${a.sex} · ${a.age}${a.when ? ` · ${a.when}` : ''}`}
                value={a.status}
                tone={a.tone}
                onOpen={() =>
                  open({
                    title: a.id,
                    eyebrow: `${species} · ${siteName}`,
                    body: <AnimalPanel row={a} />,
                  })
                }
              />
            ))}
          </TapList>
        </Section>
      </Stack>
      <OpenModule href={def.href} label={`Open ${def.title}`} />
    </>
  )
}

/* ── level 4 · one animal. There is nothing below this. ──────────────────── */

const SEX_WORD = { M: 'Male', F: 'Female', U: 'Undetermined' } as const

export function AnimalPanel({ row, record }: { row?: AnimalRow; record?: AnimalRecord }) {
  const r = record ?? (row ? animalRecord(row) : undefined)
  if (!r) return null

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <p className="font-display text-[30px] leading-none font-bold tracking-[-0.02em] text-[#2f2424]">{r.id}</p>
          <p className="mt-2 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <PawPrint size={15} strokeWidth={1.75} aria-hidden />
            {r.name}
          </p>
          <p className="mt-3 flex items-center gap-2">
            <span
              className="size-[7px] rounded-full"
              style={{ backgroundColor: TONE[r.tone && r.tone !== 'neutral' ? r.tone : 'neutral'] }}
              aria-hidden
            />
            <span
              className="text-[13px] font-medium"
              style={{ color: TONE[r.tone && r.tone !== 'neutral' ? r.tone : 'neutral'] }}
            >
              {r.status}
            </span>
          </p>
          <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
            <span className="min-w-0 flex-1 pr-4">
              <span className="block text-[13px] font-medium text-[#1c1a16]">{SEX_WORD[r.sex]}</span>
              <span className="mt-0.5 block text-[11px] text-[#9b958b]">Sex</span>
            </span>
            <span className="min-w-0 flex-1 border-l border-[#f0efec] px-4">
              <span className="block text-[13px] font-medium text-[#1c1a16]">{r.age}</span>
              <span className="mt-0.5 block text-[11px] text-[#9b958b]">Age</span>
            </span>
            <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
              <span className="block truncate text-[13px] font-medium text-[#1c1a16]">{r.weight}</span>
              <span className="mt-0.5 block text-[11px] text-[#9b958b]">Weight</span>
            </span>
          </div>
        </section>
      </div>
      <Stack>
        <Section icon={MapPin} label="Placement">
          <Facts
            items={[
              { label: 'Site', value: r.site },
              { label: 'Enclosure', value: r.enclosure },
              { label: 'Class', value: r.cls },
              { label: 'Accession', value: r.accession },
              { label: 'Origin', value: r.origin },
            ]}
          />
        </Section>

        {/* `StatusList`, not `Snapshot`. Snapshot sizes its figure to fit the column,
            which is right for a number and wrong for a word: "Current" has no digits,
            so it was fitted as if it were one and set at 28pt display type — a
            vaccination status shouting louder than the animal's weight. These four
            are states, and a dot plus a word is what states look like here. */}
        <Section icon={ShieldCheck} label="Care status">
          <StatusList
            items={[
              { label: 'Vaccination', value: r.vaccination, tone: r.vaccination === 'Current' ? 'good' : 'warn' },
              { label: 'Deworming', value: r.deworming, tone: r.deworming === 'Current' ? 'good' : 'warn' },
              { label: 'Welfare score', value: r.welfare },
              { label: 'Last examined', value: r.lastExam },
            ]}
          />
        </Section>

        <Section icon={ClipboardList} label="Record" aside="recent">
          <Events items={r.timeline} />
        </Section>
      </Stack>
      {/* No level below. The record is the answer to "which animal"; everything
          past it — samples, doses, keeper notes — is the working screen of the
          person who owns the animal, not the executive question that opened this. */}
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
        Animal record · deepest level
      </p>
    </>
  )
}

/* ── critical alerts ─────────────────────────────────────────────────────── */

export function AlertPanel({ alert }: { alert: CriticalAlert }) {
  const { open } = useSheet()
  const tone = LEVEL_TONE[alert.level]

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={String(alert.count)} size={52} color={TONE[tone]} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <alert.icon size={15} strokeWidth={1.75} style={{ color: TONE[tone] }} aria-hidden />
            {alert.label}
          </p>
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
            {/* `capitalize` on the level word ONLY. Applied to the whole line it
                title-cased the note too, so "last 24 h · necropsy due" was rendered
                "Last 24 H · Necropsy Due" — the unit turned into an initial. */}
            <span className="text-[13px] font-medium" style={{ color: TONE[tone] }}>
              <span className="capitalize">{alert.level}</span> · {alert.note}
            </span>
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={ClipboardList} label="Open items" aside={`${alert.rows.length} listed`}>
          <TapList>
            {alert.rows.map((r) => (
              <TapRow
                key={r.id}
                label={r.subject}
                sub={`${r.id} · ${r.where} · ${r.when}`}
                value={r.status}
                tone={r.tone}
                onOpen={
                  r.animal
                    ? () =>
                        open({
                          title: r.animal!,
                          eyebrow: alert.label,
                          body: <AnimalPanel record={animalFromId(r.animal!, r.subject.split(' · ')[0], r.where)} />,
                        })
                    : undefined
                }
              />
            ))}
          </TapList>
        </Section>
      </Stack>
      <OpenModule href={alert.href} label="Open module" />
    </>
  )
}

/* ── approvals ───────────────────────────────────────────────────────────── */

type Decision = 'approved' | 'rejected'

/**
 * The approval queue, with the two buttons that make it a queue rather than a report.
 *
 * The brief asks for "only actionable approvals", and a list you can only read is not
 * actionable. Decisions are held in this component's own state — this is a prototype
 * with no backend — but they behave correctly: the row leaves the pending list, the
 * count above it drops, and a decided row moves to a settled group rather than
 * vanishing, so an accidental tap is visible rather than silent.
 */
export function ApprovalPanel({ group }: { group: ApprovalGroup }) {
  const [decided, setDecided] = useState<Record<string, Decision>>({})
  const pending = group.requests.filter((r) => !decided[r.id])
  const settled = group.requests.filter((r) => decided[r.id])
  const overdue = pending.filter((r) => r.overdue).length

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={String(pending.length)} size={52} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <group.icon size={15} strokeWidth={1.75} aria-hidden />
            {group.label} · waiting on you
          </p>
          {overdue > 0 && (
            <p className="mt-3 flex items-center gap-2">
              <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE.warn }} aria-hidden />
              <span className="text-[13px] font-medium" style={{ color: TONE.warn }}>
                {overdue} past SLA
              </span>
            </p>
          )}
        </section>
      </div>
      <Stack>
        {pending.map((r) => (
          <Section key={r.id} icon={group.icon} label={r.title} aside={r.id}>
            <ApprovalCard request={r} onDecide={(d) => setDecided((s) => ({ ...s, [r.id]: d }))} />
          </Section>
        ))}

        {pending.length === 0 && (
          <Section icon={Check} label="Queue clear">
            <p className="text-[13px] text-[#6d6860]">Nothing in {group.label.toLowerCase()} is waiting on you.</p>
          </Section>
        )}

        {settled.length > 0 && (
          <Section icon={ClipboardList} label="Decided just now" aside={`${settled.length}`}>
            <Facts
              items={settled.map((r) => ({
                label: r.title,
                sub: `${r.id} · ${r.from}`,
                value: decided[r.id] === 'approved' ? 'Approved' : 'Rejected',
                tone: decided[r.id] === 'approved' ? ('good' as const) : ('bad' as const),
              }))}
            />
          </Section>
        )}
      </Stack>
      <OpenModule href="#/approvals" label="Open Approvals" />
    </>
  )
}

function ApprovalCard({
  request,
  onDecide,
}: {
  request: ApprovalRequest
  onDecide: (d: Decision) => void
}) {
  return (
    <div>
      <Facts
        items={[
          { label: 'Raised by', value: request.from },
          ...(request.value ? [{ label: 'Value', value: request.value }] : []),
          {
            label: 'Waiting',
            value: request.age,
            tone: request.overdue ? ('bad' as const) : undefined,
            sub: request.overdue ? 'Past 3-day SLA' : undefined,
          },
        ]}
      />
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onDecide('approved')}
          className="card-press flex flex-1 items-center justify-center gap-1.5 rounded-[11px] py-2.5 text-[13px] font-semibold text-white"
          style={{ backgroundColor: '#1e7a44' }}
        >
          <Check size={15} strokeWidth={2.5} aria-hidden />
          Approve
        </button>
        <button
          type="button"
          onClick={() => onDecide('rejected')}
          className="card-press flex flex-1 items-center justify-center gap-1.5 rounded-[11px] border border-[#eceae5] py-2.5 text-[13px] font-semibold"
          style={{ color: TONE.bad }}
        >
          <X size={15} strokeWidth={2.5} aria-hidden />
          Reject
        </button>
      </div>
    </div>
  )
}

/* ── upcoming ────────────────────────────────────────────────────────────── */

export function UpcomingPanel({ group, horizon }: { group: UpcomingGroup; horizon: number }) {
  const rows = group.rows.filter((r) => r.inDays <= horizon)
  const total = rows.reduce((n, r) => n + r.count, 0)
  const soon = rows.filter((r) => r.inDays <= 2)

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={fmt(total)} size={52} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <group.icon size={15} strokeWidth={1.75} aria-hidden />
            {group.label} · next {horizon} days
          </p>
          {soon.length > 0 && (
            <p className="mt-3 flex items-center gap-2">
              <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE.warn }} aria-hidden />
              <span className="text-[13px] font-medium" style={{ color: TONE.warn }}>
                {soon.length} within 48 hours
              </span>
            </p>
          )}
        </section>
      </div>
      <Stack>
        <Section icon={CalendarClock} label="Schedule" aside={`${rows.length} dates`}>
          <Events
            items={rows.map((r) => ({
              when: r.date,
              label: r.subject,
              sub: r.where,
              value: fmt(r.count),
              tone: r.inDays <= 2 ? ('warn' as const) : undefined,
            }))}
          />
        </Section>
        {rows.length > 2 && (
          <Section icon={Building2} label="By location" aside={`${new Set(rows.map(siteOfRow)).size} sites`}>
            <Bars items={byLocation(rows)} />
          </Section>
        )}
      </Stack>
      <OpenModule href={group.href} label="Open module" />
    </>
  )
}

const siteOfRow = (r: DueRow) => r.where.split(' · ')[0]

function byLocation(rows: DueRow[]) {
  const map = new Map<string, number>()
  for (const r of rows) map.set(siteOfRow(r), (map.get(siteOfRow(r)) ?? 0) + r.count)
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

/* ── risks ───────────────────────────────────────────────────────────────── */

export function RiskPanel({ risk }: { risk: Risk }) {
  const tone = LEVEL_TONE[risk.level]
  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={risk.value} size={52} color={TONE[tone]} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <risk.icon size={15} strokeWidth={1.75} style={{ color: TONE[tone] }} aria-hidden />
            {risk.label}
          </p>
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone] }} aria-hidden />
            <span className="text-[13px] font-medium" style={{ color: TONE[tone] }}>
              <span className="capitalize">{risk.level}</span> · {risk.note}
            </span>
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={ClipboardList} label="Exposure" aside={`${risk.rows.length} lines`}>
          <Facts
            items={risk.rows.map((r: AlertRow) => ({
              label: r.subject,
              sub: `${r.id} · ${r.where} · ${r.when}`,
              value: r.status,
              tone: r.tone,
            }))}
          />
        </Section>
      </Stack>
      <OpenModule href={risk.href} label="Open module" />
    </>
  )
}

/* ── executive health measure ────────────────────────────────────────────── */

const MONTH_LABELS = ['Feb', 'Apr', 'Jun', 'Jul']

export function MeasurePanel({ measure }: { measure: Measure }) {
  const first = measure.history[0]
  const last = measure.history[measure.history.length - 1]
  const moved = last - first

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={measure.value} unit={measure.unit} size={52} color={TONE[measure.tone]} />
          <p className="mt-1 text-[15px] text-[#3d3a34]">{measure.label}</p>
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[measure.tone] }} aria-hidden />
            <span className="text-[13px] font-medium" style={{ color: TONE[measure.tone] }}>
              {measure.delta} · {measure.targetLabel}
            </span>
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={TrendingUp} label="Six months" aside={measure.targetLabel}>
          <Trend values={measure.history} labels={MONTH_LABELS} unit="Monthly reading" tone={measure.tone} />
        </Section>
        <Section icon={ShieldCheck} label="Against target">
          <Snapshot
            cols={3}
            items={[
              { label: 'Now', value: measure.value, unit: measure.unit, tone: measure.tone },
              { label: 'Six months ago', value: String(first) },
              { label: 'Moved', value: `${moved > 0 ? '+' : ''}${Number(moved.toFixed(2))}` },
            ]}
          />
        </Section>
      </Stack>
      <OpenModule href={measure.href} label="Open module" />
    </>
  )
}

/* ── trends ──────────────────────────────────────────────────────────────── */

export function TrendPanel({ card }: { card: TrendCard }) {
  const peak = Math.max(...card.values)
  const trough = Math.min(...card.values)
  const last = card.values[card.values.length - 1]
  const first = card.values[0]

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={card.value} size={52} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <card.icon size={15} strokeWidth={1.75} aria-hidden />
            {card.label}
          </p>
          <p className="mt-3 flex items-center gap-2">
            <span
              className="size-[7px] rounded-full"
              style={{ backgroundColor: TONE[card.tone === 'neutral' ? 'neutral' : card.tone] }}
              aria-hidden
            />
            <span
              className="text-[13px] font-medium"
              style={{ color: TONE[card.tone === 'neutral' ? 'neutral' : card.tone] }}
            >
              {card.delta} · 12 months
            </span>
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={TrendingUp} label="Twelve months" aside={card.unitNote}>
          <Trend
            values={card.values}
            labels={card.labels}
            unit={card.unitNote}
            tone={card.tone === 'neutral' ? undefined : card.tone}
            height={150}
          />
        </Section>
        <Section icon={Layers} label="Range">
          <Snapshot
            cols={2}
            items={[
              { label: 'Latest', value: compact(last) },
              { label: 'Twelve months ago', value: compact(first) },
              { label: 'Peak', value: compact(peak) },
              { label: 'Trough', value: compact(trough) },
            ]}
          />
        </Section>
      </Stack>
      <OpenModule href={card.href} label="Open module" />
    </>
  )
}

/* ── zoo health composite ────────────────────────────────────────────────── */

export function ZooHealthPanel({
  score,
  parts,
  delta,
}: {
  score: number
  parts: { label: string; score: number; weight: number; href: string }[]
  delta: string
}) {
  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)] text-center">
          <Figure value={String(score)} unit="/ 100" size={58} />
          <p className="mt-1 text-[15px] text-[#3d3a34]">Zoo Health</p>
          <p className="mt-3 flex items-center justify-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE.good }} aria-hidden />
            <span className="text-[13px] font-medium" style={{ color: TONE.good }}>
              {delta} on the previous window
            </span>
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={Dna} label="What it is made of" aside="weighted">
          <ul className="flex flex-col gap-4">
            {parts.map((p) => (
              <li key={p.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px] text-[#1c1a16]">{p.label}</span>
                  <span className="text-[13px] tabular-nums" style={{ color: FAINT }}>
                    {Math.round(p.weight * 100)}% weight
                  </span>
                  <Figure value={String(p.score)} size={19} />
                </div>
                <div className="mt-2 h-[8px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.score}%`, backgroundColor: p.score >= 90 ? TONE.good : TONE.warn }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-[#f0efec] pt-3 text-[11px]" style={{ color: MUTED }}>
            Composite is the weighted mean of the four, computed rather than authored.
          </p>
        </Section>
        <Section icon={ShieldCheck} label="Where to look next">
          <Highlights
            items={parts.map((p) => ({
              tag: `${Math.round(p.weight * 100)}%`,
              value: String(p.score),
              label: p.label,
              tone: p.score >= 90 ? ('good' as const) : ('warn' as const),
            }))}
          />
        </Section>
      </Stack>
    </>
  )
}
