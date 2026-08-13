/**
 * ACCESSION — how animals arrived, and by which route.
 *
 * REBUILT ON `report_accessions` — 93,120 rows, the largest event table in the extract.
 *
 * THE ROUTE LEADS, because it is the only classifying column the source actually carries and
 * because it is the question: an animal that arrived by Rescue and one that arrived From
 * Institution are two different obligations, two different sets of paperwork and two different
 * stories to tell a board. Births has its calendar; this page has its intake routes, and the
 * two modules therefore read nothing alike even though both are counts of arrivals over a
 * window.
 *
 * WHAT WENT. A quarantine pipeline with clearance stages, a 21-day hold, per-consignment
 * paperwork status and a source-institution table with named zoos. `report_accessions` has no
 * quarantine, no clearance, no hold period and no consignment — an accession is one animal, one
 * route, one site, one day.
 */

import { useMemo } from 'react'
import { Dna, MapPin, Rabbit, Search, Signpost, TrendingUp } from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { byDimension, bySpecies, figure, records } from '../../core/query'
import { siteName } from '../../core/world'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { EventTrend, RankList, Ribbon } from '../marks'
import { compareOf, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'
import { useSiteDrill } from '../../v4/panels'
import { MoreRows, usePaged } from '../../v4/perf'
import { DrillList, DrillRow, SiteSplit } from '../../v4/modules/kit'

const ACCESSION_ACCENT = '#3c5f7a'

export default function Accession() {
  return (
    <AccentProvider value={ACCESSION_ACCENT}>
      <AccessionHero />
      <Stack>
        <Routes />
        <Trend />
        <Species />
        <Sites />
        <Records />
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

function AccessionHero() {
  const { scope } = useScope()
  const { total, routes, species } = useMemo(
    () => ({
      total: figure(scope, 'accession').value,
      routes: byDimension(scope, 'accession', 'detail').length,
      species: bySpecies(scope, 'accession').length,
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
              <Rabbit size={15} strokeWidth={1.75} style={{ color: ACCESSION_ACCENT }} aria-hidden />
              Intakes · {scope.win.label.toLowerCase()}
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
            <Figure value={fmt(routes)} size={28} />
            <span className="mt-1 block truncate text-caption text-[#5c574f]">Routes</span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={fmt(species)} size={28} />
            <span className="mt-1 block truncate text-caption text-[#5c574f]">Species</span>
          </span>
        </div>
      </section>
    </div>
  )
}

/**
 * The intake routes, as one ribbon over a ranked list.
 *
 * The ribbon carries the shape of the split at a glance; the rows carry the names, because a
 * route with 3% of arrivals still has to be nameable. Every row is a real value of
 * `report_accessions`' own classifying column — nothing here is a category the page invented.
 */
function Routes() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'accession', 'detail'), [scope])

  return (
    <Section icon={Signpost} label="Intake route" aside={rows.length ? `${rows.length} routes` : undefined}>
      {rows.length ? (
        <>
          <Ribbon items={rows.slice(0, 6).map((r) => ({ label: r.label, value: r.value }))} />
          <div className="mt-4">
            <RankList
              rank={false}
              items={rows.map((r, i) => ({
                key: `${r.id}-${i}`,
                title: r.label,
                value: fmt(r.value),
                share: r.percent,
              }))}
            />
          </div>
        </>
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          No intakes recorded in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Trend() {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const points = useMemo(() => pointsOf('accession', site, scope.win), [site, scope.win])
  const compare = useMemo(() => compareOf('accession', site, scope.win), [site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])

  return (
    <Section icon={TrendingUp} label="Trend" aside={scope.win.label}>
      <EventTrend
        points={points}
        unit="intakes"
        span={scope.win.window}
        compare={compare}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`No intakes recorded in ${scope.win.window}.`}
      />
    </Section>
  )
}

function Species() {
  const { scope } = useScope()
  const rows = useMemo(() => bySpecies(scope, 'accession'), [scope])
  const top = rows.slice(0, 8)
  const rest = rows.slice(8)
  const restTotal = rest.reduce((n, r) => n + r.value, 0)

  return (
    <Section icon={Dna} label="Species" aside={rows.length ? `${fmt(rows.length)} received` : undefined}>
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
          No intakes recorded in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Sites() {
  const { scope } = useScope()
  const openSite = useSiteDrill('accession', 'Accession')
  return (
    <Section icon={MapPin} label="Site" aside={scope.site ? 'scoped' : 'tap to drill'}>
      <SiteSplit slug="accession" onOpenSite={openSite} />
    </Section>
  )
}

function Records() {
  const { scope } = useScope()
  const page = usePaged(
    (offset, limit) => {
      const p = records(scope, 'accession', offset, limit)
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
            label={ev.speciesName}
            sub={`${ev.detail} · ${ev.animalId || 'unidentified'} · ${siteName(ev.siteKey)}`}
            value={shortDate(ev.day)}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="intakes" />
    </Section>
  )
}
