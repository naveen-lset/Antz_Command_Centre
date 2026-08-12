/**
 * ANIMAL MOVEMENT — where animals went, and to whom.
 *
 * REBUILT ON `report_transfers` — 14,342 rows.
 *
 * IT IS AN OUTBOUND PAGE, AND IT NOW SAYS SO. The old composition led with "Transfer in +0 /
 * Transfer out +0" over an in/out balance. Every one of the 14 distinct `transferred_to` values
 * in the source is a destination — Wild Release, Non-Disclosure Site, named parks — and 84% of
 * the rows are Wild Release. There is no inbound direction to report, because an animal
 * arriving is an ACCESSION and has its own table and its own module. So the inbound row is gone
 * rather than printed as a zero: a "+0 in" line invites the reading that nothing arrived this
 * month, when what is true is that arrivals are not transfers. The handoff flagged both.
 *
 * THE DESTINATION IS THE PAGE. A release to the wild and a transfer to another institution are
 * different outcomes for the animal and different things for a board to know, and the source
 * distinguishes them, so the ranked destination list leads and everything else supports it.
 *
 * WHAT WENT. Transport legs, crate manifests, vehicle and escort, permit status and in-transit
 * tracking. None of it exists — a transfer row is one animal, one destination, one site, one day.
 */

import { useMemo } from 'react'
import { ArrowLeftRight, Dna, MapPin, Search, Send, TrendingUp } from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { byDimension, bySpecies, figure, records } from '../../core/query'
import { siteName } from '../../core/world'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { Concentration, EventTrend, RankList } from '../marks'
import { compareOf, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'
import { useSiteDrill } from '../../v4/panels'
import { MoreRows, usePaged } from '../../v4/perf'
import { DrillList, DrillRow, SiteSplit } from '../../v4/modules/kit'

const TRANSFER_ACCENT = '#5a4b7a'

export default function Transfers() {
  return (
    <AccentProvider value={TRANSFER_ACCENT}>
      <TransferHero />
      <Stack>
        <Destinations />
        <Trend />
        <Species />
        <Sites />
        <Records />
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

function TransferHero() {
  const { scope } = useScope()
  const { total, destinations, top } = useMemo(() => {
    const rows = byDimension(scope, 'transfers', 'detail')
    return { total: figure(scope, 'transfers').value, destinations: rows.length, top: rows[0] }
  }, [scope])

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(total)} size={48} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <ArrowLeftRight size={15} strokeWidth={1.75} style={{ color: TRANSFER_ACCENT }} aria-hidden />
              Released or transferred out · {scope.win.label.toLowerCase()}
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
            <Figure value={fmt(destinations)} size={28} />
            <span className="mt-1 block truncate text-caption text-[#6d6860]">Destinations</span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={top ? `${Math.round(top.percent)}` : '—'} unit={top ? '%' : undefined} size={28} />
            <span className="mt-1 block truncate text-caption text-[#6d6860]">
              {top ? `To ${top.label}` : 'Nothing moved'}
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}

/**
 * Where they went, ranked, over a concentration mark.
 *
 * `Concentration` rather than a ring: with 84% of movements going to one destination, a ring
 * reads as one colour and a rank list alone hides how lopsided the split is. How concentrated
 * the outflow is *is* the finding.
 */
function Destinations() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'transfers', 'detail'), [scope])

  return (
    <Section icon={Send} label="Destination" aside={rows.length ? `${rows.length} named` : undefined}>
      {rows.length ? (
        <>
          <Concentration
            items={rows.slice(0, 3).map((r) => ({ label: r.label, value: r.value }))}
            total={rows.reduce((n, r) => n + r.value, 0)}
            of={rows.length}
            unit="movements"
          />
          <div className="mt-4">
            <RankList
              items={rows.slice(0, 10).map((r, i) => ({
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
          Nothing left the collection in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Trend() {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const points = useMemo(() => pointsOf('transfers', site, scope.win), [site, scope.win])
  const compare = useMemo(() => compareOf('transfers', site, scope.win), [site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])

  return (
    <Section icon={TrendingUp} label="Trend" aside={scope.win.label}>
      <EventTrend
        points={points}
        unit="movements"
        span={scope.win.window}
        compare={compare}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`Nothing left the collection in ${scope.win.window}.`}
      />
    </Section>
  )
}

function Species() {
  const { scope } = useScope()
  const rows = useMemo(() => bySpecies(scope, 'transfers'), [scope])
  const top = rows.slice(0, 8)
  const rest = rows.slice(8)
  const restTotal = rest.reduce((n, r) => n + r.value, 0)

  return (
    <Section icon={Dna} label="Species" aside={rows.length ? `${fmt(rows.length)} moved` : undefined}>
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
          Nothing left the collection in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Sites() {
  const { scope } = useScope()
  const openSite = useSiteDrill('transfers', 'Movement')
  return (
    <Section icon={MapPin} label="Origin site" aside={scope.site ? 'scoped' : 'tap to drill'}>
      <SiteSplit slug="transfers" onOpenSite={openSite} />
    </Section>
  )
}

function Records() {
  const { scope } = useScope()
  const page = usePaged(
    (offset, limit) => {
      const p = records(scope, 'transfers', offset, limit)
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
            sub={`→ ${ev.detail} · from ${siteName(ev.siteKey)}`}
            value={shortDate(ev.day)}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="movements" />
    </Section>
  )
}
