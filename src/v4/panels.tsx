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

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
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
import { resolveWindow } from '../core/calendar'
import { series } from '../core/series'
import { siteOf } from '../core/world'
import { usePeriod } from '../exec/period'
import { useTrendCard } from './kpi'
import {
  ACCENT_INK,
  Bars,
  Events,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
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
  DRILL,
  animalRecord,
  animalsFor,
  animalFromId,
  sitesFor,
  speciesFor,
  speciesForAll,
  type AnimalRecord,
  type AnimalRow,
} from './drill'
import {
  LEVEL_TONE,
  headlineKpis,
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
import { useSite } from './filters'

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
  active,
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
  /** Currently the selected facet — tinted, so the filter's cause stays visible. */
  active?: boolean
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
        <button
          type="button"
          onClick={onOpen}
          aria-pressed={active}
          className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left"
          style={active ? { backgroundColor: mix(accent, 0.09) } : undefined}
        >
          {body}
        </button>
      ) : (
        <div className="py-2.5">{body}</div>
      )}
    </li>
  )
}

export const TapList = ({ children }: { children: ReactNode }) => <ul className="flex flex-col">{children}</ul>

/* ── entering the drill from a module page ───────────────────────────────── */

/**
 * Tap a site row → that site's drill, as a sheet.
 *
 * THE KPI CARD NO LONGER OPENS THIS. A card on the home used to be the first door to the
 * Overall → Site → Species → Animal drill, which meant the deepest analytical view in the
 * product arrived over a home screen, with the module page it belongs to never visited. The
 * card now opens the module's detail page and the page's own site list is where the drill is
 * entered — so the sheet is a drill-down from the page that explains it rather than the first
 * destination from a tile.
 *
 * Declared once, because six module pages need exactly this handler and a hand-composed
 * `open({ title, eyebrow, body })` at each call site is six chances for one of them to open a
 * sheet titled for a site it did not scope to.
 */
export function useSiteDrill(metric: string, eyebrow?: string) {
  const { open } = useSheet()
  return (key: string, name: string) =>
    open({
      title: name,
      eyebrow: eyebrow ?? DRILL[metric]?.title ?? 'Breakdown',
      /* The KEY, not just the name — the panel opens on the site that was tapped. */
      body: <MetricPanel metric={metric} siteKey={key} />,
    })
}

/* ── the detail page ─────────────────────────────────────────────────────── */

/**
 * ONE PAGE FOR THE WHOLE DRILL — Overall, Site, Species and Animals at once.
 *
 * This replaces three stacked sheets. The hierarchy is identical to the one the brief
 * asked for, and stops in the same place; what changed is that moving through it no
 * longer replaces the screen. Tapping Aquatic Halls does not open a new level, it
 * SELECTS one: the Species card below re-titles and refilters, the Animals card
 * refilters under it, and both stay on screen with the sites they came from.
 *
 * Three reasons that is better than the stack it replaces:
 *
 *   · You can see the answer and its context together. "Which species is driving
 *     Aquatic Halls" is a comparison between a site row and a species row, and the
 *     stack put them on different screens.
 *   · Switching sites is one tap instead of back-then-tap.
 *   · Nothing has to be dismissed to get out. The facet chips undo themselves.
 *
 * There is no link out to the module, deliberately. This page is the detail; a button
 * that leaves it was an admission that it wasn't.
 */
export function MetricPanel({ metric, siteKey }: { metric: string; siteKey?: string }) {
  const { period, cut } = usePeriod()
  const { open } = useSheet()
  const { site: scope } = useSite()
  /* WHERE THE PANEL OPENS.
     `siteKey` is the row that was tapped — the sheet is now reached by drilling a site on a
     module page, and arriving unscoped would make the reader pick the site they just picked.
     Absent one it falls back to the global site filter, for the same reason: a director who has
     scoped the whole app to Aquatic Halls is asking about Aquatic Halls.
     Memoised on the KEY rather than the object, so a caller passing a fresh literal each render
     cannot restart the reset effect below. */
  const opening = useMemo(() => {
    const picked = siteKey ? siteOf(siteKey) : undefined
    if (picked) return { key: picked.key, name: picked.name }
    return scope ? { key: scope.key, name: scope.name } : null
  }, [siteKey, scope])
  const [site, setSite] = useState<{ key: string; name: string } | null>(opening)
  const [species, setSpecies] = useState<string | null>(null)
  const speciesCard = useRef<HTMLDivElement>(null)
  const animalsCard = useRef<HTMLDivElement>(null)

  const def = DRILL[metric]
  const level = sitesFor(metric, cut)

  /* Every window change re-cuts the figures underneath the facets, and a site that
     reported nothing last week would leave the page filtered to an empty list with no
     visible cause. Clearing on the window is the honest reset. */
  useEffect(() => {
    setSite(opening)
    setSpecies(null)
  }, [period.key, opening])

  const speciesRows = useMemo(
    () => (site ? speciesFor(metric, site.key, cut) : speciesForAll(metric, cut)),
    [metric, site, cut],
  )
  const animals = useMemo(
    () => animalsFor(metric, cut, site?.key, species ?? undefined),
    [metric, cut, site, species],
  )

  if (!def || !level) return null

  const rate = level.kind === 'rate'
  const siteRow = site ? level.rows.find((r) => r.site.key === site.key) : undefined
  const speciesRow = species ? speciesRows.find((s) => s.name === species) : undefined

  /* The headline follows the facets. Scoped to a species it states that species'
     figure, to a site that site's, and otherwise the collection's — so the number at
     the top of the page is always the number the lists below add up to. */
  const scoped = speciesRow ?? siteRow ?? { value: level.overall, percent: 100 }
  const headline = rate
    ? `${Math.round('percent' in scoped ? scoped.percent : level.overall)}`
    : fmt(Math.round(scoped.value))
  const scopeLabel = species ?? site?.name ?? 'Zoo-wide'

  const pickSite = (key: string, name: string) => {
    const same = site?.key === key
    setSite(same ? null : { key, name })
    setSpecies(null)
    if (!same) requestAnimationFrame(() => speciesCard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const pickSpecies = (name: string) => {
    const same = species === name
    setSpecies(same ? null : name)
    if (!same) requestAnimationFrame(() => animalsCard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const widestSite = Math.max(...level.rows.map((r) => r.percent), 1)
  const widestSpecies = Math.max(...speciesRows.map((r) => r.percent), 1)
  const classes = new Set(speciesRows.map((r) => r.cls)).size
  const kpi = headlineKpis.find((k) => k.drill === metric)
  /* The twelve-month curve for whichever site the panel is focused on — the panel's own
     facet if one is picked, else the global scope's. Read from the metric rather than from
     the KPI's authored array, so it responds to both. */
  const yearSeries = useMemo(
    () => series(metric, site?.key ?? scope?.key ?? null, resolveWindow('year'), 12),
    [metric, site?.key, scope?.key],
  )
  /* How many sites hold the selected species — counted from the same per-site cuts
     the rows below are built from, so it cannot disagree with them. */
  const speciesSites = species
    ? level.rows.filter((r) => speciesFor(metric, r.site.key, cut).some((s) => s.name === species && s.value > 0))
        .length
    : 0

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={headline} unit={rate ? '%' : undefined} size={52} color={HERO_INK} />
          {/* The UNIT here, not the module name — the sheet header two inches above
              already says "Health & Medical", and repeating it under the figure spends
              the one line that could say what the figure counts and what it is scoped
              to. The affordance line that used to sit below is gone too; the Sites
              card's own aside teaches it, in the place you would use it. */}
          <p className="mt-1 text-[15px] text-[#3d3a34]">
            {def.unit} · {scopeLabel === 'Zoo-wide' ? 'zoo-wide' : scopeLabel}
          </p>
          <p className="mt-2.5 text-[12px] text-[#9b958b]">{period.window}</p>
        </section>
      </div>

      {/* THE FACET BAR IS THE NAVIGATION. It is the only thing on the page that says
          how far in you are, so it is present at every depth — greyed at the root
          rather than absent, or its first appearance would look like a new control. */}
      <div className="-mx-1 mb-2 flex items-center gap-1.5 overflow-x-auto px-[calc(var(--gutter-lg)+4px)] pb-2 scrollbar-hidden">
        <Chip label="Zoo-wide" on={!site} onClick={() => { setSite(null); setSpecies(null) }} />
        {site && <Sep />}
        {site && <Chip label={site.name} on onClear={() => { setSite(null); setSpecies(null) }} />}
        {species && <Sep />}
        {species && <Chip label={species} on onClear={() => setSpecies(null)} />}
      </div>

      <Stack>
        {kpi && (
          <Section icon={TrendingUp} label="Twelve months" aside={site ? site.name : 'zoo-wide'}>
            {/* The site scope's own twelve months, not the collection's. There is still no
                twelve-month history at SPECIES grain, so selecting a species leaves this
                card at site level — and the `aside` says which level it is, rather than
                letting a species heading imply the curve underneath belongs to it. */}
            <Trend
              values={yearSeries}
              labels={['Aug 24', 'Nov 24', 'Feb 25', 'Jul 25']}
              unit={`${def.unit} · per month`}
              height={132}
            />
          </Section>
        )}

        {/* Recut per facet, and that is the point of the card: what "composition"
            means depends entirely on what is selected. Zoo-wide it is the six sites;
            inside a site it is the species it holds; on a species it is where that
            species is and how many. A card that kept saying "6 sites · 40 species"
            under a Zebra Finch heading would be answering the previous question. */}
        <Section icon={Layers} label="Composition" aside={speciesRow ? speciesRow.cls : scopeLabel}>
          {/* The class goes in the ASIDE, not into a cell. `Snapshot` sizes a cell to
              fit its value as though it were a figure, so "Aves" was set at 34pt
              display type — a taxonomic rank shouting louder than the count beside it.
              Cells hold numbers; the word belongs in the card's own header. */}
          <Snapshot
            cols={speciesRow ? 2 : 3}
            items={
              speciesRow
                ? [
                    { label: speciesSites === 1 ? 'Site holding' : 'Sites holding', value: String(speciesSites) },
                    { label: def.unit, value: fmt(Math.round(speciesRow.value)) },
                  ]
                : site
                  ? [
                      { label: 'Species', value: String(speciesRows.length) },
                      { label: 'Classes', value: String(classes) },
                      { label: 'Enclosures', value: String(siteRow?.site.enclosures ?? 0) },
                    ]
                  : [
                      { label: 'Sites', value: String(level.rows.length) },
                      { label: 'Species', value: String(speciesRows.length) },
                      { label: 'Classes', value: String(classes) },
                    ]
            }
          />
        </Section>

        {/* All six rows stay, selected or not. Filtering the list down to the chosen
            site would make switching sites a two-step — clear, then pick — and hide
            the comparison that made you pick in the first place. */}
        <Section icon={MapPin} label="Sites" aside={`${level.rows.length} · tap to filter`}>
          <TapList>
            {level.rows.map((r) => (
              <TapRow
                key={r.site.key}
                label={r.site.name}
                sub={`${r.site.code} · ${r.site.enclosures} enclosures`}
                value={rate ? `${Math.round(r.percent)}%` : fmt(r.value)}
                unit={rate && r.of ? `${fmt(r.value)}/${fmt(r.of)}` : undefined}
                bar={rate ? r.percent : (r.percent / widestSite) * 100}
                active={site?.key === r.site.key}
                onOpen={r.value > 0 ? () => pickSite(r.site.key, r.site.name) : undefined}
              />
            ))}
          </TapList>
        </Section>

        <div ref={speciesCard} className="contents">
          <Section
            icon={Dna}
            label="Species"
            aside={site ? `${speciesRows.length} in ${site.name}` : `${speciesRows.length} · zoo-wide`}
          >
            <TapList>
              {speciesRows.map((s) => (
                <TapRow
                  key={s.name}
                  label={s.name}
                  sub={s.cls}
                  value={rate ? `${Math.round(s.percent)}%` : fmt(s.value)}
                  unit={rate && s.of ? `${fmt(s.value)}/${fmt(s.of)}` : undefined}
                  bar={rate ? s.percent : (s.percent / widestSpecies) * 100}
                  active={species === s.name}
                  onOpen={s.value > 0 ? () => pickSpecies(s.name) : undefined}
                />
              ))}
            </TapList>
          </Section>
        </div>

        <div ref={animalsCard} className="contents">
          <Section
            icon={PawPrint}
            label="Animals"
            aside={
              animals.total > animals.rows.length
                ? `${animals.rows.length} of ${fmt(animals.total)}`
                : `${animals.rows.length}`
            }
          >
            {animals.total > animals.rows.length && (
              /* Never let forty rows imply forty animals. The cap is a reading limit
                 and has to be stated as one. */
              <p className="mb-3 text-[11.5px] text-[#9b958b]">
                A sample across {site ? 'this site' : 'all sites'}, drawn in proportion to each
                species' share. Narrow further to see fewer, truer rows.
              </p>
            )}
            <TapList>
              {animals.rows.map((a) => (
                <TapRow
                  key={a.id}
                  label={a.id}
                  sub={`${a.name} · ${a.enclosure} · ${a.sex} · ${a.age}${a.when ? ` · ${a.when}` : ''}`}
                  value={a.status}
                  tone={a.tone}
                  onOpen={() =>
                    open({ title: a.id, eyebrow: `${a.name} · ${a.site}`, body: <AnimalPanel row={a} /> })
                  }
                />
              ))}
            </TapList>
            {animals.rows.length === 0 && (
              <p className="text-[13px] text-[#6d6860]">Nothing recorded here in {period.window}.</p>
            )}
          </Section>
        </div>
      </Stack>
    </>
  )
}

/** A facet, and the ✕ that undoes it. */
function Chip({
  label,
  on,
  onClick,
  onClear,
}: {
  label: string
  on: boolean
  onClick?: () => void
  onClear?: () => void
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full py-[5px] text-[12px] font-medium whitespace-nowrap transition-colors ${
        on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
      } ${onClear ? 'pr-1.5 pl-3' : 'px-3'}`}
    >
      <button type="button" onClick={onClick} disabled={!onClick} className="max-w-[140px] truncate">
        {label}
      </button>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label}`}
          className="grid size-[18px] shrink-0 place-items-center rounded-full bg-white/15"
        >
          <X size={11} strokeWidth={2.5} aria-hidden />
        </button>
      )}
    </span>
  )
}

const Sep = () => (
  <span className="shrink-0 text-[12px] text-[#b3aea6]" aria-hidden>
    ›
  </span>
)



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
          <Figure value={String(pending.length)} size={52} color={HERO_INK} />
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
          <Figure value={fmt(total)} size={52} color={HERO_INK} />
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
    </>
  )
}

/* ── trends ──────────────────────────────────────────────────────────────── */

export function TrendPanel({ card }: { card: TrendCard }) {
  const { value, delta, values, scopedNote } = useTrendCard(card)
  const peak = Math.max(...values, 0)
  const trough = Math.min(...values, 0)
  const last = values[values.length - 1] ?? 0
  const first = values[0] ?? 0

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={value} size={52} color={HERO_INK} />
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
              {delta} · 12 months{scopedNote ? ` · ${scopedNote}` : ''}
            </span>
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={TrendingUp} label="Twelve months" aside={card.unitNote}>
          <Trend
            values={values}
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
          <Figure value={String(score)} unit="/ 100" size={58} color={HERO_INK} />
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
