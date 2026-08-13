/**
 * EGGS & INCUBATION — the requested tab, built out of the only things the extract actually holds.
 *
 * WHAT WAS ASKED FOR AND WHY ALMOST NONE OF IT COULD BE DRAWN. The reference design opens with
 * four figures — Hatched, Fertility, Females laid, Died developing — then a month-by-month
 * Laid → Fertile → Hatched chart, a "why eggs were discarded" breakdown, a per-female table of
 * clutches, eggs, hatch rate and last season's comparison, and tabs partitioning the females into
 * laid-nothing, one clutch and two-or-more. Regexing egg|clutch|hatch|incubat|fertil|candl|nest|
 * brood|lay|female across all 520 column definitions in all 24 CREATE TABLE statements of the
 * dump returns five columns, and every one of them is on the `species` REFERENCE table:
 * female_count, h_females, incubation_days, clutch_litter_size and birth_egg_weight_g. There is
 * no egg row, no clutch row, no incubation run, no candling result and no laying event anywhere.
 * The 1,112 occurrences of "Hatch" in the file are 698 `species.baby_name` = "Hatchling", 403 the
 * species name "Hatchetfish" and 11 inside `reproduction_type` strings such as "Ovoviviparous
 * (Eggs Hatch Inside)". Not one of them is an event. `report_births` carries no mother, father,
 * sire or dam column either, so the female behind a young animal is unrecoverable and the
 * per-female table has no key to be built on, let alone a clutch count to put in it.
 *
 * SO EACH REQUESTED SLOT IS EITHER FILLED WITH THE REAL FIGURE OR DROPPED — never zeroed, never
 * dashed, never proxied. The top strip carries the counts this collection genuinely made; the
 * four requested stats leave no empty tiles behind them because a tile reading "Fertility 0%" is
 * a stated figure that is wrong, and "Fertility —" says we looked at our own records and found
 * nothing when what happened is that nothing was ever recordable. A funnel with two of its three
 * bands missing is not a funnel with a gap — it is one number drawn in a shape claiming two more —
 * so the chart is a single band of recorded young, and it says so in its own caption. The table
 * slot holds the one table this data supports, which is per SITE rather than per female.
 *
 * THE TWO KINDS OF FACT ARE KEPT APART, AND THAT IS THE OTHER HALF OF THE DESIGN. Incubation
 * length, clutch size and egg mass are columns of the `species` reference table: true of the
 * animal in a textbook, identical at every site, unmoved by the date filter. Everything else here
 * is OUR register, scoped and windowed. A reader who confuses the two has been told we incubated
 * something, so the reference band names its kind in its own note and the closing panel names it
 * once more, because that is the card a sceptical reader arrives at.
 *
 * WHY "YOUNG RECORDED" AND NEVER "HATCHED". `report_births` records the registration of an
 * animal. Nothing in the extract says an egg preceded any particular one of them, which day it
 * was set down, or whether we incubated it at all. Calling the figure a hatch count would be
 * inventing the step before it.
 *
 * THE ABSENCES ARE READ FROM `core/metrics.ts`'s `UNSOURCED` RATHER THAN WRITTEN HERE. That is
 * the same object `core/checks.ts` asserts against at boot, so a slug which later acquires a real
 * metric fails the boot as a stale entry and this panel stops claiming a gap that has been
 * filled. A hand-written sentence about missing eggs would outlive the missing eggs.
 */

import { useMemo } from 'react'
import { Baby, CalendarDays, Egg, Feather, Heart, ListTree, MapPin, ScrollText } from 'lucide-react'
import { TODAY, buckets, longDate, shortDate, type Win } from '../core/calendar'
import { count, eventAt, type Ev } from '../core/events'
import { METRICS, UNSOURCED } from '../core/metrics'
import type { SpeciesProfile } from '../core/profiles'
import { UNRESOLVED, flowOf } from '../core/store'
import { SPECIES, siteOf } from '../core/world'
import { EventTrend, type Pt } from '../exec/marks'
import { FAINT, INK, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'
import { Band, DataTable, DefinitionList, MetricStrip, NotePanel, TabBody, type Column } from './speciesLayout'

/* ── the gate ────────────────────────────────────────────────────────────── */

/**
 * Whether this species lays eggs at all — the test a tab strip should gate on.
 *
 * THE PRESENCE OF A TAB IS ITSELF A CLAIM. A placental mammal offered an "Eggs & Incubation"
 * tab has been told it lays. Measured over the 2,447 species in `profiles.json`: 1,696 read
 * "Oviparous …", 473 "Viviparous …", 170 one of the ovoviviparous or "Varies" strings, and 108
 * carry no `reproduction_type` at all. Absent is a FOURTH answer, not a fifth reading of one of
 * the others, so it returns false — the tab is withheld where the source does not say.
 *
 * Exported for the caller rather than applied here, because the profile resolves lazily — a tab
 * shown while `profiles.json` is in flight and withdrawn when it lands would flicker on 473
 * species. The right shape is absent until known, which only the tab strip can arrange.
 */
export const laysEggs = (p?: SpeciesProfile): boolean => !!p?.reproduction_type?.startsWith('Oviparous')

/**
 * WHICH OF FOUR REPRODUCTIVE SHAPES THIS SPECIES IS, from the verbatim source string.
 *
 * `retained` is the case that is easy to get wrong. 170 species read "Ovoviviparous /
 * Viviparous (Varies by Species)", "Ovoviviparous (Eggs Hatch Inside)" or "Varies (Eggs or
 * Internal Hatch)": their eggs are retained and hatch internally, so there is no clutch we
 * could hold and no incubation we could run, and only 32 of the 170 carry an `incubation_days`
 * at all. They are neither an egg-layer nor a live-bearer and must not be filed as either.
 *
 * `unknown` is the case that is easy to skip, and it is 108 species. It must NOT fall through
 * to the egg-laying branch: labelling `birth_egg_weight_g` "Egg weight" for a species whose
 * reproduction the source never recorded states that it lays. It gets the column's own neutral
 * name instead, which is all that can be said.
 *
 * KEPT DESPITE THE GATE ABOVE, and deliberately. `laysEggs` currently admits only the oviparous,
 * so `live`, `retained` and `unknown` are unreachable from `entity.tsx` today — but the gate and
 * the shape answer different questions, and collapsing them would mean that the day a caller
 * widens the gate by one string this tab starts printing "Egg weight" over a gestating mammal.
 */
type Shape = 'egg' | 'live' | 'retained' | 'unknown'

function shapeOf(p?: SpeciesProfile): Shape {
  const t = p?.reproduction_type
  if (!t) return 'unknown'
  if (t.startsWith('Oviparous')) return 'egg'
  if (t.startsWith('Viviparous')) return 'live'
  return 'retained'
}

/* ── formatting, which is units and nothing else ─────────────────────────── */

/* DUPLICATED FROM `speciesProfile.tsx` ON PURPOSE. Those helpers are file-private there and this
   pass edits one file rather than two. They are four lines each and identical, so a species
   reading "24 days" on one tab reads "24 days" on the other. */

const num = (v?: string): number | undefined => {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Grams under a kilo, kilograms above it. 70 g and 1.5 kg, never 0.07 kg or 1500 g. */
const mass = (v?: string): string | undefined => {
  const n = num(v)
  if (n === undefined) return undefined
  return n >= 1000
    ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} kg`
    : `${n < 10 ? n.toFixed(2).replace(/0$/, '') : Math.round(n)} g`
}

const days = (v?: string): string | undefined => {
  const n = num(v)
  return n === undefined ? undefined : `${Math.round(n)} day${Math.round(n) === 1 ? '' : 's'}`
}

const years = (v?: string): string | undefined => {
  const n = num(v)
  return n === undefined ? undefined : `${n % 1 === 0 ? n : n.toFixed(1)} yrs`
}

/**
 * A count-like reference figure, suppressed at zero as well as at absent.
 *
 * EXACTLY ONE OVIPAROUS SPECIES CARRIES `clutch_litter_size = 0.0`, which is the extract saying
 * it has no figure rather than saying the bird lays nothing. Printed as "Clutch size 0" it
 * would be a stated figure that is wrong, which is the one thing this product may not do.
 */
const positive = (v?: string): string | undefined => {
  const n = num(v)
  if (n === undefined || n <= 0) return undefined
  return String(n % 1 === 0 ? n : Number(n.toFixed(2)))
}

interface Row {
  label: string
  value: string
  sub?: string
}

/** A row only if the extract has one. `undefined` in, nothing out. */
const row = (label: string, value: string | undefined, sub?: string): Row[] =>
  value ? [{ label, value, sub }] : []

/* ── the recorded half · one integer walk over the births flow ───────────── */

interface BirthRef {
  siteKey: string
  day: number
  /** The row's index within its own (site, day), which is what `eventAt` addresses by. */
  i: number
}

interface SiteRow {
  siteKey: string
  siteName: string
  value: number
}

interface Recorded {
  total: number
  sites: SiteRow[]
  points: Pt[]
  /** Newest first, so the record list is a slice rather than a sort per page. */
  refs: BirthRef[]
}

const EMPTY: Recorded = { total: 0, sites: [], points: [], refs: [] }

/**
 * Every recorded birth of one species, keyed by NAME so it reads across every site.
 *
 * WHY THIS IS WALKED HERE RATHER THAN ASKED OF AN EXISTING HELPER, in three parts.
 *
 * The SERIES has no species dimension. `pointsOf`, `series` and `daily` are all keyed
 * (slug, siteKey); there is no per-species time series anywhere in `core/`, and the flow's
 * parallel columns are the only route to one. So a walk was required for the trend regardless.
 *
 * The RECORD LIST cannot come from `pageWhere` without contradicting the figure above it.
 * `pageWhere` caps its scan at 40,000 rows and returns `exhausted: false` when it hits the cap;
 * the births flow holds 64,083, so under "All time" it would stop early and report its total as
 * a floor. A card reading "at least 1,400 records" beside a card reading "2,183 young recorded"
 * is two models of one collection on one screen. This walk visits every row once, so the total,
 * the site rows, the trend and the list are the same integer counted four ways.
 *
 * The BUCKETS are the same buckets. `buckets(win, max)` supplies the boundaries and the day is
 * placed by a lookup built from those same spans — the arithmetic `plot.ts` documents — so a
 * column's label is the span its value was summed over rather than a coincidence.
 *
 * The site set is `Object.keys(f.slices)`, which is precisely what `METRICS.births.flows` is
 * built from (metrics.ts's `hydrateMetrics`), so this walk and `tally('births', …, 'species')`
 * cover the same sites and cannot disagree. Within a slice the ETL sorts by (site, day) — the
 * assumption `store.ts`'s `rowIndex` already rests on — which is what makes the per-day index
 * countable in the same pass.
 */
function recordedYoung(name: string, siteKey: string | null, win: Win, max = 30): Recorded {
  const f = flowOf('births')
  if (!f) return EMPTY

  const spans = buckets(win, max)
  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)
  const values = new Array<number>(spans.length).fill(0)

  const span = Math.max(0, win.to - win.from + 1)
  const bucketOfDay = new Int32Array(span).fill(-1)
  spans.forEach((s, b) => {
    for (let d = s.from; d <= s.to; d++) {
      const k = d - win.from
      if (k >= 0 && k < span) bucketOfDay[k] = b
    }
  })

  const bySite = new Map<string, number>()
  const refs: BirthRef[] = []
  let total = 0

  for (const key of Object.keys(f.slices)) {
    if (siteKey && key !== siteKey) continue
    const slice: [number, number] = f.slices[key]
    const start = slice[0]
    const end = start + slice[1]
    let day = -1
    let i = 0

    for (let r = start; r < end; r++) {
      const d = f.day[r]
      /* Counted before the window and species tests, because `i` addresses the row within its
         whole (site, day) — skipping a row that does not match would shift every id after it. */
      if (d === day) i++
      else {
        day = d
        i = 0
      }
      if (d < from || d > to) continue
      const spx = f.species[r]
      if (spx === UNRESOLVED || SPECIES[spx]?.name !== name) continue

      total++
      bySite.set(key, (bySite.get(key) ?? 0) + 1)
      const b = bucketOfDay[d - win.from]
      if (b >= 0) values[b]++
      refs.push({ siteKey: key, day: d, i })
    }
  }

  return {
    total,
    sites: [...bySite.entries()]
      .map(([k, value]) => ({ siteKey: k, siteName: siteOf(k)?.name ?? k, value }))
      .sort((a, b) => b.value - a.value),
    points: spans.map((s, b) => ({
      label: s.from >= s.to ? shortDate(s.from) : `${shortDate(s.from)} – ${shortDate(Math.min(TODAY, s.to))}`,
      value: values[b],
      from: s.from,
      to: s.to,
    })),
    refs: refs.sort((a, b) => b.day - a.day),
  }
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

/**
 * EGGS & INCUBATION for one species — its incubation biology, and the young we recorded.
 *
 * Answers two questions and keeps them apart: "what does this animal do?" (species reference,
 * unscoped) and "what did we record?" (our own births, across every site in scope, in the
 * window). It answers neither with an egg count, because the extract holds none.
 */
export function SpeciesEggsTab({
  name,
  profile,
}: {
  /**
   * Site-scoped (`<siteKey>:<name-slug>`), and deliberately not destructured.
   *
   * The identity this tab reads by is the NAME. Reading the site out of the id would report a
   * species held at six sites as whatever share of it one site recorded — the defect
   * `speciesWide.ts` exists to document. Kept in the signature so the caller passes what every
   * other species tab takes.
   */
  speciesId: string
  name: string
  profile?: SpeciesProfile
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const shape = shapeOf(profile)
  /* An egg exists for this species only where the source says one does. A live-bearer and a
     species with no recorded reproduction are both "no egg here", for different reasons. */
  const eggShaped = shape === 'egg' || shape === 'retained'

  /* THE SITE PILL IS HONOURED, THE SITE IN THE ID IS NOT — and those are different things. The
     id is `<siteKey>:<name-slug>` because a metric is always asked under a scope, and reading
     births from that one site would report 782 Brindled Cockatoo births as whatever share of
     them one of its six sites holds. The pill is the reader's own explicit narrowing, stated in
     the header above these bands, and a tab that ignored it would contradict the page frame. */
  const siteKey = scope.site?.key ?? null
  const place = scope.site?.name ?? 'every site'

  /* KEYED ON THE WINDOW'S OWN NUMBERS RATHER THAN ON THE `Win` OBJECT. `useScope` rebuilds its
     api whenever the route changes, so the same 30-day window arrives as a fresh object after
     any navigation — and this walk visits all 64,083 birth rows. The days are what the answer
     depends on, so the days are what the memo watches. */
  const win = scope.win
  const rec = useMemo(
    () => recordedYoung(name, siteKey, win),
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- the window's days, not its object */
    [name, siteKey, win.from, win.to, win.days],
  )

  /* The collection's own births in the same window, from the same flow — the only denominator
     on this tab, and one that is counted rather than assumed. */
  const allBirths = useMemo(
    () => count('births', siteKey, win),
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [siteKey, win.from, win.to, win.days],
  )

  const page = usePaged<Ev>(
    (offset, limit) => ({
      rows: rec.refs.slice(offset, offset + limit).map((r) => eventAt('births', r.siteKey, r.day, r.i)),
      total: rec.total,
    }),
    10,
    [rec],
  )

  /* THE TOP STRIP, WITH THE FOUR REQUESTED TILES ABSENT RATHER THAN EMPTY. Hatched, Fertility,
     Females laid and Died developing each need a record type the extract does not contain, so
     none of them appears — a strip of four figures where three are dashes reads as a broken
     query rather than as an absent source. What remains is counted: the total and the site count
     come from the walk above, and the share divides it by `count('births', …)` over the same flow
     and the same window, so the numerator is a subset of its own denominator by construction. */
  const stats = rec.total
    ? [
        {
          label: 'Young recorded',
          value: fmt(rec.total),
          sub: `in the birth register · ${place}`,
        },
        /* NO DENOMINATOR ON THIS ONE, and the reason is that the two site counts on this page are
           not the same set. The warbler is HELD at 7 sites and RECORDED young at 8 — Foxglen
           Biopark carries 59 births and holds none today — so "8 of 7" would be a ratio of two
           different questions. The table below names the eight. */
        { label: 'Sites recording one', value: fmt(rec.sites.length) },
        ...(allBirths > 0
          ? [
              {
                label: 'Share of all births',
                value: `${((rec.total / allBirths) * 100).toFixed(rec.total / allBirths < 0.01 ? 1 : 0)}%`,
                sub: `of ${fmt(allBirths)} recorded across ${place}`,
              },
            ]
          : []),
      ]
    : []

  /* NEVER `weaning_age_days` OR `gestation_days` ON AN EGG-LAYER: both are filled on exactly one
     of the 1,696, and printing a gestation beside an incubation is inventing one of them. The
     rows are chosen by the shape of the animal for the same reason.

     ONE DOCUMENT RATHER THAN TWO CARDS. The previous build split "how this species reproduces"
     from "incubation biology" into two boxes, which put nine short label/value pairs into two
     containers a reader has to re-orient inside. They are one kind of fact from one table, so
     they are one definition list — which is also what lets the kit run them in three columns on a
     wide screen instead of stacking two half-empty cards. */
  const biology: Row[] =
    shape === 'live'
      ? [
          ...row('Reproduction', profile?.reproduction_type),
          ...row('Mating system', profile?.mating_system),
          ...row('Parental care', profile?.parental_care),
          ...row('Gestation', days(profile?.gestation_days)),
          ...row('Birth weight', mass(profile?.birth_egg_weight_g), 'avg'),
          ...row('Litter size', positive(profile?.clutch_litter_size), 'avg'),
          ...row('Weaning', days(profile?.weaning_age_days)),
          ...row('Litters per year', positive(profile?.litters_per_year)),
          ...row('Independence', days(profile?.independence_days)),
          ...row('Maturity', years(profile?.maturity_age_years)),
        ]
      : shape === 'unknown'
        ? /* THE COLUMN'S OWN NAME AND NOTHING MORE. With no `reproduction_type` there is no
             warrant for calling the same number an egg weight or a birth weight, so the row is
             named for both and claims neither. */
          [
            ...row('Mating system', profile?.mating_system),
            ...row('Parental care', profile?.parental_care),
            ...row('Incubation', days(profile?.incubation_days)),
            ...row('Gestation', days(profile?.gestation_days)),
            ...row('Clutch / litter', positive(profile?.clutch_litter_size), 'avg'),
            ...row('Birth / egg weight', mass(profile?.birth_egg_weight_g), 'avg'),
            ...row('Independence', days(profile?.independence_days)),
            ...row('Maturity', years(profile?.maturity_age_years)),
          ]
        : [
            /* Printed for an egg-layer, withheld for a retained-egg species — that one gets the
               verbatim string as a sentence above the list instead, and stating it twice on one
               screen reads as two facts rather than one. */
            ...(shape === 'egg' ? row('Reproduction', profile?.reproduction_type) : []),
            ...row('Mating system', profile?.mating_system),
            /* THE ONLY HONEST ANSWER THE DUMP HAS TO "WHO SITS THE EGGS". Filled on all 1,696
               oviparous species, it names the brooding parent — it does not identify an
               individual, and no record in this extract does. */
            ...row('Parental care', profile?.parental_care),
            ...row(
              'Incubation',
              days(profile?.incubation_days),
              shape === 'retained' ? 'recorded as incubation_days; the eggs are retained' : undefined,
            ),
            ...row('Clutch size', positive(profile?.clutch_litter_size), 'avg'),
            ...row('Egg weight', mass(profile?.birth_egg_weight_g), 'typical'),
            ...row('Clutches per year', positive(profile?.litters_per_year)),
            ...row('Independence', days(profile?.independence_days)),
            ...row('Maturity', years(profile?.maturity_age_years)),
          ]

  const biologyLabel =
    shape === 'live'
      ? 'Gestation biology'
      : shape === 'retained'
        ? 'Retention & development'
        : shape === 'unknown'
          ? 'Reproductive biology'
          : 'Incubation & clutch'

  /* `NOTES.births` is private to `core/metrics.ts` but travels on the metric, so the caption
     under the trend is the same sentence the rest of the product prints — not a second telling
     of the same caveat that can drift from it. */
  const birthsNote = METRICS.births?.note

  /* THE TABLE SLOT, HELD BY THE ONE TABLE THIS SOURCE SUPPORTS. The design asked for a row per
     female — clutches, eggs, hatch rate, last season — and `report_births` has no mother, father,
     sire or dam column, so there is no key to group by and no clutch to count. Site is the only
     grouping the birth record itself carries, so the table is per site: the same integer the
     strip above reports, split the one way the data can split it. */
  const siteColumns: Column<SiteRow>[] = [
    { key: 'site', head: 'Site', cell: (s) => s.siteName, priority: 3 },
    { key: 'value', head: 'Young recorded', cell: (s) => fmt(s.value), align: 'right', priority: 2, width: '30%' },
    {
      key: 'share',
      head: 'Share',
      cell: (s) => `${Math.round((s.value / Math.max(1, rec.total)) * 100)}%`,
      align: 'right',
      priority: 1,
      width: '20%',
    },
  ]

  return (
    <TabBody>
      {/* ── 1 · the top strip, where four requested figures are simply not ─ */}

      {stats.length > 0 ? (
        <Band title="Young recorded" aside={win.window} icon={Baby}>
          <MetricStrip items={stats} />
          {/* THE WORD MATTERS MORE THAN THE NUMBER HERE. Every one of these is the registration
              of an animal; nothing in the extract says an egg preceded it, so this is not a hatch
              count and the caption says so before anyone can read it as one. */}
          <p className="mt-4 text-caption" style={{ color: FAINT }}>
            Each is the registration of a young animal in the birth register. The source carries no
            hatch event, no laying event and no fertility result, so this counts young recorded —
            not eggs hatched.
          </p>
        </Band>
      ) : (
        <Band title="Young recorded" aside={win.window} icon={Baby}>
          <p className="text-small" style={{ color: '#5c574f' }}>
            No young of this species were recorded across {place} in this window. That is what the
            register holds — not a statement that none were born.
          </p>
        </Band>
      )}

      {/* ── 2 · the species, as reference, and never as our record ────────── */}

      {shape !== 'egg' && shape !== 'unknown' && profile?.reproduction_type && (
        <Band title={shape === 'live' ? 'This species does not lay' : 'The eggs are not laid down'} icon={Egg}>
          <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
            The reference records this species as{' '}
            <span className="font-medium" style={{ color: INK }}>
              {profile.reproduction_type}
            </span>
            {shape === 'live'
              ? '. There is no clutch, no incubation and no egg to show, so the biology below is its gestation instead.'
              : '. Its eggs are retained and hatch inside the female, so nothing is set down and there is no incubation for us to run — and where the string reads “Varies”, that is the source stating that it does not know, rather than a value we can resolve.'}
          </p>
        </Band>
      )}

      {biology.length > 0 && (
        /* THE GLYPH IS PART OF THE CLAIM. An egg over "Gestation biology" says the animal lays,
           and a reader takes an icon before they take a heading. */
        <Band
          title={biologyLabel}
          aside="species reference"
          icon={eggShaped ? Egg : Heart}
          note="Published figures for the species, read verbatim from the reference table — not measurements of any egg or animal we hold, and unchanged by the site and date filters above."
        >
          <DefinitionList items={biology} />
        </Band>
      )}

      {!profile && (
        <Band title="Reference biology" icon={Feather}>
          <p className="text-small" style={{ color: '#5c574f' }}>
            No reference biology is recorded for this species in the extract. The recorded young
            above are unaffected — they come from our own birth records, not from the reference.
          </p>
        </Band>
      )}

      {/* ── 3 · the month-by-month, with one band instead of three ────────── */}

      {rec.total > 0 && (
        <Band
          title="When they were recorded"
          aside={win.window}
          icon={CalendarDays}
          note="One band, not three. Laid and Fertile have no record behind them, and drawing them empty beside a real one would claim two measurements this collection never made."
        >
          {/* NO PEAK MARKER, EITHER. The one series that exists is partly dated by a data-entry
              calendar rather than by a birth, so flagging its tallest column as a peak would put a
              season on a number that may only be when the records were typed in. The caption below
              is the whole reason this chart is defensible, and it is read from the metric rather
              than written here. */}
          <EventTrend
            points={rec.points}
            unit="young recorded"
            tone="good"
            empty="No young of this species were recorded in this window."
          />
          {birthsNote && (
            <p className="mt-3 text-caption" style={{ color: FAINT }}>
              {birthsNote} Seasonality read off this chart is therefore partly a record-keeping
              calendar, and there is no laying date in the source to correct it against.
            </p>
          )}
        </Band>
      )}

      {/* ── 4 · the table, per site because there is no female to key on ─── */}

      {rec.sites.length > 1 && (
        <Band title="Where they were recorded" aside={win.window} icon={MapPin}>
          <DataTable
            rows={rec.sites}
            columns={siteColumns}
            keyOf={(s) => s.siteKey}
            onOpen={(s) => drillTo({ kind: 'site', id: s.siteKey }, { module: 'animals', label: name })}
          />
          {/* Every site the FLOW has a slice for is walked, not the sites the register shows the
              species at today. A site that has since emptied still recorded its births, and
              dropping it would lose that history without saying so. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Counted from the birth records themselves, so a site that no longer holds the species
            still shows the young it recorded.
          </p>
        </Band>
      )}

      {/* ── 5 · the records, which are the evidence for everything above ─── */}

      {rec.total > 0 && (
        <Band title="The records" aside={fmt(rec.total)} icon={ListTree}>
          {/* A LIST RATHER THAN THE KIT'S TABLE, AND THE REASON IS THE CHEVRON. Only a record
              carrying an animal id can open anything, and `DataTable` takes one `onOpen` for the
              whole table — every row would offer the same affordance and some would honour none of
              it. `TapRow` takes the handler per row, so the promise is made only where it can be
              kept. NO "TYPE" COLUMN EITHER: `dims.json` shows this flow with `details: ['Natality']`,
              one constant value on all 64,083 rows, so a column of the same word would read as a
              classification that varies. */}
          <TapList>
            {page.rows.map((ev) => (
              <TapRow
                key={ev.id}
                label={ev.animalId ? `Animal ${ev.animalId}` : 'No animal id on this record'}
                sub={`${longDate(ev.day)} · ${siteOf(ev.siteKey)?.name ?? ev.siteKey}`}
                value={shortDate(ev.day)}
                onOpen={ev.animalId ? () => drillTo({ kind: 'animal', id: ev.animalId }, { module: 'animals', label: name }) : undefined}
              />
            ))}
          </TapList>
          <MoreRows page={page} noun="records" />
          {/* The sex of the young IS in `report_births` — gender is filled on every row — but the
              ETL compiles this flow with no facets, so it is not queryable at runtime. It is not
              recovered through the animal register either: that register is built from `housing`,
              so any young that has since died or moved is absent and the split would be drawn over
              a silently biased subset. A biased split under a real total is worse than none. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            The record carries a date, a site and the animal’s own id. It carries no parent, and the
            sex of the young is not compiled into this flow — so neither is shown.
          </p>
        </Band>
      )}

      {/* ── 6 · one panel for everything the source does not carry ────────── */}

      <Band title="What is not recorded" aside="checked against the extract" icon={ScrollText}>
        <NotePanel title="No egg record exists in this source">
          <p>
            {eggShaped
              ? 'There is no egg, clutch, candling or incubation-run row anywhere in the extract. So a hatch count, a fertility rate, a females-laid figure and a died-developing count have no numerator and no denominator, and no tile stands in for them at the top of this tab — a slot with nothing behind it is dropped rather than zeroed, because a figure printed as 0 reads as a measurement. For the same reason there is no discard breakdown to draw, and the per-female table — clutches, eggs, hatch rate and a comparison against last season, under tabs for females that laid nothing, one clutch or more — has no key to be built on, because the birth register carries no mother, father, sire or dam column.'
              : 'The birth register carries no mother, father, sire or dam column, so the female behind any young animal in the collection is unrecoverable, and there is no pairing outcome, no pregnancy and no fetal-loss record anywhere in the extract to set against these births.'}
          </p>
          {/* THE REASONS ARE READ FROM THE REGISTRY, NOT WRITTEN HERE. `UNSOURCED` is the same
              object `core/checks.ts` asserts against at boot: a slug listed there that later
              acquires a metric fails the boot as a stale entry, so this panel cannot outlive the
              gap it describes. Only the reader-facing names are local — `noSource.tsx` keeps its
              own `LABELS` file-private, and this pass edits one file rather than two. A slug the
              registry has dropped renders no line rather than an empty reason. */}
          <ul className="mt-3 flex flex-col gap-1">
            {(eggShaped
              ? [
                  ['Eggs set down', UNSOURCED.eggs],
                  ['Hatched', UNSOURCED.hatched],
                  ['Eggs discarded', UNSOURCED.discarded],
                  ['Breeding success', UNSOURCED.breeding],
                ]
              : [
                  /* NO EGG LINES WHERE NOTHING IS LAID. The schema statement is true either way,
                     but "Eggs set down · not recorded" against a placental mammal reads as a gap
                     in OUR keeping rather than as an animal that does not lay. */
                  ['Fetal loss', UNSOURCED.fetal],
                  ['Breeding success', UNSOURCED.breeding],
                ]
            )
              .filter((x): x is [string, string] => !!x[1])
              .map(([label, why]) => (
                <li key={label} className="text-caption">
                  <span className="font-semibold">{label}</span> · not recorded — {why}
                </li>
              ))}
          </ul>
          {/* The two kinds of fact are named once more at the end, because this is the panel a
              sceptical reader arrives at, and it is where the distinction has to survive testing. */}
          <p className="mt-3 text-caption">
            The incubation and clutch figures on this tab are the species’ published reference. The
            young are our own records. Nothing here multiplies one by the other.
          </p>
        </NotePanel>
      </Band>
    </TabBody>
  )
}
