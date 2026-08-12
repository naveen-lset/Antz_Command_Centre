/**
 * BIRTH ANALYTICS — when the collection bred, which species, and where.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * REBUILT ON `report_births`. Every figure below is a count of the 66,303 birth rows in
 * `species_mgmt_anon`, cut by the global window and site scope, and nothing else.
 *
 * WHAT THIS PAGE USED TO SAY, because the gap is the point. It opened on 45 births, +12%,
 * against 38 "expected". Under that: a July calendar with eight named marks (`Zebra Finch ·
 * Open Aviary 4`), a 93% delivery success against a 90% target, an 88% neonatal survival, a
 * 38/7 natural-versus-assisted split annotated "3 sedated · 1 caesarean", four zones with
 * survival rates, and five named dams — Sundari, Meera, Roshni, Kavi, Ambika — with pregnancy
 * numbers, prior dystocia, body condition scores and the vets watching them.
 *
 * The database records, per birth: the animal, its species, its site, and a date. That is all.
 * There is no pregnancy, no dam, no delivery, no attendant, no outcome and no neonatal
 * follow-up anywhere in the schema. So the dams, the survival rates, the targets and the
 * caesareans are not approximations that need refreshing against real numbers — there is
 * nothing for them to be approximations OF, and they are gone rather than recalculated.
 *
 * THE ONE SPLIT THAT SURVIVED THE SCHEMA AND STILL HAD TO GO. `report_births.accession_type`
 * exists, which looked like the natural/assisted split. Its value is `'Natality'` on all 66,303
 * rows — one category, so a "38 natural · 7 assisted" line drawn from it would have been a
 * fabricated division of a real column, which is the harder kind of wrong to spot. The handoff
 * flagged this; the sub-line is dropped rather than rendered as "66,303 natural · 0 assisted",
 * which states a fact about the collection that the column does not support either.
 *
 * WHY THE CALENDAR LEADS. Of the four questions a birth record can answer — how many, when,
 * what, where — *when* is the one this module exists for and the one a rate cannot show. It is
 * a real month grid from `dayCells`, not the authored 31 cells with an offset of 5 that stood
 * here; past about seven weeks it becomes a year strip, because a year as rows of seven is nine
 * hundred pixels tall. `DayHeat` decides which, from the window.
 *
 * THE DERIVATION IS STATED ON THE PAGE, not just in a comment. 59% of `birth_date` is null and
 * those rows are counted against the day they were added to the system instead. That materially
 * shapes the calendar — added-on dates cluster on working days in a way real births do not —
 * and a reader drawing a conclusion from a Tuesday spike deserves to know it before they do.
 * The note comes from `METRICS.births.note`, so it is the same sentence the metric carries
 * everywhere else rather than a second wording of it.
 */

import { useMemo } from 'react'
import { CalendarDays, Dna, Info, MapPin, Search, Sparkles, TrendingUp } from 'lucide-react'
import { shortDate } from '../../core/calendar'
import { METRICS } from '../../core/metrics'
import { bySpecies, figure, records } from '../../core/query'
import { siteName } from '../../core/world'
import { AccentProvider, FAINT, Figure, HERO_INK, Section, Stack, Stamp, fmt } from '../system'
import { DayHeat, EventTrend, RankList } from '../marks'
import { compareOf, dayCells, peakOf, pointsOf } from '../../v4/plot'
import { useScope } from '../../v4/scope'
import { useSiteDrill } from '../../v4/panels'
import { MoreRows, usePaged } from '../../v4/perf'
import { DrillList, DrillRow, SiteSplit } from '../../v4/modules/kit'

/** MD3_Antz — natality reads as growth, so it takes the collection's own green. */
const BIRTHS_ACCENT = '#2f6b46'

export default function Births() {
  return (
    <AccentProvider value={BIRTHS_ACCENT}>
      <BirthsHero />
      <Stack>
        <DateDistribution />
        <Trend />
        <Species />
        <Sites />
        <Records />
        <Derivation />
      </Stack>
      <Stamp />
    </AccentProvider>
  )
}

/* ── 1 · hero ────────────────────────────────────────────────────────────── */

/**
 * The window's births, the species behind them, and the busiest single day.
 *
 * The third figure is deliberately the peak DAY rather than a rate: this module's subject is
 * timing, and "the busiest day held 41" is the one supporting number a reader cannot get from
 * the headline. Every rate that used to sit here needed a denominator — pregnancies, expected
 * births, dams at risk — and the schema has none of them.
 */
function BirthsHero() {
  const { scope } = useScope()

  const { total, species, peak } = useMemo(() => {
    const cells = dayCells('births', scope.site?.key ?? null, scope.win).cells
    const best = cells.reduce((a, b) => (b.count > a.count ? b : a), { count: 0, label: '' })
    return {
      total: figure(scope, 'births').value,
      species: bySpecies(scope, 'births').length,
      peak: best.count > 0 ? best : undefined,
    }
  }, [scope])

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(total)} size={48} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <Sparkles size={15} strokeWidth={1.75} style={{ color: BIRTHS_ACCENT }} aria-hidden />
              Births · {scope.win.label.toLowerCase()}
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
            <Figure value={fmt(species)} size={28} />
            <span className="mt-1 block truncate text-caption text-[#6d6860]">Species</span>
          </span>
          <span className="min-w-0 flex-1 border-l border-[#f0efec] pl-4">
            <Figure value={peak ? fmt(peak.count) : '—'} size={28} />
            <span className="mt-1 block truncate text-caption text-[#6d6860]">
              {peak ? `Busiest · ${peak.label}` : 'No births in window'}
            </span>
          </span>
        </div>
      </section>
    </div>
  )
}

/* ── 2 · when ────────────────────────────────────────────────────────────── */

/** The real grid. A month reads as a month; a year reads as a strip. `DayHeat` picks. */
function DateDistribution() {
  const { scope } = useScope()
  const grid = useMemo(() => dayCells('births', scope.site?.key ?? null, scope.win), [scope])
  const total = grid.cells.reduce((n, c) => n + c.count, 0)

  return (
    <Section
      icon={CalendarDays}
      label="Date distribution"
      aside={grid.capped ? 'last 371 days' : `${grid.cells.length} days`}
    >
      {total > 0 ? (
        <DayHeat days={grid.cells} />
      ) : (
        <p className="py-3 text-small" style={{ color: FAINT }}>
          No births recorded in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

/* ── 3 · the shape of the window ─────────────────────────────────────────── */

/**
 * Counts over time, so columns rather than an area — and a previous-period ghost.
 *
 * The old card drew fifteen authored values under the caption "45 births · 2-day buckets",
 * which was four weeks of labels over fifteen columns. `pointsOf` joins the values to
 * `calendar.buckets()`, so each column's label is the span it was actually summed over.
 */
function Trend() {
  const { scope } = useScope()
  const site = scope.site?.key ?? null
  const points = useMemo(() => pointsOf('births', site, scope.win), [site, scope.win])
  const compare = useMemo(() => compareOf('births', site, scope.win), [site, scope.win])
  const peak = useMemo(() => peakOf(points), [points])

  return (
    <Section icon={TrendingUp} label="Trend" aside={scope.win.label}>
      <EventTrend
        points={points}
        unit="births"
        span={scope.win.window}
        compare={compare}
        marks={peak ? [{ index: peak.index, note: peak.note }] : undefined}
        empty={`No births recorded in ${scope.win.window}.`}
      />
    </Section>
  )
}

/* ── 4 · what ────────────────────────────────────────────────────────────── */

/**
 * Which species bred, ranked, with each one's share of the window.
 *
 * A real bottom-up tally — `bySpecies` groups the same events the hero counted, so the rows sum
 * to the headline rather than being scaled to it. The tail is stated as one row for the reason
 * the authored version gave and got right: a sixth rung implies a sixth ranked species rather
 * than the long tail that shares the remainder.
 */
function Species() {
  const { scope } = useScope()
  const rows = useMemo(() => bySpecies(scope, 'births'), [scope])
  const top = rows.slice(0, 8)
  const rest = rows.slice(8)
  const restTotal = rest.reduce((n, r) => n + r.value, 0)

  return (
    <Section icon={Dna} label="Species" aside={rows.length ? `${fmt(rows.length)} breeding` : undefined}>
      {top.length ? (
        <>
          <RankList
            items={top.map((r, i) => ({
              key: `${r.id}-${i}`,
              title: r.label,
              meta: r.sub,
              value: fmt(r.value),
              share: r.percent,
              onPick: r.href ? () => { window.location.hash = r.href!.replace(/^#/, '') } : undefined,
            }))}
          />
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
          No births recorded in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

/* ── 5 · where ───────────────────────────────────────────────────────────── */

/** The site ladder, drillable into the Overall → Site → Species → Animal panel. */
function Sites() {
  const { scope } = useScope()
  const openSite = useSiteDrill('births', 'Natality')

  return (
    <Section icon={MapPin} label="Site" aside={scope.site ? 'scoped' : 'tap to drill'}>
      <SiteSplit slug="births" onOpenSite={openSite} />
    </Section>
  )
}

/* ── 6 · the records ─────────────────────────────────────────────────────── */

/** The individual births behind every figure above. */
function Records() {
  const { scope } = useScope()
  const page = usePaged(
    (offset, limit) => {
      const p = records(scope, 'births', offset, limit)
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
            sub={`${ev.animalId || 'unidentified'} · ${siteName(ev.siteKey)}`}
            value={shortDate(ev.day)}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="births" />
    </Section>
  )
}

/* ── 7 · how it was counted ──────────────────────────────────────────────── */

/**
 * The caveat, on the page rather than in the console.
 *
 * `METRICS.births.note` is the same string the metric carries wherever else it is explained, so
 * there is one sentence about this derivation in the product and not two that can drift.
 */
function Derivation() {
  const note = METRICS.births?.note
  if (!note) return null
  return (
    <Section icon={Info} label="How this is counted">
      <p className="text-small text-balance" style={{ color: '#6d6860' }}>
        {note}
      </p>
    </Section>
  )
}
