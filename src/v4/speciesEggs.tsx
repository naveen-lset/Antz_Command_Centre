/**
 * EGGS & INCUBATION — two halves that are two different KINDS of fact, and never one.
 *
 * The top half is the SPECIES' BIOLOGY: how it reproduces, how long its eggs take, how large a
 * clutch runs. Every one of those is a column of the `species` reference table. It is true of
 * the animal in a textbook, it is identical at every site, and it does not move when the date
 * filter does. The bottom half is OUR RECORDS: the young this collection actually registered,
 * counted across every site, and it moves with the window like everything else on the product.
 * A reader who confuses the two has been told we incubated something. So each card states its
 * kind in its own aside, and the first card of each half says it again in a sentence.
 *
 * THE HARD PART OF THIS TAB IS WHAT IT REFUSES TO DRAW. The reference design this replaces
 * showed a Laid → Fertile → Hatched funnel (1,381 → 1,116 → 867), a fertility rate, a
 * died-in-shell count, a per-female clutch table and an egg weight-loss curve. Not one of those
 * figures is recoverable. Regexing the column list of all 24 CREATE TABLE statements in the
 * dump for egg|clutch|hatch|incubat|fertil|candl|nest|brood|lay|sire|dam|mother|father|parent
 * returns nine species-reference columns and `breed_name` on six tables — and nothing else.
 * There is no egg table, no clutch table, no incubation-run table, no candling result and no
 * per-egg row anywhere in the extract; the 1,112 occurrences of "Hatch" in the file are all the
 * species name "Hatchetfish". `report_births` has no mother, father, sire or dam column, so
 * parentage is unrecoverable for births as well as for eggs.
 *
 * A FUNNEL WITH TWO OF ITS THREE BANDS MISSING IS NOT A FUNNEL WITH A GAP — it is one number
 * drawn in a shape that claims two more. So the trend here is a single band of recorded births,
 * captioned as an outcome series rather than a yield, and the absent figures are named once, at
 * the end, from the registry that already holds them (`core/metrics.ts`'s `UNSOURCED`) rather
 * than from a sentence authored here. The day someone extends the ETL, `core/checks.ts` fails
 * the boot on the stale entry and this card stops claiming a gap that has been filled.
 *
 * WHY "YOUNG RECORDED" AND NEVER "HATCHED". `report_births` records the registration of an
 * animal. Nothing in the extract says an egg preceded any particular one of them, which day it
 * was set down, or whether it was incubated by us at all. Calling the figure a hatch count
 * would be inventing the step before it.
 */

import { useMemo } from 'react'
import { Baby, CalendarDays, Egg, Feather, ListTree, MapPin, ScrollText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TODAY, buckets, longDate, shortDate, type Win } from '../core/calendar'
import { count, eventAt, type Ev } from '../core/events'
import { METRICS, UNSOURCED } from '../core/metrics'
import type { SpeciesProfile } from '../core/profiles'
import { UNRESOLVED, flowOf } from '../core/store'
import { SPECIES, siteOf } from '../core/world'
import { EventTrend, type Pt } from '../exec/marks'
import { FAINT, Facts, Figure, HERO_INK, INK, Section, fmt } from '../exec/system'
import { useDrill } from './drillNav'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'

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

/* DUPLICATED FROM `speciesProfile.tsx` ON PURPOSE. Those helpers are file-private there and
   this pass creates one file rather than editing two. They are four lines each and identical,
   so a species reading "24 days" on one tab reads "24 days" on the other. */

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

/* ── the two card primitives, borrowed from the Profile tab's shape ──────── */

interface Row {
  label: string
  value: string
  sub?: string
}

/** A row only if the extract has one. `undefined` in, nothing out. */
const row = (label: string, value: string | undefined, sub?: string): Row[] =>
  value ? [{ label, value, sub }] : []

/**
 * A card that vanishes rather than printing an empty shell.
 *
 * 461 of the 1,696 oviparous species (27%) carry NEITHER `clutch_litter_size` NOR
 * `incubation_days`. For those the biology card has nothing to say, and a heading over four em
 * dashes would state that we looked at our own records and found nothing — when what happened
 * is that the reference table never carried the number.
 */
function Card({ icon, label, rows, aside, foot }: { icon: LucideIcon; label: string; rows: Row[]; aside?: string; foot?: string }) {
  if (!rows.length) return null
  return (
    <Section icon={icon} label={label} aside={aside}>
      <Facts items={rows.map((r) => ({ label: r.label, value: r.value, sub: r.sub }))} />
      {foot && (
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          {foot}
        </p>
      )}
    </Section>
  )
}

/* ── the recorded half · one integer walk over the births flow ───────────── */

interface BirthRef {
  siteKey: string
  day: number
  /** The row's index within its own (site, day), which is what `eventAt` addresses by. */
  i: number
}

interface Recorded {
  total: number
  sites: { siteKey: string; siteName: string; value: number }[]
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

  /* THE SITE PILL IS HONOURED, THE SITE IN THE ID IS NOT — and those are different things. The
     id is `<siteKey>:<name-slug>` because a metric is always asked under a scope, and reading
     births from that one site would report 782 Brindled Cockatoo births as whatever share of
     them one of its six sites holds. The pill is the reader's own explicit narrowing, stated in
     the header above these cards, and a tab that ignored it would contradict the page frame. */
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

  const reference: Row[] = [
    /* Only where it is not already the subject of a card of its own — a non-egg-layer gets the
       verbatim string set as a statement below, and printing it twice on one screen reads as
       two facts rather than one. */
    ...(shape === 'egg' || shape === 'unknown' ? row('Reproduction', profile?.reproduction_type) : []),
    ...row('Mating system', profile?.mating_system),
    /* THE ONLY HONEST ANSWER THE DUMP HAS TO "WHO SITS THE EGGS". It is filled on all 1,696
       oviparous species and it names the brooding parent — it does not identify an individual,
       and no record in this extract does. */
    ...row('Parental care', profile?.parental_care),
  ]

  /* NEVER `weaning_age_days` OR `gestation_days` ON AN EGG-LAYER: both are filled on exactly one
     of the 1,696, and printing a gestation beside an incubation is inventing one of them. The
     rows are chosen by the shape of the animal for the same reason. */
  const biology: Row[] =
    shape === 'live'
      ? [
          ...row('Gestation', days(profile?.gestation_days)),
          ...row('Birth weight', mass(profile?.birth_egg_weight_g), 'avg · healthy neonate'),
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
            ...row('Incubation', days(profile?.incubation_days)),
            ...row('Gestation', days(profile?.gestation_days)),
            ...row('Clutch / litter', positive(profile?.clutch_litter_size), 'avg'),
            ...row('Birth / egg weight', mass(profile?.birth_egg_weight_g), 'avg'),
            ...row('Independence', days(profile?.independence_days)),
            ...row('Maturity', years(profile?.maturity_age_years)),
          ]
        : [
            ...row(
              'Incubation',
              days(profile?.incubation_days),
              shape === 'retained' ? 'the source records this as incubation_days; the eggs are retained' : undefined,
            ),
            ...row('Clutch size', positive(profile?.clutch_litter_size), 'avg'),
            ...row('Egg weight', mass(profile?.birth_egg_weight_g), 'the species’ typical egg mass'),
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
          : 'Incubation biology'

  /* `NOTES.births` is private to `core/metrics.ts` but travels on the metric, so the caption
     under the trend is the same sentence the rest of the product prints — not a second telling
     of the same caveat that can drift from it. */
  const birthsNote = METRICS.births?.note

  return (
    <>
      {/* ── the species, as reference ────────────────────────────────────── */}

      {reference.length > 0 && (
        <Section icon={Feather} label="How this species reproduces" aside="species reference">
          <Facts items={reference.map((r) => ({ label: r.label, value: r.value, sub: r.sub }))} />
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Read verbatim from the species reference table. Everything in this half describes the
            animal, not our collection, so it is identical at every site and does not move with the
            date filter.
          </p>
        </Section>
      )}

      {shape !== 'egg' && profile?.reproduction_type && (
        <Section icon={Egg} label={shape === 'live' ? 'This species does not lay' : 'The eggs are not laid down'}>
          <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
            {shape === 'live' ? (
              <>
                The reference records this species as{' '}
                <span className="font-medium" style={{ color: INK }}>
                  {profile.reproduction_type}
                </span>
                . There is no clutch, no incubation and no egg to show, so the biology below is its
                gestation instead.
              </>
            ) : (
              <>
                The reference records this species as{' '}
                <span className="font-medium" style={{ color: INK }}>
                  {profile.reproduction_type}
                </span>
                . Its eggs are retained and hatch inside the female, so nothing is set down and there
                is no incubation for us to run — and where the string reads “Varies”, that is the
                source stating that it does not know, rather than a value we can resolve.
              </>
            )}
          </p>
        </Section>
      )}

      <Card
        icon={Egg}
        label={biologyLabel}
        aside="species reference"
        rows={biology}
        foot="Typical figures for the species as published, not measurements of any egg or animal we hold."
      />

      {!profile && (
        <Section icon={Feather} label="Reference biology">
          <p className="text-small" style={{ color: '#6d6860' }}>
            No reference biology is recorded for this species in the extract. The recorded young
            below are unaffected — they come from our own birth records, not from the reference.
          </p>
        </Section>
      )}

      {/* ── our own records ──────────────────────────────────────────────── */}

      {rec.total > 0 && (
        <Section icon={Baby} label="Young recorded" aside={win.window}>
          <Figure value={fmt(rec.total)} size={40} color={HERO_INK} />
          <p className="mt-1 text-small font-medium" style={{ color: INK }}>
            young recorded across {rec.sites.length === 1 ? '1 site' : `${rec.sites.length} sites`}
          </p>
          <div className="mt-4">
            <Facts
              items={[
                { label: 'Sites recording one', value: fmt(rec.sites.length) },
                ...(allBirths > 0
                  ? [
                      {
                        label: 'Share of all births recorded',
                        value: `${((rec.total / allBirths) * 100).toFixed(rec.total / allBirths < 0.01 ? 1 : 0)}%`,
                        sub: `of ${fmt(allBirths)} across ${place} in this window`,
                      },
                    ]
                  : []),
              ]}
            />
          </div>
          {/* THE WORD MATTERS MORE THAN THE NUMBER HERE. Every one of these is the registration
              of an animal; nothing in the extract says an egg preceded it, so this is not a
              hatch count and the caption says so before anyone reads it as one. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Each is the registration of a young animal in the birth register. The source carries no
            hatch event, so this counts young recorded — not eggs hatched.
          </p>
        </Section>
      )}

      {rec.sites.length > 1 && (
        <Section icon={MapPin} label="Where they were recorded" aside={win.window}>
          <TapList>
            {rec.sites.map((s) => (
              <TapRow
                key={s.siteKey}
                label={s.siteName}
                value={fmt(s.value)}
                sub={`${Math.round((s.value / Math.max(1, rec.total)) * 100)}% of this species’ recorded young`}
                onOpen={() => drillTo({ kind: 'site', id: s.siteKey }, { module: 'animals', label: name })}
              />
            ))}
          </TapList>
          {/* Every site the FLOW has a slice for is walked, not the sites the register shows the
              species at today. A site that has since emptied still recorded its births, and
              dropping it would lose that history without saying so. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Counted from the birth records themselves, so a site that no longer holds the species
            still shows the young it recorded.
          </p>
        </Section>
      )}

      {rec.total > 0 && (
        <Section icon={CalendarDays} label="When they were recorded" aside={win.window}>
          {/* ONE BAND, AND NO PEAK MARKER. This is where the reference design's Laid → Fertile →
              Hatched stack would sit, and two of its three bands do not exist. The one that does
              is partly dated by a data-entry calendar rather than by a birth — so flagging its
              tallest column as a peak would put a season on a number that may only be when the
              records were typed in. The caption below is the whole reason this chart is
              defensible, and it is read from the metric rather than written here. */}
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
        </Section>
      )}

      {rec.total > 0 && (
        <Section icon={ListTree} label="The records" aside={fmt(rec.total)}>
          {/* NO "TYPE" COLUMN. `dims.json` shows this flow with `details: ['Natality']` — one
              constant value on all 64,083 rows — so rendering it would be a column of the same
              word, and a reader would take it for a classification that varies. */}
          <TapList>
            {page.rows.map((ev) => (
              <TapRow
                key={ev.id}
                label={ev.animalId ? `Animal ${ev.animalId}` : 'No animal id on this record'}
                sub={`${longDate(ev.day)} · ${siteOf(ev.siteKey)?.name ?? ev.siteKey}`}
                value={shortDate(ev.day)}
                /* Only where the record carries an id. An animal that has since died or moved is
                   off the housing-derived register, and a row that opened nothing would be a
                   promise the page cannot keep. */
                onOpen={ev.animalId ? () => drillTo({ kind: 'animal', id: ev.animalId }, { module: 'animals', label: name }) : undefined}
              />
            ))}
          </TapList>
          <MoreRows page={page} noun="records" />
          {/* The sex of the young IS in `report_births` — gender is filled on every row — but the
              ETL compiles this flow with no facets, so it is not queryable at runtime. It is not
              recovered through the animal register either: that register is built from `housing`,
              so any young that has since died or moved is absent and the split would be drawn
              over a silently biased subset. A biased split under a real total is worse than none. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            The record carries a date, a site and the animal’s own id. It carries no parent, and the
            sex of the young is not compiled into this flow — so neither is shown.
          </p>
        </Section>
      )}

      {rec.total === 0 && (
        <Section icon={Baby} label="Young recorded" aside={win.window}>
          <p className="text-small" style={{ color: '#6d6860' }}>
            No young of this species were recorded across {place} in {win.window}. That is what
            the register holds for this window — not a statement that none were born.
          </p>
        </Section>
      )}

      {/* ── the terminal card, and the reason the tab is defensible ──────── */}

      <Section icon={ScrollText} label="What is not recorded" aside="checked against the extract">
        {/* THE REASONS ARE READ FROM THE REGISTRY, NOT WRITTEN HERE. `UNSOURCED` is the same
            object `core/checks.ts` asserts against at boot: a slug listed there that later
            acquires a metric fails the boot as a stale entry. So this card cannot outlive the
            gap it describes. Only the reader-facing names are local — `noSource.tsx` keeps its
            own `LABELS` file-private, and this pass creates one file rather than editing two. */}
        <Facts
          items={(shape === 'live'
            ? [
                ['Fetal loss', UNSOURCED.fetal],
                ['Breeding success', UNSOURCED.breeding],
              ]
            : [
                ['Eggs set down', UNSOURCED.eggs],
                ['Hatched', UNSOURCED.hatched],
                ['Eggs discarded', UNSOURCED.discarded],
                ['Breeding success', UNSOURCED.breeding],
              ]
          )
            /* A slug the registry has dropped — because the ETL grew a source for it — renders
               no row rather than an empty reason. */
            .filter(([, why]) => !!why)
            .map(([label, why]) => ({ label, value: 'Not recorded', sub: why }))}
        />
        <p className="mt-4 text-small leading-relaxed" style={{ color: '#3d3a34' }}>
          There is no egg, clutch, candling or incubation-run row anywhere in the source. So a
          fertility rate, a hatch rate, a died-in-shell count, a reason an egg was discarded, a
          per-clutch record and an egg weight-loss curve have no numerator and no denominator here
          — and `report_births` carries no mother or father column, so the female behind any young
          animal in the collection is unrecoverable as well.
        </p>
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          {/* The two halves are named once more at the end, because this is the card a sceptical
              reader arrives at, and it is where the distinction has to survive being tested. */}
          The incubation and clutch figures above are the species’ published biology. The young are
          our own records. Nothing on this tab multiplies one by the other.
        </p>
      </Section>
    </>
  )
}
