/**
 * DISEASE & DIAGNOSIS — what the vets concluded, and how often.
 *
 * REBUILT ON `diagnosis` — 6,808 rows, each naming a diagnosis, an animal, a species, a site
 * and a day.
 *
 * A PARETO LEADS, BECAUSE THE FINDING IS THE CONCENTRATION. The recorded diagnoses are heavily
 * top-weighted — trauma and wound management, suture wounds, limping, abscesses — and what a
 * curator does with this page is decide where to put a programme. A ranked list answers "which
 * is commonest"; the cumulative curve answers "how few do I have to address to cover most of
 * it", which is the actual decision. Mortality uses the same mark for cause of death, and this
 * is the one deliberate echo between two modules on this branch: they are the same shape of
 * question about the same collection, and giving them different marks would be difference for
 * its own sake.
 *
 * THE PAGE IS NOT AN OUTBREAK PAGE ANY MORE, and the retitling matters. It used to lead with an
 * active-outbreak banner, a containment status, an R-number, quarantine zones and a contact
 * trace. `diagnosis` records a clinical conclusion about one animal. It has no transmission, no
 * case linkage, no quarantine and no notion of an outbreak at all — so a containment status
 * drawn from it would have been an inference about spread from data that cannot see spread.
 * "Disease & Outbreak" is left as the registry title; what the page reports is diagnoses.
 */

import { useMemo } from 'react'
import { Biohazard, Dna, MapPin, Search, Stethoscope, TrendingUp } from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { byDimension, bySpecies, figure, records } from '../../core/query'
import { siteName } from '../../core/world'
import { AccentProvider, FAINT, Figure, HERO_INK, Pareto, Section, Stack, Stamp, fmt } from '../system'
import { EventTrend, RankList } from '../marks'
import { compareOf, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'
import { useSiteDrill } from '../../v4/panels'
import { MoreRows, usePaged } from '../../v4/perf'
import { DrillList, DrillRow, SiteSplit } from '../../v4/modules/kit'

const DISEASE_ACCENT = '#7a4b3c'

export default function Disease() {
  return (
    <AccentProvider value={DISEASE_ACCENT}>
      <DiseaseHero />
      <Stack>
        <Diagnoses />
        <Trend />
        <Species />
        <Sites />
        <Records />
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

function DiseaseHero() {
  const { scope } = useScope()
  const { total, kinds, species } = useMemo(
    () => ({
      total: figure(scope, 'disease').value,
      kinds: byDimension(scope, 'disease', 'detail').length,
      species: bySpecies(scope, 'disease').length,
    }),
    [scope],
  )

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(total)} size={48} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <Biohazard size={15} strokeWidth={1.75} style={{ color: DISEASE_ACCENT }} aria-hidden />
              Diagnoses · {scope.win.label.toLowerCase()}
            </p>
          </span>
          <span className="shrink-0 pb-1 text-right text-caption" style={{ color: FAINT }}>
            {scope.site?.name ?? 'All sites'}
            <br />
            {scope.win.window}
          </span>
        </div>
        <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
          <span className="min-w-0 flex-1 pr-4">
            <Figure value={fmt(kinds)} size={28} />
            <span className="mt-0.5 block truncate text-caption text-[#6d6860]">Distinct diagnoses</span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(species)} size={28} />
            <span className="mt-0.5 block truncate text-caption text-[#6d6860]">Species affected</span>
          </span>
        </div>
      </section>
    </div>
  )
}

function Diagnoses() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'disease', 'detail'), [scope])

  return (
    <Section icon={Stethoscope} label="Diagnosis" aside={rows.length ? `${rows.length} recorded` : undefined}>
      {rows.length ? (
        <Pareto items={rows.slice(0, 10).map((r) => ({ label: r.label, value: r.value }))} />
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          No diagnoses recorded in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Trend() {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const points = useMemo(() => pointsOf('disease', site, scope.win), [site, scope.win])
  const compare = useMemo(() => compareOf('disease', site, scope.win), [site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])

  return (
    <Section icon={TrendingUp} label="Trend" aside={scope.win.label}>
      <EventTrend
        points={points}
        unit="diagnoses"
        span={scope.win.window}
        compare={compare}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`No diagnoses recorded in ${scope.win.window}.`}
      />
    </Section>
  )
}

function Species() {
  const { scope } = useScope()
  const rows = useMemo(() => bySpecies(scope, 'disease'), [scope])
  const top = rows.slice(0, 8)
  const rest = rows.slice(8)
  const restTotal = rest.reduce((n, r) => n + r.value, 0)

  return (
    <Section icon={Dna} label="Species" aside={rows.length ? `${fmt(rows.length)} affected` : undefined}>
      {top.length ? (
        <>
          <RankList items={top.map((r, i) => ({ key: `${r.id}-${i}`, title: r.label, meta: r.sub, value: fmt(r.value), share: r.percent }))} />
          {rest.length > 0 && (
            <div className="mt-3 border-t border-[#f0efec] pt-3">
              <DrillList>
                <DrillRow label="Others" sub={`${fmt(rest.length)} species`} value={fmt(restTotal)} />
              </DrillList>
            </div>
          )}
        </>
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          No diagnoses recorded in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Sites() {
  const { scope } = useScope()
  const openSite = useSiteDrill('disease', 'Diagnosis')
  return (
    <Section icon={MapPin} label="Site" aside={scope.site ? 'scoped' : 'tap to drill'}>
      <SiteSplit slug="disease" onOpenSite={openSite} />
    </Section>
  )
}

function Records() {
  const { scope } = useScope()
  const page = usePaged(
    (offset, limit) => {
      const p = records(scope, 'disease', offset, limit)
      return { rows: p.rows, total: p.total }
    },
    15,
    [scope.win.key, scope.win.from, scope.win.to, scope.site?.key],
  )

  return (
    <Section icon={Search} label="Records" aside={`${fmt(page.total)} · ${scope.win.window}`}>
      <DrillList>
        {page.rows.map((ev, i) => (
          <DrillRow
            key={`${ev.id}-${i}`}
            label={ev.detail}
            sub={`${ev.speciesName} · ${ev.animalId || 'unidentified'} · ${siteName(ev.siteKey)}`}
            value={shortDate(ev.day)}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="diagnoses" />
    </Section>
  )
}
