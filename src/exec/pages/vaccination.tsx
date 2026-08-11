/**
 * VACCINATION — doses given, doses due, and the coverage those imply.
 *
 * REBUILT ON `vaccination` — 37,845 rows, each with a named product, an animal, a site, a day
 * and a completed/pending status. Three real figures come out of it: administrations
 * (`vaccinations`), the outstanding roster (`vaccinationDue`), and coverage (`vaccination`,
 * a rate).
 *
 * THE COVERAGE FIGURE CARRIES ITS DENOMINATOR ON THE PAGE, and this is the load-bearing
 * decision. Coverage here is distinct animals with a completed vaccination against ALL housed
 * animals, because no protocol table exists to define an eligible herd — a fish and a tiger are
 * both in the denominator and only one of them has a vaccination schedule. That makes the
 * percentage a floor rather than a performance figure, and a 9% printed bare under the word
 * "coverage" would read as a scandal rather than as a measurement artefact. The note comes from
 * `METRICS.vaccination.note`, so the caveat is the metric's own sentence wherever it appears.
 *
 * SITES KEEP FULL-WIDTH BARS, deliberately, and they are the one legitimate exception on the
 * branch. Everywhere else a bar under a count was replaced by a 3px rail, because a count's bar
 * is a share of a total and a rail says that more quietly. Coverage is a RATE against 100%, and
 * a rate genuinely is a bar: a site at 90% and a site at 40% are being measured against the same
 * ceiling, not against each other. `SiteSplit` draws rate rows as bars for exactly this reason.
 *
 * DEWORMING IS THE SAME DATA SHAPE AND A DIFFERENT PAGE. That module leads with the
 * anthelmintics — which product, how much of the programme each carries — because a wormer is
 * chosen per parasite burden. This one leads with the coverage and the queue, because a vaccine
 * is a schedule you are either on or behind.
 */

import { useMemo } from 'react'
import { CalendarClock, Info, MapPin, Search, Syringe, TrendingUp } from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { METRICS } from '../../core/metrics'
import { byDimension, figure, records } from '../../core/query'
import { siteName } from '../../core/world'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { EventTrend, RankList } from '../marks'
import { compareOf, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'
import { useSiteDrill } from '../../v4/panels'
import { MoreRows, usePaged } from '../../v4/perf'
import { DrillList, DrillRow, SiteSplit } from '../../v4/modules/kit'

const VACCINE_ACCENT = '#1f515b'

export default function Vaccination() {
  return (
    <AccentProvider value={VACCINE_ACCENT}>
      <VaccinationHero />
      <Stack>
        <Coverage />
        <Queue />
        <Vaccines />
        <Trend />
        <Records />
        <Derivation />
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

function VaccinationHero() {
  const { scope } = useScope()
  const { given, due, cover } = useMemo(
    () => ({
      given: figure(scope, 'vaccinations'),
      due: figure(scope, 'vaccinationDue'),
      cover: figure(scope, 'vaccination'),
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
              <Syringe size={15} strokeWidth={1.75} style={{ color: VACCINE_ACCENT }} aria-hidden />
              Vaccinations given · {scope.win.label.toLowerCase()}
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
            <span className="mt-0.5 block truncate text-caption text-[#6d6860]">Doses pending</span>
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
 * Coverage per site, as bars against 100%.
 *
 * See the file header: this is the deliberate exception to the branch's no-full-width-bars rule,
 * because a rate against a fixed ceiling is the one thing a bar states correctly.
 */
function Coverage() {
  const { scope } = useScope()
  const openSite = useSiteDrill('vaccination', 'Coverage')
  return (
    <Section icon={MapPin} label="Coverage by site" aside={scope.site ? 'scoped' : 'against animals housed'}>
      <SiteSplit slug="vaccination" onOpenSite={openSite} />
    </Section>
  )
}

/** What is still owed, by vaccine. The roster is a real pending status, not a coverage gap. */
function Queue() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'vaccinationDue', 'detail'), [scope])
  const total = rows.reduce((n, r) => n + r.value, 0)

  return (
    <Section icon={CalendarClock} label="Pending" aside={total ? `${fmt(total)} doses` : undefined}>
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

/** Which products were actually used. Every name is a real row value. */
function Vaccines() {
  const { scope } = useScope()
  const rows = useMemo(() => byDimension(scope, 'vaccinations', 'detail'), [scope])

  return (
    <Section icon={Syringe} label="Vaccine" aside={rows.length ? `${rows.length} products` : undefined}>
      {rows.length ? (
        <RankList items={rows.slice(0, 10).map((r, i) => ({ key: `${r.id}-${i}`, title: r.label, value: fmt(r.value), share: r.percent }))} />
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          Nothing administered in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function Trend() {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const points = useMemo(() => pointsOf('vaccinations', site, scope.win), [site, scope.win])
  const compare = useMemo(() => compareOf('vaccinations', site, scope.win), [site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])

  return (
    <Section icon={TrendingUp} label="Trend" aside={scope.win.label}>
      <EventTrend
        points={points}
        unit="vaccinations"
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
      const p = records(scope, 'vaccinations', offset, limit)
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
      <MoreRows page={page} noun="vaccinations" />
    </Section>
  )
}

function Derivation() {
  const note = METRICS.vaccination?.note
  if (!note) return null
  return (
    <Section icon={Info} label="How coverage is counted">
      <p className="text-small text-balance" style={{ color: '#6d6860' }}>
        {note}
      </p>
    </Section>
  )
}
