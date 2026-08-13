/**
 * ENTITY PAGES — the product stops being module-centric here.
 *
 * THE STRUCTURAL CLAIM. A module is a question ("what did we lose this month?"); an entity is
 * a thing ("Aquatic Halls", "Leo", "Incubator 03"). Before this the product had only
 * questions: you could read the mortality answer, and the site names inside it were text. Ask
 * "what is going on in Aquatic Halls" and there was nowhere to go, because no such page
 * existed and nothing in the data model would have let one be built — mortality's `'aquatic'`
 * and vaccination's `'aquatic'` were unrelated strings.
 *
 * Now every entity has a URL, a lineage, and a page that reads EVERY metric under it. Modules
 * become entry points to these pages, which is what the requirement asks for, and the drill
 * hierarchies become real navigation rather than a sheet that has to be re-opened from
 * scratch each time.
 *
 * ONE COMPONENT, FOURTEEN KINDS. The kinds differ in what they hold, not in how they read, so
 * what varies is declared per kind (`SPECS`) and the composition is shared. The exception is
 * the animal, which gets a bespoke page because it is the only entity with a life story rather
 * than a set of children — and it is where the cross-navigation requirement lands.
 *
 * EVERY FIGURE ON THESE PAGES IS SCOPED TO THE ENTITY, not to the module that linked here.
 * A ward's caseload counts the events in that ward. That is why `core/events.ts` grew
 * `pageWhere` — a ward is not a dimension the daily series is keyed by.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeftRight,
  Baby,
  BookOpen,
  Boxes,
  Building2,
  ChevronRight,
  Egg,
  FileText,
  FlaskConical,
  Heart,
  HeartPulse,
  Layers,
  MapPin,
  PawPrint,
  Pill,
  ShieldCheck,
  Skull,
  Sparkles,
  Stethoscope,
  Syringe,
  Users as UsersIcon,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ago, longDate, shortDate } from '../core/calendar'
import { KIND_ONE, children, listOf, resolve, type Entity, type EntityKind, type Ref } from '../core/entities'
import { countOf, eventsForAnimal, page as eventPage, pageWhere, type Dimension, type Ev } from '../core/events'
import { METRICS } from '../core/metrics'
import { loadProfiles, profileOf, profilesNow } from '../core/profiles'
import { SpeciesProfileTab } from './speciesProfile'
import { animalById, animalsOfSpecies, sexSplit, stockOfSpecies, type Animal } from '../core/animals'
import { byDimension, delta as deltaOf, figure as figureOf, population } from '../core/query'
import { entityHref, siteKeyOf, withinScope } from '../core/scope'
import {
  ENCLOSURES,
  HOSPITALS,
  INCUBATORS,
  LABS,
  LAB_DEPARTMENTS,
  MEDICINES,
  NURSERIES,
  USERS,
  WARDS,
  departmentOf,
  siteOf,
  sitePharmacies,
  speciesIn,
  speciesOf,
  usersIn,
} from '../core/world'
import {
  ACCENT,
  ACCENT_INK,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  MUTED,
  Section,
  Stack,
  TONE,
  compact,
  fmt,
  mix,
} from '../exec/system'
import { FlowSplit, RankList, SplitRing } from '../exec/marks'
import { speciesLifecycle } from './modules/population'
import { standingOf } from './modules/regulatory'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'

/* ── shared bits ─────────────────────────────────────────────────────────── */

export const KIND_ICON: Record<EntityKind, LucideIcon> = {
  site: MapPin,
  species: PawPrint,
  animal: Heart,
  enclosure: Boxes,
  hospital: Building2,
  ward: Stethoscope,
  lab: FlaskConical,
  labdept: Layers,
  pharmacy: Warehouse,
  medicine: Pill,
  nursery: Egg,
  incubator: Layers,
  department: UsersIcon,
  user: UsersIcon,
}

/** The card every entity page opens with. */
function Hero({
  value,
  unit,
  label,
  sub,
  icon: Glyph,
  tone,
}: {
  value: string
  unit?: string
  label: string
  sub?: string
  icon?: LucideIcon
  tone?: keyof typeof TONE
}) {
  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} unit={unit} size={48} color={tone ? TONE[tone] : HERO_INK} />
        <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
          {Glyph && <Glyph size={15} strokeWidth={1.75} style={{ color: ACCENT }} aria-hidden />}
          {label}
        </p>
        {sub && <p className="mt-3 text-caption" style={{ color: FAINT }}>{sub}</p>}
      </section>
    </div>
  )
}

/** A row that navigates to another entity. The whole point of the layer. */
function EntityRow({
  entity,
  value,
  unit,
}: {
  entity: Entity
  value?: string
  unit?: string
}) {
  const { href } = useScope()
  const Glyph = KIND_ICON[entity.kind]
  return (
    <li className="border-b border-[#f0efec] last:border-0">
      <a href={href(entityHref(entity).slice(2))} className="card-press -mx-2 flex items-stretch gap-3 rounded-[10px] px-2 py-3">
        {/* The row's share as the weight of a rail rather than a bar under it — see the note on
            `TapRow`'s `bar` in `v4/panels.tsx`. */}
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="grid size-7 shrink-0 place-items-center rounded-[9px]"
            style={{ backgroundColor: mix(ACCENT, 0.1) }}
            aria-hidden
          >
            <Glyph size={14} strokeWidth={1.75} style={{ color: ACCENT }} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-small text-[#1c1a16]">{entity.name}</span>
            {entity.sub && (
              <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                {entity.sub}
              </span>
            )}
          </span>
          {value && (
            <span className="shrink-0 text-right">
              <span className="text-small font-medium tabular-nums text-[#2f2424]">{value}</span>
              {unit && <span className="ml-1 text-caption" style={{ color: FAINT }}>{unit}</span>}
            </span>
          )}
          <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
        </span>
      </a>
    </li>
  )
}

/**
 * The metric strip on an entity page — every metric that has something to say about it.
 *
 * Reads the metrics rather than declaring which ones matter per kind, so a metric added to
 * `core/metrics.ts` appears on every site page without anyone wiring it up. Metrics with
 * nothing to report in the window are dropped rather than shown as zeros, because a page of
 * twenty-seven zeros hides the three figures that are not.
 */
function MetricStrip({ slugs, siteKey }: { slugs: string[]; siteKey: string | null }) {
  const { scope, href } = useScope()

  const rows = useMemo(() => {
    const at = { site: siteKey ? (siteOf(siteKey) ?? null) : null, win: scope.win }
    return slugs
      .map((slug) => {
        const f = figureOf(at, slug)
        const d = deltaOf(at, slug)
        const metric = METRICS[slug]
        return {
          slug,
          label: LABELS[slug] ?? slug,
          value: metric?.kind === 'rate' ? `${Math.round(f.percent ?? 0)}%` : compact(f.value),
          raw: metric?.kind === 'rate' ? (f.percent ?? 0) : f.value,
          delta: d ? `${d.percent >= 0 ? '+' : '−'}${Math.abs(d.percent).toFixed(0)}${metric?.kind === 'rate' ? '' : '%'}` : undefined,
          unit: metric?.unit ?? '',
        }
      })
      .filter((r) => r.raw > 0)
  }, [slugs, siteKey, scope.win])

  if (rows.length === 0) {
    return (
      <p className="py-3 text-caption" style={{ color: FAINT }}>
        Nothing reported in {scope.win.window}.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4 @[560px]:grid-cols-3">
      {rows.map((r) => (
        <a key={r.slug} href={href(r.slug)} className="card-press min-w-0 rounded-[10px]">
          <span className="block truncate text-overline font-medium uppercase" style={{ color: FAINT }}>
            {r.label}
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-n font-bold tabular-nums text-[#2f2424]">
              {r.value}
            </span>
            {r.delta && (
              <span className="text-caption font-semibold tabular-nums" style={{ color: FAINT }}>
                {r.delta}
              </span>
            )}
          </span>
          <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
            {r.unit}
          </span>
        </a>
      ))}
    </div>
  )
}

/** Human names for metric slugs, in one place. */
const LABELS: Record<string, string> = {
  animals: 'Population',
  births: 'Births',
  mortality: 'Deaths',
  accession: 'Intakes',
  transfers: 'Movements',
  health: 'Under care',
  admissions: 'Admissions',
  disease: 'Flagged',
  vaccination: 'Vaccinated',
  preventive: 'Protected',
  deworming: 'Dewormed',
  eggs: 'Eggs laid',
  hatched: 'Hatched',
  discarded: 'Discarded',
  fetal: 'Fetal loss',
  lab: 'Samples',
  labOpen: 'Open samples',
  pharmacy: 'Dispensed',
  approvals: 'Approvals',
  tasks: 'Tasks',
  attendance: 'Present',
  alerts: 'Alerts',
  alertsCritical: 'Critical',
  welfare: 'Welfare',
  breeding: 'Breeding',
  healthScore: 'Health index',
  wastage: 'Wastage',
}

/** A record list, paged, with the real total beside it. */
function RecordList({
  slug,
  siteKey,
  match,
  noun,
}: {
  slug: string
  siteKey: string | null
  match?: (ev: Ev) => boolean
  noun: string
}) {
  const { scope, href } = useScope()

  const paged = usePaged<Ev>(
    (offset, limit) => {
      const at = siteKey
      const res = match
        ? pageWhere(slug, at, scope.win, match, offset, limit)
        : eventPage(slug, at, scope.win, offset, limit)
      return { rows: res.rows, total: res.total }
    },
    12,
    [slug, siteKey, scope.win.from, scope.win.to],
  )

  if (paged.total === 0) {
    return (
      <p className="py-2 text-caption" style={{ color: FAINT }}>
        No {noun} in {scope.win.window}.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col">
        {paged.rows.map((ev) => (
          <li key={ev.id} className="border-b border-[#f0efec] last:border-0">
            <a
              href={href(`e/animal/${ev.animalId}`)}
              className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-[#1c1a16]">{ev.speciesName}</span>
                <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
                  {ev.detail} · {ev.animalId}
                </span>
              </span>
              <span
                className="shrink-0 text-caption font-medium tabular-nums"
                style={{ color: ev.tone && ev.tone !== 'neutral' ? TONE[ev.tone] : MUTED }}
              >
                {shortDate(ev.day)}
              </span>
              <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <MoreRows page={paged} noun={noun} />
    </>
  )
}

/* ── per-kind declarations ───────────────────────────────────────────────── */

interface Spec {
  /** The metric whose figure heads the page. */
  hero?: string
  /** What the hero figure means, in words. */
  heroLabel?: string
  /** Metrics to show in the strip. Defaults to every metric with a site model. */
  metrics?: string[]
  /** The flow whose records the page lists, and the dimension that narrows it to this entity. */
  records?: { slug: string; by?: Dimension }
  /** Extra breakdowns, as (flow, dimension) pairs. */
  breakdowns?: { slug: string; by: Dimension; label: string }[]
}

const ALL_SITE_METRICS = [
  'animals', 'health', 'births', 'mortality', 'accession', 'transfers',
  'vaccination', 'preventive', 'deworming', 'admissions', 'disease',
  'lab', 'labOpen', 'pharmacy', 'eggs', 'hatched', 'discarded', 'fetal',
  'approvals', 'tasks', 'attendance', 'alerts', 'welfare', 'breeding', 'healthScore', 'wastage',
]

const SPECS: Partial<Record<EntityKind, Spec>> = {
  site: {
    hero: 'animals',
    heroLabel: 'animals held',
    metrics: ALL_SITE_METRICS,
    breakdowns: [
      { slug: 'mortality', by: 'detail', label: 'Cause of death' },
      { slug: 'lab', by: 'labdept', label: 'Samples by department' },
    ],
    records: { slug: 'mortality' },
  },
  hospital: {
    hero: 'admissions',
    heroLabel: 'admissions',
    metrics: ['admissions', 'health'],
    records: { slug: 'admissions', by: 'hospital' },
    breakdowns: [{ slug: 'admissions', by: 'ward', label: 'Admissions by ward' }],
  },
  ward: {
    hero: 'admissions',
    heroLabel: 'admissions',
    metrics: ['admissions'],
    records: { slug: 'admissions', by: 'ward' },
    breakdowns: [{ slug: 'admissions', by: 'detail', label: 'Presenting complaint' }],
  },
  lab: {
    hero: 'lab',
    heroLabel: 'samples raised',
    metrics: ['lab', 'labOpen'],
    records: { slug: 'lab', by: 'labdept' },
    breakdowns: [{ slug: 'lab', by: 'labdept', label: 'By department' }],
  },
  labdept: {
    hero: 'lab',
    heroLabel: 'samples raised',
    metrics: ['lab'],
    records: { slug: 'lab', by: 'labdept' },
    breakdowns: [{ slug: 'lab', by: 'detail', label: 'Sample type' }],
  },
  pharmacy: {
    hero: 'pharmacy',
    heroLabel: 'items dispensed',
    metrics: ['pharmacy'],
    records: { slug: 'pharmacy' },
    breakdowns: [{ slug: 'pharmacy', by: 'medicine', label: 'By medicine' }],
  },
  medicine: {
    hero: 'pharmacy',
    heroLabel: 'units dispensed',
    metrics: ['pharmacy'],
    records: { slug: 'pharmacy', by: 'medicine' },
    breakdowns: [{ slug: 'pharmacy', by: 'site', label: 'By site' }],
  },
  nursery: {
    hero: 'eggs',
    heroLabel: 'eggs set',
    metrics: ['eggs', 'hatched', 'discarded'],
    records: { slug: 'eggs', by: 'nursery' },
    breakdowns: [{ slug: 'eggs', by: 'incubator', label: 'By incubator' }],
  },
  incubator: {
    hero: 'eggs',
    heroLabel: 'eggs set',
    metrics: ['eggs', 'hatched'],
    records: { slug: 'eggs', by: 'incubator' },
    breakdowns: [{ slug: 'hatched', by: 'detail', label: 'Hatch outcome' }],
  },
  enclosure: { hero: 'animals', heroLabel: 'animals housed' },
  species: { hero: 'animals', heroLabel: 'animals held' },
}

/**
 * What is worth stating about an entity.
 *
 * The first version of this printed Identifier, Site, Detail and Kind — which for Aquatic Halls
 * reads "aquatic / Aquatic Halls / AQ · 22 enclosures / Site". Three of those four are the
 * heading restated and the fourth is a database slug. Nothing on it helps anyone decide
 * anything, which is the test the brief actually sets.
 *
 * So each kind states the things a reader would ask about it: what a site is for and how much it
 * holds, how many beds a ward has and what it is for, how long a lab department takes to return a
 * result. Where a fact is genuinely just an identifier it is kept last and quiet, because a
 * record still needs to be citable.
 */
function factsFor(entity: Entity, win: Scope['win']): { label: string; value: string; sub?: string }[] {
  switch (entity.kind) {
    case 'site': {
      const site = siteOf(entity.id)
      if (!site) break
      const species = speciesIn(site.key).filter((sp) => stockOfSpecies(sp.id, win) > 0)
      return [
        { label: 'Purpose', value: site.about },
        { label: 'Enclosures', value: fmt(site.enclosures), sub: `code ${site.code}` },
        { label: 'Species held', value: fmt(species.length) },
        { label: 'Hospitals on site', value: fmt(HOSPITALS.filter((h) => h.siteKey === site.key).length) },
        { label: 'Staff based here', value: fmt(usersIn(site.key).length) },
      ]
    }

    case 'hospital': {
      const h = HOSPITALS.find((x) => x.id === entity.id)
      if (!h) break
      const wards = WARDS.filter((w) => w.hospitalId === h.id)
      return [
        { label: 'Beds', value: fmt(h.beds) },
        { label: 'Wards', value: fmt(wards.length), sub: wards.map((w) => w.kind).filter((k, i, a) => a.indexOf(k) === i).join(', ') },
        { label: 'Based at', value: siteOf(h.siteKey)?.name ?? h.siteKey, sub: 'admits from every site' },
        { label: 'Code', value: h.code },
      ]
    }

    case 'ward': {
      const w = WARDS.find((x) => x.id === entity.id)
      if (!w) break
      return [
        { label: 'Purpose', value: w.kind },
        { label: 'Beds', value: fmt(w.beds) },
        { label: 'Hospital', value: HOSPITALS.find((h) => h.id === w.hospitalId)?.name ?? w.hospitalId },
      ]
    }

    case 'labdept': {
      const d = LAB_DEPARTMENTS.find((x) => x.id === entity.id)
      if (!d) break
      return [
        { label: 'Turnaround', value: `${d.turnaround} working days`, sub: 'a sample past this is overdue' },
        { label: 'Laboratory', value: LABS.find((l) => l.id === d.labId)?.name ?? d.labId },
      ]
    }

    case 'medicine': {
      const m = MEDICINES.find((x) => x.id === entity.id)
      if (!m) break
      return [
        { label: 'Category', value: m.category },
        { label: 'Dispensing unit', value: m.unit },
        { label: 'Stocked at', value: `${sitePharmacies().length} site pharmacies`, sub: 'plus the central store' },
      ]
    }

    case 'incubator': {
      const i = INCUBATORS.find((x) => x.id === entity.id)
      if (!i) break
      return [
        { label: 'Set point', value: `${i.tempC} °C` },
        { label: 'Trays', value: fmt(i.trays) },
        { label: 'Nursery', value: NURSERIES.find((n) => n.id === i.nurseryId)?.name ?? i.nurseryId },
      ]
    }

    case 'enclosure': {
      const e = ENCLOSURES.find((x) => x.id === entity.id)
      if (!e) break
      return [
        { label: 'Type', value: e.kind },
        { label: 'Capacity', value: `${fmt(e.capacity)} animals` },
        { label: 'Site', value: siteOf(e.siteKey)?.name ?? e.siteKey },
      ]
    }
  }

  /* Anything without its own set states what it is and where, which is the minimum a record
     needs to be citable. */
  return [
    ...(entity.sub ? [{ label: KIND_ONE[entity.kind], value: entity.sub }] : []),
    ...(entity.siteKey ? [{ label: 'Site', value: siteOf(entity.siteKey)?.name ?? entity.siteKey }] : []),
    { label: 'Reference', value: entity.id },
  ]
}

/* ── the page ────────────────────────────────────────────────────────────── */

export function EntityPage({ ref: entityRef }: { ref: Ref }) {
  const entity = resolve(entityRef.kind, entityRef.id)
  if (!entity) return <NotFound refText={`${entityRef.kind}/${entityRef.id}`} />
  if (entity.kind === 'animal') return <AnimalPage id={entity.id} />
  if (entity.kind === 'species') return <SpeciesPage entity={entity} />
  if (entity.kind === 'user') return <UserPage entity={entity} />
  if (entity.kind === 'department') return <DepartmentPage entity={entity} />
  return <GenericEntityPage entity={entity} />
}

function NotFound({ refText }: { refText: string }) {
  return (
    <Stack>
      <Section icon={MapPin} label="Not found">
        <p className="py-2 text-small" style={{ color: MUTED }}>
          Nothing in the collection matches <span className="tabular-nums">{refText}</span>. The link may be
          from an older version of the data.
        </p>
        <a href="#/" className="mt-3 inline-block text-small font-semibold" style={{ color: ACCENT_INK }}>
          Back to the command centre
        </a>
      </Section>
    </Stack>
  )
}

/**
 * A banner for the case where the entity being viewed sits outside the site filter.
 *
 * This is the one contradiction an entity route can create that a module page cannot: the
 * reader scopes to Carnivore Ridge and then follows a link to a carp. Rather than silently
 * showing Aquatic Halls data under a Carnivore Ridge scope indicator, the page says so and
 * offers the one-tap fix.
 */
function ScopeConflict({ entity }: { entity: Entity }) {
  const { scope, setSite } = useScope()
  if (!scope.site || withinScope(scope, entity)) return null
  const home = entity.siteKey ? siteOf(entity.siteKey) : undefined
  if (!home) return null

  return (
    <div className="px-[var(--gutter)] pb-3">
      <div className="flex items-center gap-2 rounded-[12px] px-3 py-3" style={{ backgroundColor: mix(TONE.warn, 0.1) }}>
        <MapPin size={13} strokeWidth={2} className="shrink-0" style={{ color: TONE.warn }} aria-hidden />
        <span className="min-w-0 flex-1 text-caption font-medium" style={{ color: TONE.warn }}>
          {entity.name} is in {home.name}, but the filter is set to {scope.site.name}. Figures below are
          this entity's own.
        </span>
        <button
          type="button"
          onClick={() => setSite(home)}
          className="shrink-0 rounded-full px-2 py-[3px] text-caption font-semibold"
          style={{ backgroundColor: mix(TONE.warn, 0.18), color: TONE.warn }}
        >
          Follow
        </button>
      </div>
    </div>
  )
}

/**
 * The one-tap offer to narrow the whole product to this entity's site.
 *
 * An entity page is inherently scoped to itself — Aquatic Halls' page shows Aquatic Halls' figures
 * whatever the filter says. That is right, and it leaves a mild contradiction on screen: a heading
 * reading "Aquatic Halls" above a filter pill reading "All sites". Rather than hide the pill or
 * silently change it (which would make navigating to a page mutate global state behind the
 * reader's back), the page offers the move and names what it does.
 */
function FollowScope({ entity }: { entity: Entity }) {
  const { scope, setSite } = useScope()
  const site = entity.siteKey ? siteOf(entity.siteKey) : undefined
  /* Nothing to offer if there is no site, or if the filter is already there. */
  if (!site || scope.site?.key === site.key) return null

  return (
    <div className="px-[var(--gutter)] pb-3">
      <button
        type="button"
        onClick={() => setSite(site)}
        className="card-press flex w-full items-center gap-2 rounded-[12px] bg-white px-3 py-3 text-left"
      >
        <MapPin size={13} strokeWidth={2} className="shrink-0" style={{ color: ACCENT }} aria-hidden />
        <span className="min-w-0 flex-1 text-caption" style={{ color: MUTED }}>
          Figures below are {site.name}'s. Narrow every other page to it as well?
        </span>
        <span className="shrink-0 rounded-full px-3 py-[3px] text-caption font-semibold text-white" style={{ backgroundColor: '#123a2c' }}>
          Scope to site
        </span>
      </button>
    </div>
  )
}

/** Sites, hospitals, wards, labs, pharmacies, nurseries, incubators, enclosures. */
function GenericEntityPage({ entity }: { entity: Entity }) {
  const { scope } = useScope()
  const spec = SPECS[entity.kind] ?? {}
  const siteKey = entity.kind === 'site' ? entity.id : (entity.siteKey ?? null)

  /* The predicate that narrows a flow to this entity. A site narrows through the series
     itself; everything else narrows through the event's own ref. */
  const dimension = spec.records?.by
  const match = useMemo(() => {
    if (!dimension) return undefined
    return (ev: Ev) =>
      (dimension === 'hospital' && ev.hospitalId === entity.id) ||
      (dimension === 'ward' && ev.wardId === entity.id) ||
      (dimension === 'labdept' && ev.labDeptId === entity.id) ||
      (dimension === 'medicine' && ev.medicineId === entity.id) ||
      (dimension === 'nursery' && ev.nurseryId === entity.id) ||
      (dimension === 'incubator' && ev.incubatorId === entity.id)
  }, [dimension, entity.id])

  const heroFigure = useMemo(() => {
    if (!spec.hero) return undefined
    const at = { site: siteKey ? (siteOf(siteKey) ?? null) : null, win: scope.win }

    /* An enclosure's occupancy is its share of its site's population by capacity — the only
       honest split available, and stated as such on the card. */
    if (entity.kind === 'enclosure') {
      const enc = ENCLOSURES.find((e) => e.id === entity.id)
      const all = ENCLOSURES.filter((e) => e.siteKey === entity.siteKey)
      const total = figureOf(at, 'animals').value
      const capacity = all.reduce((n, e) => n + e.capacity, 0) || 1
      return { value: fmt(Math.round((total * (enc?.capacity ?? 0)) / capacity)), unit: undefined }
    }

    /* Everything narrowed by a dimension counts its own events from the tally. */
    if (dimension) return { value: fmt(countOf(spec.hero, siteKey, scope.win, dimension, entity.id)), unit: undefined }

    const f = figureOf(at, spec.hero)
    const metric = METRICS[spec.hero]
    return metric?.kind === 'rate'
      ? { value: `${Math.round(f.percent ?? 0)}`, unit: '%' }
      : { value: fmt(Math.round(f.value)), unit: undefined }
  }, [spec.hero, siteKey, scope.win, dimension, entity])

  const kids = useMemo(() => children(entity, scope.win), [entity, scope.win])

  return (
    <>
      <ScopeConflict entity={entity} />
      <FollowScope entity={entity} />
      {heroFigure && (
        <Hero
          value={heroFigure.value}
          unit={heroFigure.unit}
          label={spec.heroLabel ?? ''}
          sub={`${KIND_ONE[entity.kind]} · ${scope.win.window}`}
          icon={KIND_ICON[entity.kind]}
        />
      )}

      <Stack>
        <Section icon={Layers} label="About">
          <Facts items={factsFor(entity, scope.win)} />
        </Section>

        {spec.metrics && (
          <Section icon={Activity} label="Every metric here" aside={scope.win.window}>
            <MetricStrip slugs={spec.metrics} siteKey={siteKey} />
          </Section>
        )}

        {spec.breakdowns?.map((b) => (
          <Breakdown key={`${b.slug}-${b.by}`} slug={b.slug} by={b.by} label={b.label} siteKey={siteKey} />
        ))}

        {kids.map((group) => (
          <Section
            key={group.kind}
            icon={KIND_ICON[group.kind]}
            label={group.label}
            aside={`${group.total ?? group.items.length}`}
          >
            <ChildList group={group} win={scope.win} />
          </Section>
        ))}

        {spec.records && (
          <Section icon={FileText} label="Records" aside={scope.win.window}>
            <RecordList
              slug={spec.records.slug}
              siteKey={siteKey}
              match={match}
              noun={METRICS[spec.records.slug]?.unit ?? 'records'}
            />
          </Section>
        )}
      </Stack>
    </>
  )
}

/** A child group, paged so a site's ninety-seven species do not all render at once. */
function ChildList({ group, win }: { group: ReturnType<typeof children>[number]; win: Scope['win'] }) {
  const paged = usePaged(
    (offset, limit) => ({ rows: group.items.slice(offset, offset + limit), total: group.items.length }),
    12,
    [group.kind, group.items.length, win.from, win.to],
  )

  return (
    <>
      <ul className="flex flex-col">
        {paged.rows.map((child) => (
          <EntityRow
            key={child.id}
            entity={child}
            value={
              child.kind === 'species' ? fmt(stockOfSpecies(child.id, win)) : undefined
            }
          />
        ))}
      </ul>
      <MoreRows page={paged} noun={group.label.toLowerCase()} />
    </>
  )
}

type Scope = ReturnType<typeof useScope>['scope']

function Breakdown({ slug, by, label, siteKey }: { slug: string; by: Dimension; label: string; siteKey: string | null }) {
  const { scope } = useScope()
  const rows = useMemo(
    () => byDimension({ site: siteKey ? (siteOf(siteKey) ?? null) : null, win: scope.win }, slug, by).slice(0, 8),
    [slug, by, siteKey, scope.win],
  )
  const total = rows.reduce((n, r) => n + r.value, 0)
  if (rows.length === 0) return null
  return (
    <Section icon={Layers} label={label} aside={`${rows.length}`}>
      <RankList
        rank={false}
        items={rows.map((r) => ({
          key: r.label,
          title: r.label,
          value: fmt(r.value),
          share: total ? (r.value / total) * 100 : 0,
        }))}
      />
    </Section>
  )
}

/* ── the entity tab strip, shared ────────────────────────────────────────── */

/**
 * EXTRACTED RATHER THAN COPIED. Two entity pages now carry tabs, and a second copy of this
 * markup is how the two drift into looking like different controls. Scrolls rather than wraps
 * for the reason the animal's nine tabs established: a wrapped second row of tabs reads as a
 * second, different control rather than as more of the same one.
 */
function EntityTabs({
  tabs,
  tab,
  onPick,
  label,
}: {
  tabs: readonly { key: string; label: string; icon: LucideIcon }[]
  tab: string
  onPick: (key: string) => void
  label: string
}) {
  return (
    <div className="px-[var(--gutter)] pb-3">
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-hidden"
        role="tablist"
        aria-label={label}
      >
        {tabs.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onPick(t.key)}
              className={`card-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-[7px] text-caption font-medium whitespace-nowrap transition-colors ${
                on ? 'bg-[#123a2c] text-white' : 'bg-white text-[#3d3a34]'
              }`}
            >
              <t.icon size={13} strokeWidth={2} style={{ color: on ? '#8fd6ae' : ACCENT }} aria-hidden />
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── species ─────────────────────────────────────────────────────────────── */

/**
 * A species page — the level between a site and an animal.
 *
 * THREE TABS, NOT ONE SCROLL. This page used to stack sex, mortality events and the animal
 * list into one column, which made the animal list — 12,400 rows for a carp — the thing a
 * reader had to scroll past to reach anything else. The three tabs are the three questions a
 * species is actually asked: what is it, how did its population move, and which animals are
 * they. Tabs rather than routes for the reason the animal page states: switching tab is not
 * going somewhere, and should not cost a history entry or a scroll position.
 *
 * The animals list is PAGED rather than capped. The old drill took the first forty and printed
 * a note explaining why; forty of 12,400 carp is not a sample anyone can reason about, and the
 * note did not make it one.
 */
const SPECIES_TABS = [
  { key: 'overview', label: 'Overview', icon: Layers },
  { key: 'profile', label: 'Profile', icon: BookOpen },
  { key: 'life', label: 'Circle of Life', icon: Sparkles },
  { key: 'animals', label: 'Animals', icon: Heart },
] as const

function SpeciesPage({ entity }: { entity: Entity }) {
  const { scope } = useScope()
  const sp = speciesOf(entity.id)
  const [tab, setTab] = useState<string>('overview')
  const total = stockOfSpecies(entity.id, scope.win)

  /**
   * The reference biology, fetched on demand.
   *
   * NOT AT BOOT, and not through `core/query.ts`. It is 5.3 MB that only this tab can show,
   * and it is unscoped — see the note at the top of `core/profiles.ts` for why that is what
   * makes an await safe here when it is forbidden for every figure beside it.
   */
  const [profiles, setProfiles] = useState(profilesNow)
  const [profileFailed, setProfileFailed] = useState(false)
  useEffect(() => {
    if (profiles) return
    let live = true
    loadProfiles().then(
      (p) => live && setProfiles(p),
      () => live && setProfileFailed(true),
    )
    return () => {
      live = false
    }
  }, [profiles])
  const profile = useMemo(() => profileOf(entity.id, profiles), [entity.id, profiles])

  const split = useMemo(() => (sp ? sexSplit([{ species: sp, count: total }]) : undefined), [sp, total])
  const life = useMemo(() => speciesLifecycle(entity.id, scope.win), [entity.id, scope.win])
  const standing = useMemo(() => (sp ? standingOf(sp.name) : undefined), [sp])

  const paged = usePaged<Animal>(
    (offset, limit) => {
      const p = animalsOfSpecies(entity.id, scope.win, offset, limit)
      return { rows: p.rows, total: p.total }
    },
    20,
    [entity.id, scope.win.to],
  )

  const events = useMemo(
    () =>
      sp
        ? pageWhere('mortality', sp.siteKey, scope.win, (ev) => ev.speciesId === entity.id, 0, 8)
        : undefined,
    [sp, entity.id, scope.win],
  )

  /* The recorded flows and the two level readings are separate statements about the same
     window, and they are allowed to disagree — the extract's events do not fully account for
     every change in the register. Stating both, and naming the gap where there is one, is the
     honest form; reconciling them silently would be the invented figure. */
  const recorded = life ? life.additions - life.removals : 0
  const unexplained = life ? life.net - recorded : 0

  return (
    <>
      <ScopeConflict entity={entity} />
      <Hero
        value={fmt(total)}
        label={`${entity.name} held`}
        sub={`${sp?.cls} · ${siteOf(sp?.siteKey ?? '')?.name} · ${scope.win.window}`}
        icon={PawPrint}
      />

      <EntityTabs tabs={SPECIES_TABS} tab={tab} onPick={setTab} label="Species record" />

      <Stack>
        {tab === 'overview' && (
          <>
            {split && (
              <Section icon={Layers} label="Sex" aside="counted from the register">
                <SplitRing
                  label="Animals"
                  unit="animals"
                  items={[
                    { key: 'u', label: 'Undetermined', value: split.undetermined },
                    { key: 'm', label: 'Male', value: split.male },
                    { key: 'f', label: 'Female', value: split.female },
                  ]}
                />
              </Section>
            )}

            <Section icon={ShieldCheck} label="Standing" aside="published">
              <Facts
                items={[
                  { label: 'Class', value: sp?.cls ?? '—' },
                  { label: 'Site', value: siteOf(sp?.siteKey ?? '')?.name ?? '—' },
                  { label: 'IUCN Red List', value: standing?.iucn ?? '—' },
                  {
                    label: 'CITES',
                    value: standing?.cites ? `Appendix ${standing.cites}` : 'Not listed',
                  },
                  /* The schema carries no Wildlife Protection Act column, so this says so
                     rather than printing a zero or an unearned "Not scheduled". */
                  {
                    label: 'WPA schedule',
                    value: standing?.schedule ? `Schedule ${standing.schedule}` : 'Not recorded',
                  },
                ]}
              />
            </Section>
          </>
        )}

        {/* NO WINDOW PILL AND NO SCOPE NOTE ON THIS TAB. Everything on it is a property of the
            species rather than a reading of our collection, so it does not move when the date
            filter or the site does — and a card that ignores the filter sitting under a header
            that states one is the contradiction this product exists to avoid. */}
        {tab === 'profile' &&
          (profileFailed ? (
            <Section icon={BookOpen} label="Profile">
              <p className="text-small text-[#6d6860]">
                The species reference could not be loaded. Every other tab on this page is
                unaffected — they read the collection, not the reference.
              </p>
            </Section>
          ) : profiles ? (
            <SpeciesProfileTab p={profile} />
          ) : (
            <Section icon={BookOpen} label="Profile">
              <p className="text-small text-[#6d6860]">Loading the species reference…</p>
            </Section>
          ))}

        {tab === 'life' && life && (
          <>
            {/* §14's requirement, as the direction mark rather than six unrelated cards: what
                entered, what left, and the net between them, with each flow named below. */}
            <Section icon={Sparkles} label="Circle of Life" aside={scope.win.window}>
              <FlowSplit
                inward={{ label: 'Entered', value: life.additions, icon: Baby }}
                outward={{ label: 'Left', value: life.removals, icon: ArrowLeftRight }}
                net={recorded}
                routes={life.stages
                  .filter((s) => s.side !== 'stock')
                  .map((s) => ({
                    key: s.key,
                    label: s.label,
                    value: s.value,
                    direction: s.side === 'in' ? ('in' as const) : ('out' as const),
                  }))}
                unit="animals"
              />
              {life.silent.length > 0 && (
                <p className="mt-3 text-caption" style={{ color: FAINT }}>
                  No {life.silent.map((s) => s.toLowerCase()).join(', ')} recorded in {scope.win.window}.
                </p>
              )}
            </Section>

            <Section icon={Activity} label="Population change" aside={scope.win.window}>
              <Facts
                items={[
                  { label: 'Opening', value: fmt(life.opening), sub: 'the day before the window' },
                  { label: 'Closing', value: fmt(life.closing), sub: 'as of the window’s last day' },
                  {
                    label: 'Change',
                    value: `${life.net > 0 ? '+' : ''}${fmt(life.net)}`,
                    tone: life.net === 0 ? 'neutral' : life.net > 0 ? 'good' : 'bad',
                  },
                  ...(unexplained !== 0
                    ? [
                        {
                          label: 'Not explained by events',
                          value: `${unexplained > 0 ? '+' : ''}${fmt(unexplained)}`,
                          sub: 'the register moved by more than the recorded flows',
                        },
                      ]
                    : []),
                  ...(life.fetal > 0
                    ? [
                        {
                          label: 'Fetal loss',
                          value: fmt(life.fetal),
                          sub: 'a breeding figure, not a headcount movement',
                        },
                      ]
                    : []),
                ]}
              />
            </Section>

            <Section icon={Skull} label="Deaths" aside={scope.win.window}>
              {events && events.total > 0 ? (
                <ul className="flex flex-col">
                  {events.rows.map((ev) => (
                    <li key={ev.id} className="flex items-center gap-3 border-b border-[#f0efec] py-3 last:border-0">
                      <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">{ev.detail}</span>
                      <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
                        {shortDate(ev.day)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-caption" style={{ color: FAINT }}>
                  No deaths recorded in {scope.win.window}.
                </p>
              )}
            </Section>
          </>
        )}

        {tab === 'animals' && (
          <Section icon={Heart} label="Animals" aside={fmt(paged.total)}>
            <ul className="flex flex-col">
              {paged.rows.map((a) => (
                <AnimalRow key={a.id} animal={a} />
              ))}
            </ul>
            <MoreRows page={paged} noun="animals" />
          </Section>
        )}
      </Stack>
    </>
  )
}

function AnimalRow({ animal }: { animal: Animal }) {
  const { href } = useScope()
  const tone: keyof typeof TONE =
    animal.status === 'Critical' ? 'bad' : animal.status === 'Healthy' ? 'good' : 'warn'
  return (
    <li className="border-b border-[#f0efec] last:border-0">
      <a
        href={href(`e/animal/${animal.id}`)}
        className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small text-[#1c1a16]">
            {animal.callName ?? animal.id}
          </span>
          <span className="mt-1 block truncate text-caption" style={{ color: FAINT }}>
            {animal.sex} · {animal.age} · {animal.enclosureId}
          </span>
        </span>
        <span className="shrink-0 text-caption font-medium" style={{ color: TONE[tone] }}>
          {animal.status}
        </span>
        <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
      </a>
    </li>
  )
}

/* ── the animal, and its cross-navigation ────────────────────────────────── */

/**
 * THE CROSS-NAVIGATION REQUIREMENT LANDS HERE.
 *
 * The brief is explicit: from an animal a reader reaches Overview, Health, Vaccination, Lab,
 * Medication, Transfers, Breeding, Mortality and Documents, and "should never have to search
 * for the same animal again". The old drill said the opposite in as many words — "the bottom of
 * the drill, and no link out of it except back" — on the reasoning that anything below an
 * animal is a working screen rather than an executive one.
 *
 * That reasoning holds for *drilling further down* and not for *moving sideways*. These nine
 * tabs are the same animal from nine angles, not nine levels below it, so none of them makes
 * the drill deeper. They are tabs rather than routes for the same reason: switching tab is not
 * going somewhere, and it should not cost a history entry or a scroll position.
 *
 * Each tab reads the animal's real events from the metric that owns them, so a tab with nothing
 * in it says so rather than being hidden — an empty Lab tab is information about the animal.
 */
const TABS: { key: string; label: string; icon: LucideIcon; metrics: string[] }[] = [
  { key: 'overview', label: 'Overview', icon: Layers, metrics: [] },
  { key: 'health', label: 'Health', icon: HeartPulse, metrics: ['admissions'] },
  { key: 'vaccination', label: 'Vaccination', icon: Syringe, metrics: ['vaccination', 'deworming'] },
  { key: 'lab', label: 'Lab', icon: FlaskConical, metrics: ['lab'] },
  { key: 'medication', label: 'Medication', icon: Pill, metrics: ['pharmacy'] },
  { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight, metrics: ['transfers', 'accession'] },
  { key: 'breeding', label: 'Breeding', icon: Sparkles, metrics: ['births', 'eggs', 'hatched'] },
  { key: 'mortality', label: 'Mortality', icon: Skull, metrics: ['mortality', 'fetal'] },
  { key: 'documents', label: 'Documents', icon: FileText, metrics: [] },
]

function AnimalPage({ id }: { id: string }) {
  const { href } = useScope()
  const [tab, setTab] = useState('overview')
  const animal = animalById(id)

  if (!animal) return <NotFound refText={id} />

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const entity = resolve('animal', id)!

  return (
    <>
      <ScopeConflict entity={entity} />
      <Hero
        value={animal.callName ?? animal.speciesName}
        label={`${animal.id} · ${animal.enclosureId}`}
        sub={`${animal.speciesName} · ${animal.siteName} · ${animal.status}`}
        icon={Heart}
        tone={animal.status === 'Critical' ? 'bad' : animal.status === 'Healthy' ? 'good' : 'warn'}
      />

      <EntityTabs tabs={TABS} tab={tab} onPick={setTab} label="Animal record" />

      <Stack>
        {tab === 'overview' && (
          <>
            <Section icon={Layers} label="Identity">
              <Facts
                items={[
                  { label: 'Accession', value: animal.accession },
                  { label: 'Species', value: animal.speciesName, sub: animal.cls },
                  { label: 'Sex', value: animal.sex === 'M' ? 'Male' : animal.sex === 'F' ? 'Female' : 'Undetermined' },
                  { label: 'Age', value: animal.age, sub: `born ${longDate(animal.bornOn)}` },
                  { label: 'Weight', value: animal.weight },
                  { label: 'Origin', value: animal.origin },
                ]}
              />
            </Section>
            <Section icon={MapPin} label="Where">
              <ul className="flex flex-col">
                {[resolve('site', animal.siteKey), resolve('species', animal.speciesId), resolve('enclosure', animal.enclosureId)]
                  .filter((e): e is Entity => Boolean(e))
                  .map((e) => (
                    <EntityRow key={`${e.kind}-${e.id}`} entity={e} />
                  ))}
              </ul>
            </Section>
            <Section icon={Activity} label="Care status">
              <Facts
                items={[
                  { label: 'Status', value: animal.status },
                  { label: 'Last examined', value: `${shortDate(animal.lastExam)} · ${ago(animal.lastExam)}` },
                  { label: 'Vaccination', value: animal.vaccinated ? 'Current' : 'Due', tone: animal.vaccinated ? 'good' : 'warn' },
                  { label: 'Deworming', value: animal.dewormed ? 'Current' : 'Due', tone: animal.dewormed ? 'good' : 'warn' },
                  { label: 'Welfare score', value: `${animal.welfare} / 5` },
                ]}
              />
            </Section>
          </>
        )}

        {tab === 'documents' && (
          <Section icon={FileText} label="Documents">
            {/* Stated, not faked. There is no document store behind this prototype, and
                inventing six PDF rows would be the one kind of content this data model has
                been built specifically to avoid. */}
            <p className="py-2 text-caption" style={{ color: FAINT }}>
              No document store is connected. Accession paperwork, necropsy reports and transfer
              permits would appear here.
            </p>
          </Section>
        )}

        {active.metrics.length > 0 && <AnimalTab animal={animal} tab={active} />}
      </Stack>
      <p className="px-[var(--gutter)] pt-1 pb-2 text-center text-caption" style={{ color: FAINT }}>
        <a href={href(`e/species/${animal.speciesId}`)} className="font-medium underline">
          All {animal.speciesName}
        </a>
      </p>
    </>
  )
}

/**
 * One cross-navigation tab's content — this animal's events from the metrics that tab covers.
 *
 * Scanned over the window in force rather than all time, so the tab answers "what happened to
 * this animal in the period I am looking at" — the same question the rest of the screen is
 * answering. An empty tab states the window, so the reader knows to widen it rather than
 * concluding nothing ever happened.
 */
function AnimalTab({ animal, tab }: { animal: Animal; tab: (typeof TABS)[number] }) {
  const { scope } = useScope()
  const events = useMemo(
    () => eventsForAnimal(animal, scope.win, tab.metrics).slice(0, 30),
    [animal, scope.win, tab.metrics],
  )

  return (
    <Section icon={tab.icon} label={tab.label} aside={events.length ? `${events.length}` : undefined}>
      {events.length === 0 ? (
        <p className="py-2 text-caption" style={{ color: FAINT }}>
          Nothing recorded for {animal.callName ?? animal.id} in {scope.win.window}. Widen the date
          range to look further back.
        </p>
      ) : (
        <ul className="flex flex-col">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-3 border-b border-[#f0efec] py-3 last:border-0">
              <span className="min-w-0 flex-1">
                <span className="block text-small text-[#1c1a16]">{ev.detail}</span>
                <span className="mt-1 block text-caption" style={{ color: FAINT }}>
                  {LABELS[ev.kind] ?? ev.kind} · {longDate(ev.day)}
                </span>
              </span>
              <span
                className="shrink-0 text-caption font-medium tabular-nums"
                style={{ color: ev.tone && ev.tone !== 'neutral' ? TONE[ev.tone] : MUTED }}
              >
                {ago(ev.day)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

/* ── people ──────────────────────────────────────────────────────────────── */

function DepartmentPage({ entity }: { entity: Entity }) {
  const { scope } = useScope()
  const staff = useMemo(() => usersIn(siteKeyOf(scope) ?? undefined, entity.id), [scope, entity.id])
  const active = staff.filter((u) => u.status === 'active').length

  const paged = usePaged(
    (offset, limit) => ({ rows: staff.slice(offset, offset + limit), total: staff.length }),
    20,
    [entity.id, staff.length],
  )

  return (
    <>
      <Hero
        value={fmt(staff.length)}
        label="staff accounts"
        sub={`${active} active in the last 30 days · ${scope.site?.name ?? 'all sites'}`}
        icon={UsersIcon}
      />
      <Stack>
        <Section icon={UsersIcon} label="Adoption">
          <SplitRing
            label="Accounts"
            unit="accounts"
            items={[
              { key: 'active', label: 'Active', value: active, meta: 'Signed in within 30 days' },
              { key: 'dormant', label: 'Dormant', value: staff.filter((u) => u.status === 'dormant').length },
              { key: 'never', label: 'Never signed in', value: staff.filter((u) => u.status === 'never').length },
            ]}
          />
        </Section>
        <Section icon={UsersIcon} label="Staff" aside={fmt(staff.length)}>
          <ul className="flex flex-col">
            {paged.rows.map((u) => {
              const e = resolve('user', u.id)
              return e ? <EntityRow key={u.id} entity={e} value={u.lastActive === null ? '—' : ago(u.lastActive)} /> : null
            })}
          </ul>
          <MoreRows page={paged} noun="staff" />
        </Section>
      </Stack>
    </>
  )
}

/**
 * A staff account's site.
 *
 * `users.site_access` is a semicolon-separated list and is empty on 84 of the 529 accounts, so
 * a user genuinely may not have one. Stated rather than blanked — an empty cell reads as a
 * rendering fault, "No site assigned" reads as the fact it is.
 */
const siteLabel = (key: string | null): string =>
  key ? (siteOf(key)?.name ?? key) : 'No site assigned'

function UserPage({ entity }: { entity: Entity }) {
  const user = USERS.find((u) => u.id === entity.id)
  if (!user) return <NotFound refText={entity.id} />
  const dept = departmentOf(user.departmentId)

  return (
    <>
      <ScopeConflict entity={entity} />
      <Hero
        value={user.name}
        label={user.role}
        sub={`${dept?.name ?? user.departmentId} · ${siteLabel(user.siteKey)}`}
        icon={UsersIcon}
        tone={user.status === 'active' ? 'good' : user.status === 'never' ? 'bad' : 'warn'}
      />
      <Stack>
        <Section icon={Layers} label="Account">
          <Facts
            items={[
              { label: 'User ID', value: user.id },
              { label: 'Role', value: user.role },
              { label: 'Department', value: dept?.name ?? user.departmentId },
              { label: 'Site', value: siteLabel(user.siteKey) },
              {
                label: 'Last signed in',
                value: user.lastActive === null ? 'Never' : `${longDate(user.lastActive)} · ${ago(user.lastActive)}`,
                tone: user.status === 'active' ? 'good' : user.status === 'never' ? 'bad' : 'warn',
              },
              { label: 'Sessions · 90 days', value: fmt(user.sessions90) },
            ]}
          />
        </Section>
        <Section icon={MapPin} label="Belongs to">
          <ul className="flex flex-col">
            {[resolve('department', user.departmentId), user.siteKey ? resolve('site', user.siteKey) : undefined]
              .filter((e): e is Entity => Boolean(e))
              .map((e) => (
                <EntityRow key={`${e.kind}-${e.id}`} entity={e} />
              ))}
          </ul>
        </Section>
      </Stack>
    </>
  )
}

/* ── the index ───────────────────────────────────────────────────────────── */

/**
 * The entity browser — every kind, with counts, honouring the site filter.
 *
 * Its existence is the point of the requirement: the product now has a way in that is not a
 * module. A director looking for "the quarantine block" does not have to know which module
 * mentions it.
 */
export function EntityIndex() {
  const { scope, href } = useScope()

  const groups = useMemo(() => {
    const key = siteKeyOf(scope)
    return [
      { label: 'Places', kinds: ['site', 'enclosure'] as EntityKind[] },
      { label: 'The collection', kinds: ['species', 'animal'] as EntityKind[] },
      { label: 'Clinical', kinds: ['hospital', 'ward', 'lab', 'labdept'] as EntityKind[] },
      { label: 'Supply', kinds: ['pharmacy', 'medicine'] as EntityKind[] },
      { label: 'Breeding', kinds: ['nursery', 'incubator'] as EntityKind[] },
      { label: 'People', kinds: ['department', 'user'] as EntityKind[] },
    ].map((g) => ({
      ...g,
      rows: g.kinds.map((kind) => ({
        kind,
        count:
          kind === 'animal'
            ? population(scope).reduce((n, r) => n + r.count, 0)
            : listCount(kind, key),
      })),
    }))
  }, [scope])

  return (
    <Stack>
      {groups.map((g) => (
        <Section key={g.label} icon={Boxes} label={g.label}>
          <ul className="flex flex-col">
            {g.rows.map((r) => {
              const Glyph = KIND_ICON[r.kind]
              return (
                <li key={r.kind} className="border-b border-[#f0efec] last:border-0">
                  <a
                    href={href(`browse/${r.kind}`)}
                    className="card-press -mx-2 flex items-center gap-3 rounded-[10px] px-2 py-3"
                  >
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-[9px]"
                      style={{ backgroundColor: mix(ACCENT, 0.1) }}
                      aria-hidden
                    >
                      <Glyph size={14} strokeWidth={1.75} style={{ color: ACCENT }} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-small text-[#1c1a16]">
                      {KIND_LABEL_PLURAL[r.kind]}
                    </span>
                    <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: MUTED }}>
                      {fmt(r.count)}
                    </span>
                    <ChevronRight size={13} strokeWidth={2.25} className="shrink-0" style={{ color: ACCENT_INK }} aria-hidden />
                  </a>
                </li>
              )
            })}
          </ul>
        </Section>
      ))}
    </Stack>
  )
}

const KIND_LABEL_PLURAL: Record<EntityKind, string> = {
  site: 'Sites',
  species: 'Species',
  animal: 'Animals',
  enclosure: 'Enclosures',
  hospital: 'Hospitals',
  ward: 'Wards',
  lab: 'Laboratories',
  labdept: 'Lab departments',
  pharmacy: 'Pharmacies',
  medicine: 'Medicines',
  nursery: 'Nurseries',
  incubator: 'Incubators',
  department: 'Departments',
  user: 'Users',
}

/* Counted through the registry, so it stays the one place that knows what belongs to a site. */
const listCount = (kind: EntityKind, siteKey: string | null): number => listOf(kind, siteKey).length

/* ── browsing one kind ───────────────────────────────────────────────────── */

/** Every entity of one kind, paged and searchable. Reached from the index. */
export function EntityBrowser({ kind }: { kind: EntityKind }) {
  const { scope } = useScope()
  const [query, setQuery] = useState('')

  const all = useMemo(() => {
    if (kind === 'animal') return [] as Entity[]
    const q = query.trim().toLowerCase()
    const rows = listOf(kind, siteKeyOf(scope))
    return q ? rows.filter((e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) : rows
  }, [kind, scope, query])

  const animals = usePaged<Animal>(
    (offset, limit) => {
      if (kind !== 'animal') return { rows: [], total: 0 }
      const p = population(scope)
      const total = p.reduce((n, r) => n + r.count, 0)
      /* Walk the species in order and take the slice that falls in this page. */
      const rows: Animal[] = []
      let seen = 0
      for (const { species, count } of p) {
        if (rows.length >= limit) break
        if (seen + count <= offset) {
          seen += count
          continue
        }
        const start = Math.max(0, offset - seen)
        const take = Math.min(limit - rows.length, count - start)
        rows.push(...animalsOfSpecies(species.id, scope.win, start, take).rows)
        seen += count
      }
      return { rows, total }
    },
    20,
    [kind, scope.win.to, scope.site?.key],
  )

  const paged = usePaged<Entity>(
    (offset, limit) => ({ rows: all.slice(offset, offset + limit), total: all.length }),
    20,
    [kind, all.length],
  )

  return (
    <Stack>
      <Section
        icon={KIND_ICON[kind]}
        label={KIND_LABEL_PLURAL[kind]}
        aside={fmt(kind === 'animal' ? animals.total : all.length)}
      >
        {kind !== 'animal' && (
          <label className="mb-3 flex items-center gap-2 rounded-full bg-[#f7f6f3] px-3 py-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Find a ${KIND_ONE[kind].toLowerCase()}`}
              aria-label={`Find a ${KIND_ONE[kind]}`}
              className="min-w-0 flex-1 bg-transparent text-small text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
            />
          </label>
        )}

        {kind === 'animal' ? (
          <>
            <ul className="flex flex-col">
              {animals.rows.map((a) => (
                <AnimalRow key={a.id} animal={a} />
              ))}
            </ul>
            <MoreRows page={animals} noun="animals" />
          </>
        ) : paged.total === 0 ? (
          <p className="py-2 text-caption" style={{ color: FAINT }}>
            Nothing matches{query ? ` “${query.trim()}”` : ''} in {scope.site?.name ?? 'the collection'}.
          </p>
        ) : (
          <>
            <ul className="flex flex-col">
              {paged.rows.map((e) => (
                <EntityRow key={`${e.kind}-${e.id}`} entity={e} />
              ))}
            </ul>
            <MoreRows page={paged} noun={KIND_LABEL_PLURAL[kind].toLowerCase()} />
          </>
        )}
      </Section>
    </Stack>
  )
}

