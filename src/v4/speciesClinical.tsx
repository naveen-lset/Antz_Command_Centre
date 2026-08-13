/**
 * THE MEDICAL TAB — this species' clinical record, across every site that ever treated it.
 *
 * FIVE FLOWS, ONE WALK EACH, AND NOT ONE DERIVED FIGURE. Consultations, diagnoses,
 * prescriptions, supplement administrations and the two preventive programmes are five separate
 * blocks of `events.bin`, each compiled from its own table in `species_mgmt_anon`. This tab
 * reads them scoped to one species NAME and reports what each one holds. Nothing is combined
 * into a caseload, a health index or a recovery rate: `core/metrics.ts` registers `healthScore`
 * as unsourced precisely because no composite index exists in the schema, and inventing one
 * here would be the same defect wearing a species page's clothes.
 *
 * THE IDENTITY IS THE NAME, THE FILTER IS THE PILL — the distinction `speciesWide.ts` argues at
 * length. The route is `<siteKey>:<name-slug>` because a metric is always asked under a scope,
 * and reading admissions from that one site would report 3,546 Auburn Caramel Peryton
 * consultations as whatever share of them one of its sites recorded. So the walk is keyed by
 * name across every site the flow has a slice for, and narrowed only when the reader has
 * explicitly set the site pill the page header is already displaying.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * THE THREE MEASUREMENTS THIS TAB IS SHAPED BY, all taken over the compiled flows themselves:
 *
 * THE PRESENTING SIGN IS ABSENT ON FOUR CONSULTATIONS IN FIVE. 26,039 of 32,311 rows carry
 * `Not recorded` — the ETL's own value for a `medical_records` row with no `complaints` row
 * behind it. So the sign vocabulary is drawn over the consultations that HAVE one and the
 * remainder is stated as a figure beside it, never folded into the bars as the largest
 * category. A chart whose tallest bar is "we did not write it down" is a chart about our
 * record-keeping presented as a chart about the animals.
 *
 * SEVERITY IS CO-EXTENSIVE WITH THE SIGN, EXACTLY. Both come from the same first `complaints`
 * row per medical record, and measured row by row across all 32,311 consultations the two are
 * missing on precisely the same rows — 32,311 of 32,311 agree. So the severity split's
 * denominator is the signed consultations and not the total, and the card says which.
 *
 * "NOT CHRONIC" IS A FLAG NOBODY TICKED, NOT A CLINICAL JUDGEMENT. `diagnosis.chronic` is a
 * tinyint, 1 on 271 rows and 0 on 6,537 dump-wide with nothing null, and the ETL labels the
 * zero bucket "Not chronic" rather than "Acute" for exactly that reason. The chronic count is
 * therefore a floor on chronic disease in the collection, and is reported as recorded rather
 * than as found.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────
 * WHAT A MEDICAL TAB IS USUALLY ASKED FOR AND CANNOT BE GIVEN HERE. There is no admission, no
 * discharge, no bed and no ward row anywhere in the extract — `medical_records` is a
 * consultation, not a stay — so there is no length of stay, no occupancy and no discharge
 * outcome. There is no laboratory test table at all, only a `lab_test_id_count` column, so
 * there is no sample, no result and no turnaround. Those absences are named at the end of the
 * tab from `core/metrics.ts`'s own `UNSOURCED` registry rather than from a sentence written
 * here, so that the day the ETL grows a source, `core/checks.ts` fails the boot on the stale
 * entry and this card stops claiming a gap that has been filled.
 *
 * ASSESSMENTS ARE THE ONE ABSENCE THAT IS NOT AN ABSENCE, and saying otherwise would be as
 * wrong as inventing them. 167,512 assessment rows exist and are summarised per species name in
 * `profiles.json` — they are simply not compiled into `events.bin`, because `assessment_value`
 * is free text and no five-integer event row can carry it. So this tab states where they live
 * instead of drawing them empty, quoting `dims.meta.notes.assessments` rather than paraphrasing
 * it into a second telling that can drift.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  ClipboardList,
  FlaskConical,
  ListTree,
  MapPin,
  Pill,
  ScrollText,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { TODAY, longDate, shortDate, type Win } from '../core/calendar'
import { detailLabelOf, eventAt, facetAt, type Ev } from '../core/events'
import { METRICS, UNSOURCED } from '../core/metrics'
import {
  FLAG_CARE,
  FLAG_DEWORMED,
  FLAG_VACCINATED,
  UNRESOLVED,
  data,
  flowOf,
  speciesSpan,
} from '../core/store'
import { SPECIES, siteOf, speciesByName } from '../core/world'
import {
  Composition,
  FAINT,
  Facts,
  INK,
  Rule,
  Section,
  Snapshot,
  fmt,
} from '../exec/system'
import { useDrill } from './drillNav'
import { FindField } from './filters'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useScope } from './scope'

/* ── one flow, walked for one species name ───────────────────────────────── */

/** Where one matching row sits, in the coordinates `eventAt` and `facetAt` address by. */
interface Ref {
  siteKey: string
  day: number
  /** The row's index within its own (site, day) — NOT its index among the matches. */
  i: number
}

interface Slice {
  total: number
  /** The metric's classifying dimension, biggest first. */
  detail: { label: string; value: number }[]
  /** One tally per requested facet, biggest first, keyed by facet name. */
  facet: Record<string, { label: string; value: number }[]>
  sites: { siteKey: string; siteName: string; value: number }[]
  /** Newest first, so the record list is a slice rather than a sort per page. Empty unless
   *  the caller asked for them — see `keepRefs`. */
  refs: Ref[]
}

const EMPTY: Slice = { total: 0, detail: [], facet: {}, sites: [], refs: [] }

/**
 * Every row of one flow belonging to one species name, in one pass.
 *
 * WHY THIS IS WALKED HERE RATHER THAN ASKED OF `tally` OR `pageWhere`, which is the same
 * argument `speciesEggs.tsx` sets out and is repeated because it is the load-bearing one.
 * `tally(slug, site, win, 'species')` groups BY species and cannot be narrowed TO one, and
 * `tallyFacet` has no species dimension at all. `pageWhere` can filter to a species but caps
 * its scan at 40,000 rows and reports `exhausted: false` when it hits the cap — the
 * vaccinations flow holds 36,064 and admissions 32,311, so an "All time" window on a busy site
 * set would stop early and report its total as a floor. A card reading "at least 900 records"
 * beside a card reading "3,546 consultations" is two models of one collection on one screen.
 * This walk visits every row of the flow exactly once, so the total, the vocabulary, the site
 * rows and the record list are the same integer counted four ways and cannot disagree.
 *
 * `i` IS COUNTED BEFORE ANY TEST IS APPLIED, and that is the subtle part. `rowIndex` addresses
 * the `i`th event of a (site, day), so skipping a non-matching row before incrementing would
 * shift every id after it and the record list would open the wrong animal. The counter
 * therefore advances on every row in the slice and only the matches are kept.
 *
 * `keepRefs` EXISTS FOR ONE MEASURED REASON. Umber Langur carries 20,230 of the 36,064
 * vaccinations in the dump; materialising a ref per row for a card that only ever prints a
 * total and a vocabulary is 20,230 objects nothing reads. The flows whose individual records
 * this tab actually lists ask for refs; the preventive counters do not.
 */
function walkFlow(
  slug: string,
  name: string,
  siteKey: string | null,
  win: Win,
  facets: readonly string[] = [],
  keepRefs = false,
): Slice {
  const f = flowOf(slug)
  if (!f) return EMPTY

  const from = Math.max(0, win.from)
  const to = Math.min(TODAY, win.to)

  const byDetail = new Map<string, number>()
  /* The tuple is asserted rather than inferred: `map` widens `[n, new Map()]` to an array of a
     union, which the `Map` constructor will not take as entries. */
  const byFacet = new Map<string, Map<string, number>>(
    facets.map((n) => [n, new Map<string, number>()] as [string, Map<string, number>]),
  )
  const bySite = new Map<string, number>()
  const refs: Ref[] = []
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

      const label = f.details[f.detail[r]] ?? 'Not recorded'
      byDetail.set(label, (byDetail.get(label) ?? 0) + 1)

      for (const fname of facets) {
        const spec = f.facets.get(fname)
        if (!spec) continue
        const v = spec.values[spec.col[r]] ?? 'Not recorded'
        const bucket = byFacet.get(fname)
        if (bucket) bucket.set(v, (bucket.get(v) ?? 0) + 1)
      }

      if (keepRefs) refs.push({ siteKey: key, day: d, i })
    }
  }

  const rank = (m: Map<string, number>) =>
    [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)

  return {
    total,
    detail: rank(byDetail),
    facet: Object.fromEntries([...byFacet.entries()].map(([n, m]) => [n, rank(m)] as const)),
    sites: [...bySite.entries()]
      .map(([k, value]) => ({ siteKey: k, siteName: siteOf(k)?.name ?? k, value }))
      .sort((a, b) => b.value - a.value),
    refs: refs.sort((a, b) => b.day - a.day),
  }
}

/* ── the register's preventive position ──────────────────────────────────── */

interface Cover {
  /** Animals of this name in the register. The denominator, and the only one available. */
  held: number
  vaccinated: number
  dewormed: number
  care: number
}

/**
 * How much of this species' holding carries a preventive or clinical record — counted, today.
 *
 * THIS IS A POSITION AND NOT A PERIOD, which is why it is read from the register rather than
 * from the two dose flows. `animals.bin`'s flag bits are set memberships built by the ETL over
 * every completed vaccination and deworming in the source, with no date attached: the animal
 * either has ever had one or has not. Counting doses inside the window instead would answer a
 * different question — "how many doses were given in May" is not "how much of the herd is
 * covered" — and a coverage percentage that moved when the date pill moved would be one of
 * those two answers wearing the other's label.
 *
 * THE DENOMINATOR IS EVERY HOUSED ANIMAL BECAUSE NOTHING ELSE IS DEFINED. `dims.meta.notes`
 * states it in the ETL's own words: no protocol table exists anywhere in the schema saying
 * which animals are DUE a dose, so the eligible herd cannot be established. The tab quotes that
 * note rather than restating it.
 *
 * UNDER CARE IS NOT THE `health` METRIC, and the two are deliberately not reconciled. The
 * register's flag is set by a live prescription OR a diagnosis inside the last ninety days; the
 * collection-level `health` level counts live prescriptions only. Both are in the extract, they
 * measure different things, and the tab names the one it is printing.
 */
function coverageOf(name: string, siteKey: string | null): Cover {
  const a = data().animals
  let held = 0
  let vaccinated = 0
  let dewormed = 0
  let care = 0

  for (const sp of speciesByName(name)) {
    if (siteKey && sp.siteKey !== siteKey) continue
    const span = speciesSpan(sp.id)
    if (!span) continue
    const [start, n] = span
    for (let i = start; i < start + n; i++) {
      held++
      const flags = a.flags[i]
      if (flags & FLAG_VACCINATED) vaccinated++
      if (flags & FLAG_DEWORMED) dewormed++
      if (flags & FLAG_CARE) care++
    }
  }

  return { held, vaccinated, dewormed, care }
}

/* ── shares, which are the one place a rounding can state a falsehood ────── */

/**
 * A share that never rounds a gap away and never rounds a real figure to nothing.
 *
 * MEASURED ON REAL DATA IN BOTH DIRECTIONS. Umber Langur is 4,009 vaccinated of 4,010 held:
 * `Math.round` prints "100%" for a herd with an animal missing, which is a stated figure that
 * is wrong. At the other end, a single consultation against 3,546 is 0.028%, and `toFixed(0)`
 * prints "0%" for a record that exists. So 100% is reserved for an exact match, anything above
 * 99.5 reads "> 99%", and anything under a tenth of a percent reads "< 0.1%".
 */
function share(value: number, of: number): string {
  if (of <= 0) return ''
  if (value === 0) return '0%'
  if (value === of) return '100%'
  const p = (value / of) * 100
  if (p >= 99.5) return '> 99%'
  if (p < 0.1) return '< 0.1%'
  if (p < 1) return `${p.toFixed(1)}%`
  return `${Math.round(p)}%`
}

/* ── a vocabulary card, which is the shape four of these cards share ─────── */

/**
 * One classifying vocabulary — presenting signs, diagnoses, medicines — paged and searchable.
 *
 * THE SHARE IS COMPUTED AGAINST THE REAL DENOMINATOR AND CARRIED ON THE ROW, rather than left
 * to `Bars`'s own `showShare`. `Bars` divides by the sum of the items it is HANDED, and this
 * card hands it a page of eight out of a vocabulary that runs to 330 for diagnoses — so its
 * share would be a share of the page, rising as rows were revealed. The denominator here is
 * passed in explicitly by the caller, because for presenting signs it is not even the sum of
 * the rows: it is the consultations that carry a sign, which is a smaller number than the
 * consultations.
 *
 * SEARCH ONLY PAST TWELVE ROWS, which is the rule the rest of the product follows. A species
 * with four recorded diagnoses gets a field that filters four rows, which is furniture.
 */
function Vocabulary({
  icon,
  label,
  aside,
  rows,
  of,
  noun,
  foot,
}: {
  icon: LucideIcon
  label: string
  aside?: string
  rows: { label: string; value: number }[]
  /** What the shares are out of. Often larger than the sum of `rows`. */
  of: number
  noun: string
  foot?: string
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const hits = useMemo(
    () => (q ? rows.filter((r) => r.label.toLowerCase().includes(q)) : rows),
    [rows, q],
  )
  const page = usePaged<{ label: string; value: number }>(
    (offset, limit) => ({ rows: hits.slice(offset, offset + limit), total: hits.length }),
    8,
    [hits],
  )

  if (!rows.length) return null

  return (
    <Section icon={icon} label={label} aside={aside}>
      {rows.length > 12 && (
        <div className="mb-3">
          <FindField value={query} onChange={setQuery} placeholder={`Search ${noun}`} />
        </div>
      )}
      <TapList>
        {page.rows.map((r) => (
          <TapRow key={r.label} label={r.label} value={fmt(r.value)} sub={share(r.value, of)} />
        ))}
      </TapList>
      <MoreRows page={page} noun={noun} />
      {hits.length === 0 && (
        <p className="text-small" style={{ color: '#5c574f' }}>
          Nothing matches “{query.trim()}”.
        </p>
      )}
      {foot && (
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          {foot}
        </p>
      )}
    </Section>
  )
}

/* ── the record list, which is four flows behind one segmented control ───── */

/** The flows whose individual rows this tab lists, and the facet each row carries. */
const RECORD_FLOWS = [
  { key: 'admissions', label: 'Consultations', facet: 'severity' },
  { key: 'disease', label: 'Diagnoses', facet: 'severity' },
  { key: 'pharmacy', label: 'Prescriptions', facet: 'route' },
  { key: 'supplement', label: 'Supplements', facet: undefined },
] as const

/**
 * The rows behind the figures, newest first, opening the animal each one is about.
 *
 * EVERY CLINICAL ROW IN THIS EXTRACT CARRIES AN ANIMAL ID — measured at 0 missing across all
 * 32,311 consultations, 6,560 diagnoses, 1,636 prescriptions and 3,929 supplement
 * administrations — so unlike the births list, every row here can offer a way in. The link is
 * still conditional, because an animal that has since died or been transferred is off the
 * housing-derived register and a row that opened nothing would be a promise the page cannot
 * keep.
 */
function Records({
  slug,
  refs,
  total,
  facet,
  name,
}: {
  slug: string
  refs: Ref[]
  total: number
  facet?: string
  name: string
}) {
  const { drillTo } = useDrill()
  const page = usePaged<{ ev: Ev; note?: string }>(
    (offset, limit) => ({
      rows: refs.slice(offset, offset + limit).map((r) => {
        const ev = eventAt(slug, r.siteKey, r.day, r.i)
        const v = facet ? facetAt(slug, r.siteKey, r.day, r.i, facet) : undefined
        /* "Not recorded" is dropped from the row rather than printed on it. It is a real answer
           and it is reported as a figure in the cards above; repeated on every second row of a
           list it is noise that pushes the site name off the end of the line. */
        return { ev, note: v && v !== 'Not recorded' ? v : undefined }
      }),
      total,
    }),
    10,
    [slug, refs, total, facet],
  )

  const dimension = detailLabelOf(slug).toLowerCase()

  return (
    <>
      <TapList>
        {page.rows.map(({ ev, note }) => (
          <TapRow
            key={ev.id}
            label={ev.detail === 'Not recorded' ? `No ${dimension} recorded` : ev.detail}
            sub={[
              longDate(ev.day),
              siteOf(ev.siteKey)?.name ?? ev.siteKey,
              note,
              ev.animalId ? `Animal ${ev.animalId}` : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
            value={shortDate(ev.day)}
            onOpen={
              ev.animalId
                ? () => drillTo({ kind: 'animal', id: ev.animalId }, { module: 'animals', label: name })
                : undefined
            }
          />
        ))}
      </TapList>
      <MoreRows page={page} noun="records" />
    </>
  )
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

/** Severity read darkest-first, so the ramp encodes the scale rather than the size. */
const SEVERITY = ['Extreme', 'High', 'Moderate', 'Mild']

/**
 * MEDICAL — what this species was seen for, treated with, and covered against.
 *
 * Answers four questions and keeps each under its own denominator: how often it was consulted
 * on, what it was diagnosed with, what it was prescribed, and how much of the holding carries a
 * preventive record. The first three are windowed event counts and say so; the fourth is a
 * position read off the register and says that instead.
 */
export function SpeciesClinicalTab({
  /** Site-scoped, and deliberately unused: the identity this tab reads by is the NAME. */
  speciesId: _speciesId,
  name,
}: {
  speciesId: string
  name: string
}) {
  const { scope } = useScope()
  const { drillTo } = useDrill()
  const [seg, setSeg] = useState<string>('admissions')

  /* THE SITE PILL IS HONOURED, THE SITE IN THE ID IS NOT. The pill is the reader's own explicit
     narrowing, stated in the header above these cards; the id's site half is an artefact of the
     route. A tab that ignored the pill would contradict the page frame it renders inside. */
  const siteKey = scope.site?.key ?? null
  const place = scope.site?.name ?? 'every site'

  const clinical = useMemo(
    () => ({
      admissions: walkFlow('admissions', name, siteKey, scope.win, ['severity'], true),
      disease: walkFlow('disease', name, siteKey, scope.win, ['severity', 'prognosis', 'chronic'], true),
      pharmacy: walkFlow('pharmacy', name, siteKey, scope.win, ['route'], true),
      supplement: walkFlow('supplement', name, siteKey, scope.win, [], true),
    }),
    [name, siteKey, scope.win],
  )

  /* The preventive flows are counted but never listed — a dose log of 20,230 rows answers no
     question this page is asked — so they are walked without refs. */
  const preventive = useMemo(
    () => ({
      vaccinations: walkFlow('vaccinations', name, siteKey, scope.win),
      deworming: walkFlow('deworming', name, siteKey, scope.win),
      vaccinationDue: walkFlow('vaccinationDue', name, siteKey, scope.win),
      dewormingDue: walkFlow('dewormingDue', name, siteKey, scope.win),
    }),
    [name, siteKey, scope.win],
  )

  const cover = useMemo(() => coverageOf(name, siteKey), [name, siteKey])

  const { admissions, disease, pharmacy, supplement } = clinical
  const anyClinical =
    admissions.total + disease.total + pharmacy.total + supplement.total > 0
  const anyPreventive =
    preventive.vaccinations.total +
      preventive.deworming.total +
      preventive.vaccinationDue.total +
      preventive.dewormingDue.total >
    0

  /* THE VOCABULARY IS DRAWN OVER THE SIGNED CONSULTATIONS, NOT OVER ALL OF THEM. `Not recorded`
     is the ETL's value for a consultation with no complaint row behind it, and dump-wide it is
     80.6% of them. Left in the bars it would be the tallest one on almost every species, which
     would make the card a chart about our record-keeping rather than about the animals. It is
     pulled out and stated as a figure instead. */
  const signs = admissions.detail.filter((d) => d.label !== 'Not recorded')
  const signed = signs.reduce((n, d) => n + d.value, 0)
  const unsigned = admissions.total - signed

  const severity = useMemo(() => {
    const found = new Map((admissions.facet.severity ?? []).map((s) => [s.label, s.value]))
    return SEVERITY.map((label) => ({ label, value: found.get(label) ?? 0 })).filter((s) => s.value > 0)
  }, [admissions])

  /* Every metric's own unit noun, read from the registry rather than written here, so a flow
     renamed in the ETL renames itself on this page. */
  const unitOf = (slug: string, fallback: string) => METRICS[slug]?.unit ?? fallback

  const headline = [
    { label: unitOf('admissions', 'consultations'), value: admissions.total },
    { label: unitOf('disease', 'diagnoses'), value: disease.total },
    { label: unitOf('pharmacy', 'prescriptions'), value: pharmacy.total },
    { label: unitOf('supplement', 'administrations'), value: supplement.total },
  ].filter((h) => h.value > 0)

  const records = RECORD_FLOWS.filter((f) => clinical[f.key].total > 0)
  const active = records.find((f) => f.key === seg) ?? records[0]

  /* The ETL's own notes, quoted rather than paraphrased. A second telling of a caveat is a
     second thing that can drift from the first. */
  const notes = data().meta.notes

  return (
    <>
      {/* ── what the record holds ─────────────────────────────────────────── */}

      {headline.length > 0 && (
        <Section icon={Stethoscope} label="Clinical record" aside={scope.win.window}>
          <Snapshot
            items={headline.map((h) => ({
              label: h.label,
              value: fmt(h.value),
              note: `across ${place}`,
            }))}
            cols={headline.length >= 3 ? 3 : 2}
          />
          <p className="mt-4 text-caption" style={{ color: FAINT }}>
            Counted from the medical records themselves, across every site that recorded one for
            this species — so a site that no longer holds it still shows what it treated. Each row
            is one consultation, diagnosis, prescription or administration, not one animal: an
            animal seen four times is four rows.
          </p>
        </Section>
      )}

      {!anyClinical && (
        <Section icon={Stethoscope} label="Clinical record" aside={scope.win.window}>
          <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
            No consultation, diagnosis, prescription or supplement was recorded for {name} across{' '}
            {place} in {scope.win.window}. That is what the medical records hold for this window —
            not a statement that the animals were never seen.
          </p>
        </Section>
      )}

      {/* ── presenting signs, and the ones that are not there ─────────────── */}

      {admissions.total > 0 && (
        <Section icon={ClipboardList} label="What they were seen for" aside={scope.win.window}>
          <Facts
            items={[
              {
                label: 'Consultations with a presenting sign',
                value: fmt(signed),
                sub: `${share(signed, admissions.total)} of ${fmt(admissions.total)}`,
              },
              ...(unsigned > 0
                ? [
                    {
                      label: 'Consultations recording no sign',
                      value: fmt(unsigned),
                      sub: 'the record exists; the complaint was never written down',
                    },
                  ]
                : []),
            ]}
          />
          {/* TWO FIGURES FOR ONE FACT, AND NEITHER IS ADJUSTED TO THE OTHER. `core/metrics.ts`
              carries 73% dump-wide in its note on this metric; counted over the compiled flow
              the figure is 81%. Reconciling them silently would be the invented number this
              product exists to avoid, so the gap is named where a reader can see it. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            The metric registry records the collection-wide share without a sign as 73%; counted
            over the compiled consultations it is 81%. Both are stated and neither has been
            adjusted to the other.
          </p>
        </Section>
      )}

      <Vocabulary
        icon={Activity}
        label="Presenting signs"
        aside={scope.win.window}
        rows={signs}
        of={signed}
        noun="signs"
        foot="Shares are of the consultations that carry a sign, not of all consultations — the rest recorded none and are counted above rather than shown here as a category."
      />

      {severity.length > 0 && (
        <Section icon={Activity} label="Severity as recorded" aside={scope.win.window}>
          {/* ORDERED BY THE SCALE, NOT BY THE COUNT. The accent ramp runs darkest-first, so
              reading Extreme → Mild puts the weight of the ink on the severe end. Sorted by size
              instead, the palest band would be the most serious one on almost every species. */}
          <Composition items={severity} />
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Severity and presenting sign come from the same complaint row, and measured across all
            32,311 consultations in the dump they are missing on exactly the same rows. So this
            split is out of the {fmt(signed)} consultation
            {signed === 1 ? '' : 's'} that carry a sign — never out of all {fmt(admissions.total)}.
          </p>
        </Section>
      )}

      {/* ── diagnoses ─────────────────────────────────────────────────────── */}

      <Vocabulary
        icon={FlaskConical}
        label="Diagnoses"
        aside={scope.win.window}
        rows={disease.detail}
        of={disease.total}
        noun="diagnoses"
        foot="One row per recorded diagnosis, not per animal. A diagnosis is recorded against a consultation, so an animal seen twice for the same condition appears twice."
      />

      {disease.total > 0 && (
        <Section icon={Activity} label="How the diagnoses read" aside={scope.win.window}>
          <Facts
            items={(disease.facet.prognosis ?? []).map((p) => ({
              label: p.label === 'Not recorded' ? 'No prognosis recorded' : p.label,
              value: fmt(p.value),
              sub: share(p.value, disease.total),
            }))}
          />
          {(disease.facet.chronic ?? []).length > 0 && (
            <>
              <Rule label="Course" />
              <Facts
                items={(disease.facet.chronic ?? []).map((c) => ({
                  label: c.label,
                  value: fmt(c.value),
                  sub: share(c.value, disease.total),
                }))}
              />
              {/* THE ZERO BUCKET IS A FLAG NOBODY TICKED. `diagnosis.chronic` is a tinyint, not a
                  vocabulary: 1 on 271 rows and 0 on 6,537 dump-wide with nothing null. A
                  diagnosis nobody marked chronic is not thereby an acute one, so the count below
                  is what was recorded rather than what was found. */}
              <p className="mt-3 text-caption" style={{ color: FAINT }}>
                “Not chronic” means the chronic flag was not set on the record, which is not the
                same as a clinician judging the case acute. The chronic count is therefore a floor.
              </p>
            </>
          )}
          {(disease.facet.severity ?? []).length > 0 && (
            <>
              <Rule label="Severity" />
              <Facts
                items={(disease.facet.severity ?? []).map((s) => ({
                  label: s.label === 'Not recorded' ? 'No severity recorded' : s.label,
                  value: fmt(s.value),
                  sub: share(s.value, disease.total),
                }))}
              />
            </>
          )}
        </Section>
      )}

      {/* ── pharmacy ──────────────────────────────────────────────────────── */}

      <Vocabulary
        icon={Pill}
        label="Pharmacy"
        aside={scope.win.window}
        rows={pharmacy.detail}
        of={pharmacy.total}
        noun="medicines"
        foot="Prescriptions written against this species' medical records. The source carries no dispensed quantity, no dose and no course length, so this counts prescriptions and not drugs given."
      />

      {pharmacy.total > 0 && (pharmacy.facet.route ?? []).length > 0 && (
        <Section icon={Pill} label="Delivery route" aside={scope.win.window}>
          <Facts
            items={(pharmacy.facet.route ?? []).map((r) => ({
              label: r.label === 'Not recorded' ? 'No route recorded' : r.label,
              value: fmt(r.value),
              sub: share(r.value, pharmacy.total),
            }))}
          />
        </Section>
      )}

      {/* ── supplements ───────────────────────────────────────────────────── */}

      {supplement.total > 0 && (
        <Section icon={Pill} label="Supplements" aside={scope.win.window}>
          <Facts
            items={[
              {
                label: unitOf('supplement', 'administrations'),
                value: fmt(supplement.total),
                sub: `recorded across ${place}`,
              },
            ]}
          />
          {/* NO TYPE COLUMN. This flow is compiled with `details: ['Supplement']` — one constant
              value on all 3,929 rows, because the source distinguishes a supplement record from a
              standard one by `medical_records.case_type` and records nothing further about it. A
              column of the same word repeated reads as a classification that varies. */}
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            The source records that a supplement was administered and nothing about which one — the
            record is a medical record typed as a supplement, with no product, dose or quantity
            behind it. So this is a count and there is no breakdown under it.
          </p>
        </Section>
      )}

      {/* ── preventive programmes ─────────────────────────────────────────── */}

      {anyPreventive && (
        <Section icon={Syringe} label="Preventive programmes" aside={scope.win.window}>
          <Facts
            items={[
              ...(preventive.vaccinations.total > 0
                ? [
                    {
                      label: 'Vaccinations given',
                      value: fmt(preventive.vaccinations.total),
                      sub: `${preventive.vaccinations.detail.length} distinct vaccine${preventive.vaccinations.detail.length === 1 ? '' : 's'}`,
                    },
                  ]
                : []),
              ...(preventive.deworming.total > 0
                ? [
                    {
                      label: 'Deworming treatments given',
                      value: fmt(preventive.deworming.total),
                      sub: `${preventive.deworming.detail.length} distinct anthelmintic${preventive.deworming.detail.length === 1 ? '' : 's'}`,
                    },
                  ]
                : []),
              /* DUE IS A SCHEDULED DOSE THAT WAS NOT GIVEN, NOT A COVERAGE GAP. The ETL compiles
                 these from rows whose status is Pending with no administered date, dated on the
                 date they were scheduled for — so they are real rows in the vaccination and
                 deworming tables, and a window counts the ones scheduled inside it. */
              ...(preventive.vaccinationDue.total > 0
                ? [
                    {
                      label: 'Doses scheduled and not given',
                      value: fmt(preventive.vaccinationDue.total),
                      sub: 'vaccination rows still pending, dated on the scheduled day',
                      tone: 'warn' as const,
                    },
                  ]
                : []),
              ...(preventive.dewormingDue.total > 0
                ? [
                    {
                      label: 'Treatments scheduled and not given',
                      value: fmt(preventive.dewormingDue.total),
                      sub: 'deworming rows still pending, dated on the scheduled day',
                      tone: 'warn' as const,
                    },
                  ]
                : []),
            ]}
          />
        </Section>
      )}

      {cover.held > 0 && (cover.vaccinated > 0 || cover.dewormed > 0 || cover.care > 0) && (
        <Section icon={ShieldCheck} label="Preventive coverage" aside="from the register">
          <Facts
            items={[
              ...(cover.vaccinated > 0
                ? [
                    {
                      label: 'Vaccinated',
                      value: share(cover.vaccinated, cover.held),
                      sub: `${fmt(cover.vaccinated)} of ${fmt(cover.held)} animals in the register`,
                    },
                  ]
                : []),
              ...(cover.dewormed > 0
                ? [
                    {
                      label: 'Dewormed',
                      value: share(cover.dewormed, cover.held),
                      sub: `${fmt(cover.dewormed)} of ${fmt(cover.held)} animals in the register`,
                    },
                  ]
                : []),
              ...(cover.care > 0
                ? [
                    {
                      label: 'Under care now',
                      value: fmt(cover.care),
                      sub: 'a live prescription, or a diagnosis inside the last ninety days',
                    },
                  ]
                : []),
            ]}
          />
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            {/* THE DENOMINATOR'S CAVEAT IS THE ETL'S OWN SENTENCE, quoted from `dims.meta.notes`
                rather than restated, so the page and the compiler cannot come to disagree about
                what the figure means. */}
            {notes.coverage ??
              'Distinct animals dosed against animals housed — no protocol table exists to define an eligible herd.'}{' '}
            Counted on the extract’s last day, so this is a position rather than a period and does
            not move with the date filter.
          </p>
          <p className="mt-2 text-caption" style={{ color: FAINT }}>
            “Under care” here is the register’s own flag. The collection-level health figure counts
            live prescriptions only, so the two are different readings of the extract and are not
            reconciled.
          </p>
        </Section>
      )}

      {/* ── where ─────────────────────────────────────────────────────────── */}

      {admissions.sites.length > 1 && (
        <Section icon={MapPin} label="Where they were treated" aside={scope.win.window}>
          <TapList>
            {admissions.sites.map((s) => (
              <TapRow
                key={s.siteKey}
                label={s.siteName}
                value={fmt(s.value)}
                sub={`${share(s.value, admissions.total)} of this species’ consultations`}
                onOpen={() => drillTo({ kind: 'site', id: s.siteKey }, { module: 'animals', label: name })}
              />
            ))}
          </TapList>
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Counted from the consultations themselves rather than from where the animals are housed
            today, so a site that has since transferred the species still shows what it recorded.
          </p>
        </Section>
      )}

      {/* ── the rows behind the figures ───────────────────────────────────── */}

      {active && (
        <Section icon={ListTree} label="The records" aside={fmt(clinical[active.key].total)}>
          {/* One control rather than four cards. The four flows are four answers to the same
              question — "show me the rows" — and four stacked lists would make the tab a scroll
              past three things nobody asked for to reach the one they did. Only the flows with
              rows in this window get a segment, so the control never offers an empty list. */}
          {records.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {records.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={active.key === r.key}
                  onClick={() => setSeg(r.key)}
                  className={`shrink-0 rounded-full px-3 py-1 text-caption font-medium transition-colors ${
                    active.key === r.key ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <Records
            slug={active.key}
            refs={clinical[active.key].refs}
            total={clinical[active.key].total}
            facet={active.facet}
            name={name}
          />
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            Every clinical row in this extract carries the animal’s own id, so each record opens the
            animal it is about. The record carries no clinician, no outcome and no resolution date —
            none of those columns exists in the source.
          </p>
        </Section>
      )}

      {/* ── the terminal card, and the reason the tab is defensible ───────── */}

      <Section icon={ScrollText} label="What is not recorded" aside="checked against the extract">
        {/* THE REASONS ARE READ FROM THE REGISTRY, NOT WRITTEN HERE. `UNSOURCED` is the same
            object `core/checks.ts` asserts against at boot: a slug listed there that later
            acquires a metric fails the boot as a stale entry. So this card cannot outlive the
            gaps it describes. */}
        <Facts
          items={(
            [
              ['Laboratory tests', UNSOURCED.lab],
              ['Open lab requests', UNSOURCED.labOpen],
              ['Welfare audits', UNSOURCED.welfare],
              ['Health score', UNSOURCED.healthScore],
              ['Clinical alerts', UNSOURCED.alerts],
            ] as [string, string | undefined][]
          )
            /* A slug the registry has dropped — because the ETL grew a source for it — renders no
               row rather than an empty reason. */
            .filter((x): x is [string, string] => !!x[1])
            .map(([label, why]) => ({ label, value: 'Not recorded', sub: why }))}
        />
        <p className="mt-4 text-small leading-relaxed" style={{ color: '#3d3a34' }}>
          <span className="font-medium" style={{ color: INK }}>
            There is no admission, discharge, bed or ward row anywhere in the extract.
          </span>{' '}
          A medical record here is a consultation, not a stay — so this tab shows no length of
          stay, no ward occupancy, no discharge outcome and no readmission rate, because every one
          of them would need a boundary the source never wrote down. For the same reason there is
          no lab turnaround: the schema carries a `lab_test_id_count` column and no test table
          behind it, so there is no sample, no result and no clock to run.
        </p>
        {notes.assessments && (
          <>
            <Rule label="Assessments" />
            {/* THE ONE ABSENCE THAT IS NOT AN ABSENCE. 167,512 assessment rows exist; they are
                simply not in `events.bin`, because `assessment_value` is free text and no
                five-integer event row can carry it. Saying they are missing would be as wrong as
                inventing them, so the ETL's own note is quoted and the reader is pointed at where
                they actually live. */}
            <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
              Assessments are recorded for this collection and are not part of the clinical flows
              this tab reads. They are summarised per species in the reference payload instead:{' '}
              {notes.assessments}
            </p>
          </>
        )}
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          Every figure above is a count of rows in the medical records, under {place} and{' '}
          {scope.win.window}. Nothing on this tab is a rate, an index or a projection, and no two
          of these counts have been divided into each other.
        </p>
      </Section>
    </>
  )
}
