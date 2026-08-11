/**
 * DEWORMING — which anthelmintic, how much of the programme it carries, and who is still owed.
 *
 * REBUILT ON `deworming` — 20,446 rows, plus `dewormingDue` for the outstanding roster and
 * `dewormingCover` for coverage. Same three shapes as Vaccination next door.
 *
 * SO IT LEADS SOMEWHERE ELSE, and the difference is not cosmetic. A vaccine is a schedule: the
 * question is whether an animal is on it or behind it, so that page opens on coverage and the
 * pending queue. A wormer is a CHOICE — Panacur, Drontal, Kiwof, Nemocid — made against a
 * parasite burden and a species, and the question a curator brings here is which product the
 * programme is actually running on. So the products lead, and coverage follows them.
 *
 * THE COVERAGE CAVEAT IS THE SAME ONE and it is stated the same way: distinct animals dosed
 * against all housed animals, because no protocol table defines an eligible herd. The sentence
 * comes from `METRICS.dewormingCover.note` rather than being written here, so the two pages
 * cannot end up explaining the same limitation differently.
 */

import { useMemo } from 'react'
import { CalendarClock, Info, MapPin, Pill, Search, TrendingUp } from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { METRICS } from '../../core/metrics'
import { byDimension, figure, records } from '../../core/query'
import { siteName } from '../../core/world'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { Concentration, EventTrend, RankList } from '../marks'
import { compareOf, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'
import { useSiteDrill } from '../../v4/panels'
import { MoreRows, usePaged } from '../../v4/perf'
import { DrillList, DrillRow, SiteSplit } from '../../v4/modules/kit'

const DEWORM_ACCENT = '#4a6b2f'

export default function Deworming() {
  return (
    <AccentProvider value={DEWORM_ACCENT}>
      <DewormingHero />
      <Stack>
        <Anthelmintics />
        <Coverage />
        <Queue />
        <Trend />
        <Records />
        <Derivation />
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

function DewormingHero() {
  const { scope } = useScope()
  const { given, due, cover } = useMemo(
    () => ({
      given: figure(scope, 'deworming'),
      due: figure(scope, 'dewormingDue'),
      cover: figure(scope, 'dewormingCover'),
    }),
    [scope],
  )

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(given.value)} size={48} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <Pill size={15} strokeWidth={1.75} style={{ color: DEWORM_ACCENT }} aria-hidden />
              Treatments given · {scope.win.label.toLowerCase()}
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
            <Figure value={fmt(due.value)} size={28} />
            <span className="mt-0.5 block truncate text-caption text-[#6d6860]">Treatments pending</span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure
              value={cover.known ? `${(cover.percent ?? 0).toFixed(1)}` : '—'}
              unit={cover.known ? '%' : undefined}
              size={28}
            />
            <span className="mt-0.5 block truncate text-caption text-[#6d6860]">
              {cover.known ? 'Of all housed animals' : 'Coverage not reported'}
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}

/**
 * The products, and how concentrated the programme is on a few of them.
 *
 * A ranked list alone says which is commonest. The concentration mark above it says whether the
 * estate is running on three wormers or thirty, which is the supply question behind the clinical
 * one and the reason this section leads the page.
 */
function Anthelmintics() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'deworming', 'detail'), [scope])

  return (
    <Section icon={Pill} label="Anthelmintic" aside={rows.length ? `${rows.length} products` : undefined}>
      {rows.length ? (
        <>
          <Concentration
            items={rows.slice(0, 3).map((r) => ({ label: r.label, value: r.value }))}
            total={rows.reduce((n, r) => n + r.value, 0)}
            of={rows.length}
            unit="treatments"
          />
          <div className="mt-4">
            <RankList items={rows.slice(0, 10).map((r, i) => ({ key: `${r.id}-${i}`, title: r.label, value: fmt(r.value), share: r.percent }))} />
          </div>
        </>
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          Nothing administered in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Coverage() {
  const { scope } = useScope()
  const openSite = useSiteDrill('dewormingCover', 'Coverage')
  return (
    <Section icon={MapPin} label="Coverage by site" aside={scope.site ? 'scoped' : 'against animals housed'}>
      <SiteSplit slug="dewormingCover" onOpenSite={openSite} />
    </Section>
  )
}

function Queue() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'dewormingDue', 'detail'), [scope])
  const total = rows.reduce((n, r) => n + r.value, 0)

  return (
    <Section icon={CalendarClock} label="Pending" aside={total ? `${fmt(total)} treatments` : undefined}>
      {rows.length ? (
        <RankList items={rows.slice(0, 8).map((r, i) => ({ key: `${r.id}-${i}`, title: r.label, value: fmt(r.value), share: r.percent }))} />
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          Nothing pending in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Trend() {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const points = useMemo(() => pointsOf('deworming', site, scope.win), [site, scope.win])
  const compare = useMemo(() => compareOf('deworming', site, scope.win), [site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])

  return (
    <Section icon={TrendingUp} label="Trend" aside={scope.win.label}>
      <EventTrend
        points={points}
        unit="treatments"
        span={scope.win.window}
        compare={compare}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`Nothing administered in ${scope.win.window}.`}
      />
    </Section>
  )
}

function Records() {
  const { scope } = useScope()
  const page = usePaged(
    (offset, limit) => {
      const p = records(scope, 'deworming', offset, limit)
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
      <MoreRows page={page} noun="treatments" />
    </Section>
  )
}

function Derivation() {
  const note = METRICS.dewormingCover?.note
  if (!note) return null
  return (
    <Section icon={Info} label="How coverage is counted">
      <p className="text-small text-balance" style={{ color: '#6d6860' }}>
        {note}
      </p>
    </Section>
  )
}
