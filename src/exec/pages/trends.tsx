/**
 * TRENDS — every flow the database records, on one window and one axis.
 *
 * REBUILT ON THE SAME SERIES THE MODULES READ. The point of collecting them here is
 * comparability, and that premise was right in the authored version: read one at a time, nobody
 * notices that a rise in one series and a rise in another are the same event days apart.
 *
 * WHAT WAS WRONG WITH IT was that comparability was the one thing it did not have. The three
 * trends were fifteen typed values each, invented independently, under labels claiming four
 * weeks; one carried a comment dating an aviary respiratory outbreak to 21 July, which is a
 * finding asserted about a chart that was authored to show it. Every series here now comes from
 * `pointsOf` over the SAME window with the SAME bucket count, so two series are genuinely on
 * one axis and a coincidence between them is a fact about the collection rather than about the
 * person who typed them.
 *
 * IT COVERS ALL EIGHT FLOWS, not three. The old page picked natality, mortality and new cases
 * because those were the three that had been authored. The registry now has every flow the ETL
 * found, so the page shows what exists — and the ones with no source do not appear at all
 * rather than appearing flat at zero, because `METRICS[slug]` is undefined for them and this
 * page iterates the registry rather than a hand-written list. Extend the ETL and a ninth series
 * arrives here without anyone editing this file.
 *
 * THE TITLE IS NO LONGER "30-DAY". It reads the global window like every other page, and a page
 * called 30-Day Trends showing a six-month cut was the same class of contradiction as the July
 * 2025 footer. The registry title is left alone; the page states the real span.
 */

import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { METRICS } from '../../core/metrics'
import { figure } from '../../core/query'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { EventTrend } from '../marks'
import { compareOf, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'

const TRENDS_ACCENT = '#2f5f6b'

/**
 * The order the series are read in — collection events first, then clinical, then preventive.
 *
 * A hand-written ORDER over a registry-driven list, which is the one thing authored here: the
 * registry's own key order is the ETL's, and "vaccinationDue before admissions" is an artefact
 * of how the tables were parsed rather than a reading order. Any flow not named here still
 * renders, after these, so adding a metric to the ETL cannot silently drop it from this page.
 */
const ORDER = [
  'births',
  'accession',
  'mortality',
  'transfers',
  'admissions',
  'disease',
  'pharmacy',
  'vaccinations',
  'deworming',
  'supplement',
]

/** Mortality is the one series where a rise is bad — the same inversion `mortality.tsx` makes. */
const INVERTED = new Set(['mortality', 'disease'])

export default function Trends() {
  const { scope } = useScope()

  const slugs = useMemo(() => {
    const flows = Object.keys(METRICS).filter((s) => METRICS[s].kind === 'flow')
    const known = ORDER.filter((s) => flows.includes(s))
    return [...known, ...flows.filter((s) => !known.includes(s))]
  }, [])

  return (
    <AccentProvider value={TRENDS_ACCENT}>
      <div className="w-full px-[var(--gutter)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <div className="flex items-end justify-between gap-4">
            <span>
              <Figure value={fmt(scope.win.days)} unit="d" size={48} color={HERO_INK} />
              <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
                <Activity size={15} strokeWidth={1.75} style={{ color: TRENDS_ACCENT }} aria-hidden />
                Trend window · {slugs.length} series
              </p>
            </span>
            <span className="shrink-0 pb-1 text-right text-caption" style={{ color: FAINT }}>
              {scope.site?.name ?? 'All sites'}
              <br />
              {scope.win.window}
            </span>
          </div>
        </section>
      </div>
      <Stack>
        {slugs.map((slug) => (
          <Series key={slug} slug={slug} />
        ))}
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

/** One flow, on the shared window. Nothing here knows which flow it is beyond the registry. */
function Series({ slug }: { slug: string }) {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const metric = METRICS[slug]

  const points = useMemo(() => pointsOf(slug, site, scope.win), [slug, site, scope.win])
  const compare = useMemo(() => compareOf(slug, site, scope.win), [slug, site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])
  const total = figure(scope, slug).value

  return (
    <Section label={LABELS[slug] ?? slug} aside={`${fmt(total)} ${metric?.unit ?? ''}`}>
      <EventTrend
        points={points}
        unit={metric?.unit}
        span={scope.win.window}
        compare={compare}
        tone={INVERTED.has(slug) ? 'bad' : undefined}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`Nothing recorded in ${scope.win.window}.`}
      />
    </Section>
  )
}

/** The reader's name for each series. The registry's slug is the ETL's name, not a heading. */
const LABELS: Record<string, string> = {
  births: 'Natality',
  accession: 'Accession',
  mortality: 'Mortality',
  transfers: 'Movement out',
  admissions: 'Consultations',
  disease: 'Diagnoses',
  pharmacy: 'Prescriptions',
  vaccinations: 'Vaccinations',
  deworming: 'Deworming',
  supplement: 'Supplements',
  vaccinationDue: 'Vaccinations pending',
  dewormingDue: 'Deworming pending',
}
