/**
 * PHARMACY — what was administered, by product, programme, site and species.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE PAGE WAS REBUILT WHEN THE PRODUCT WAS CONNECTED TO THE DATABASE.
 *
 * It was organised around "cost, then the request queue, then the shelf" — a rupee headline, a
 * requisition table with aging buckets, expiry write-offs per pharmacy, and a shortage list.
 * Every one of those figures came from `supply.ts`, which generated them from a seed because
 * the product had no supply model.
 *
 * `species_mgmt_anon` has no cost (every cost column sums to zero), no procurement queue
 * (`helpdesk_requests` is the kitchen's, and its items are chicken and eggs) and no stock,
 * batch or expiry table at all. See the header of `supply.ts` for the measurements.
 *
 * So the page is now organised around the one thing the database does record, and records
 * well: 53,048 administrations across three streams, each with a named product, a date, a
 * site, a species and an animal. That is a real pharmacy page. It is not the page that was
 * here, and it does not pretend to be — the sections that asked questions the data cannot
 * answer are gone rather than filled.
 *
 * The design language is untouched: same hero, same `Section`, same `Stack`, same marks.
 */

import { useMemo, useState } from 'react'
import { ClipboardList, Dna, MapPin, Pill, Search, SquareStack, TrendingUp } from 'lucide-react'
import { ACCENT_INK, FAINT, Figure, HERO_INK, Rule, Section, Snapshot, Stack, fmt } from '../../exec/system'
import { RangeTabs, useChartRange } from '../../exec/range'
import { useSheet } from '../sheet'
import { useScope } from '../scope'
import { MoreRows, usePaged } from '../perf'
import { AccentProvider } from '../../exec/system'
import { DrillList, DrillRow } from './kit'
import { FindField } from '../filters'
import { STREAMS, bySite, bySpecies, matches, usage, type MedicineUse, type Stream } from './supply'
import { records } from '../../core/query'
import { shortDate } from '../../core/calendar'

/** MD3_Antz — the pharmacy ramp, unchanged. */
const PHARMACY_ACCENT = '#1f515b'

export default function Pharmacy() {
  return (
    <AccentProvider value={PHARMACY_ACCENT}>
      <PharmacyHero />
      <Stack>
        <StreamSplit />
        <UsageTrend />
        <MedicineTable />
        <SiteSplit />
        <SpeciesSplit />
        <Records />
      </Stack>
    </AccentProvider>
  )
}

/**
 * A section that keeps the whole column past the two-column break.
 *
 * `Stack` splits at 760px of column and a container query inside a section still measures the
 * column, so a table told to appear at 720 would appear inside a 455px half.
 */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div className="min-w-0 @[760px]:col-span-2">{children}</div>
)

/* ── 1 · hero ────────────────────────────────────────────────────────────── */

function PharmacyHero() {
  const { scope } = useScope()
  const use = useMemo(() => usage(scope.site?.key ?? null, scope.win), [scope])

  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <div className="flex items-end justify-between gap-4">
          <span>
            <Figure value={fmt(use.total)} size={48} color={HERO_INK} />
            <p className="mt-1 flex items-center gap-2 text-body text-[#3d3a34]">
              <Pill size={15} strokeWidth={1.75} style={{ color: PHARMACY_ACCENT }} aria-hidden />
              Administrations · {scope.win.label.toLowerCase()}
            </p>
          </span>
          <span className="shrink-0 pb-1 text-right text-caption" style={{ color: FAINT }}>
            {scope.site?.name ?? 'Overall'} · {scope.win.window}
            <br />
            {fmt(use.byMedicine.length)} products
          </span>
        </div>
        <div className="mt-5 flex items-stretch border-t border-[#f0efec] pt-4">
          {use.streams.map((s, i) => (
            <span key={s.stream} className={`min-w-0 flex-1 ${i ? 'border-l border-[#f0efec] pl-4' : 'pr-4'}`}>
              <Figure value={fmt(s.units)} size={28} />
              <span className="mt-1 block text-caption text-[#6d6860]">
                {s.label} · {s.medicines}
              </span>
            </span>
          ))}
        </div>
        {/* WHAT THIS HERO NO LONGER SAYS. It led with a rupee figure — the month's medicine
            spend — and carried expiry write-off and pending request value beside it. There is
            no cost column anywhere in the source with a non-zero value in it. */}
      </section>
    </div>
  )
}

/* ── 2 · the three streams ───────────────────────────────────────────────── */

/**
 * Which programme issued what.
 *
 * The only categorisation the source supports — see `Stream` in `supply.ts`. It replaces a
 * four-way fold (Medication / Vaccination / Supplements / Consumables) over eight
 * pharmacological classes that the database does not record.
 */
function StreamSplit() {
  const { scope } = useScope()
  const use = useMemo(() => usage(scope.site?.key ?? null, scope.win), [scope])

  return (
    <Section icon={SquareStack} label="By programme" aside={`${fmt(use.total)} administrations`}>
      <DrillList>
        {use.streams.map((s) => (
          <DrillRow
            key={s.stream}
            label={s.label}
            sub={`${s.medicines} products · ${Math.round(s.percent)}%`}
            value={fmt(s.units)}
          />
        ))}
      </DrillList>
    </Section>
  )
}

/* ── 3 · the trend ───────────────────────────────────────────────────────── */

function UsageTrend() {
  const { scope } = useScope()
  const range = useChartRange()
  const site = scope.site?.key ?? null

  const bands = useMemo(() => {
    const n = 12
    const size = Math.max(1, Math.floor(range.win.days / n))
    return Array.from({ length: n }, (_, i) => {
      const from = range.win.from + i * size
      const to = i === n - 1 ? range.win.to : from + size - 1
      const win = { ...range.win, from, to, days: to - from + 1 }
      const total = STREAMS.reduce((sum, s) => sum + usage(site, win).streams.find((x) => x.slug === s.slug)!.units, 0)
      return { from, to, total }
    })
  }, [range.win, site])

  const peak = Math.max(1, ...bands.map((b) => b.total))
  const total = bands.reduce((n, b) => n + b.total, 0)

  return (
    <Section icon={TrendingUp} label="Administration trend" aside={`${fmt(total)} · ${range.win.window}`}>
      <RangeTabs range={range} />
      <div className="mt-3 flex h-[120px] items-end gap-[3px]">
        {bands.map((b) => (
          <span
            key={b.from}
            className="min-w-0 flex-1 rounded-t-[3px]"
            style={{
              height: `${Math.max(2, (b.total / peak) * 100)}%`,
              backgroundColor: PHARMACY_ACCENT,
              opacity: 0.85,
            }}
            title={`${shortDate(b.from)} – ${shortDate(b.to)} · ${fmt(b.total)}`}
          />
        ))}
      </div>
      <p className="mt-2 text-caption" style={{ color: FAINT }}>
        {shortDate(bands[0]?.from ?? 0)} – {shortDate(bands[bands.length - 1]?.to ?? 0)}
      </p>
    </Section>
  )
}

/* ── 4 · the products ────────────────────────────────────────────────────── */

const STREAM_OF = new Map(STREAMS.map((s) => [s.key, s]))

/** Every product issued in the window, searchable and paged. */
function MedicineTable() {
  const { scope } = useScope()
  const { open } = useSheet()
  const [query, setQuery] = useState('')
  const [stream, setStream] = useState<Stream | 'all'>('all')

  const use = useMemo(() => usage(scope.site?.key ?? null, scope.win), [scope])
  const rows = useMemo(
    () => use.byMedicine.filter((m) => (stream === 'all' || m.stream === stream) && matches(query, m.name, m.stream)),
    [use.byMedicine, query, stream],
  )
  const page = usePaged<MedicineUse>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    20,
    [rows.length, query, stream],
  )

  return (
    <Wide>
      <Section icon={Pill} label="Medicines issued" aside={`${fmt(rows.length)} products`}>
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...STREAMS.map((s) => s.key)] as const).map((k) => {
            const on = stream === k
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setStream(k as Stream | 'all')}
                className={`card-press shrink-0 rounded-full px-3 py-[6px] text-caption font-medium whitespace-nowrap transition-colors ${
                  on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
                }`}
              >
                {k === 'all' ? 'All' : (STREAM_OF.get(k)?.label ?? k)}
              </button>
            )
          })}
        </div>
        <Rule label="Find" />
        <FindField value={query} onChange={setQuery} placeholder="Product name" />
        <div className="mt-3">
          <DrillList>
            {page.rows.map((m) => (
              <DrillRow
                key={m.id}
                label={m.name}
                sub={`${m.stream} · ${m.percent < 0.1 ? '<0.1' : m.percent.toFixed(1)}%`}
                value={fmt(m.units)}
                onOpen={() =>
                  open({
                    title: m.name,
                    eyebrow: `${m.stream} · ${scope.win.window}`,
                    body: <MedicineSheet medicine={m} />,
                  })
                }
              />
            ))}
          </DrillList>
          <MoreRows page={page} noun="products" />
        </div>
        <p className="pt-3 text-caption" style={{ color: ACCENT_INK }}>
          Products named as the source records them — {fmt(use.byMedicine.length)} across the three programmes.
        </p>
      </Section>
    </Wide>
  )
}

/** What one product's issue looks like across the window. */
function MedicineSheet({ medicine }: { medicine: MedicineUse }) {
  const { scope } = useScope()
  const s = STREAM_OF.get(medicine.stream)

  return (
    <>
      <div className="px-[var(--gutter)] pb-3">
        <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={fmt(medicine.units)} size={40} color={HERO_INK} />
          <p className="mt-1 text-body text-[#3d3a34]">Administrations · {medicine.name}</p>
          <p className="mt-1 text-caption" style={{ color: FAINT }}>
            {medicine.stream} · {scope.site?.name ?? 'Overall'} · {scope.win.window}
          </p>
        </div>
      </div>
      <Stack>
        <Section icon={Pill} label="Product">
          <Snapshot
            cols={2}
            items={[
              { label: 'Administrations', value: fmt(medicine.units) },
              { label: 'Share of all issue', value: `${medicine.percent.toFixed(1)}%` },
            ]}
          />
          {/* NO UNIT COST, NO STOCK LEVEL, NO EXPIRY. The sheet used to carry a catalogue
              number, a unit cost, a requested value, a pending count and an expiry write-off,
              and all five were generated. The source names the product and counts the
              administrations; that is the sheet. */}
        </Section>
        <Section icon={ClipboardList} label="Programme" aside={s?.label}>
          <p className="text-caption" style={{ color: FAINT }}>
            Issued through the {s?.label.toLowerCase() ?? 'clinical'} stream. Counts here are administrations
            recorded against an animal, not units drawn from a store — the source has no store.
          </p>
        </Section>
      </Stack>
    </>
  )
}

/* ── 5 · where and to what ───────────────────────────────────────────────── */

function SiteSplit() {
  const { scope } = useScope()
  const rows = useMemo(() => bySite(scope.site?.key ?? null, scope.win), [scope])

  return (
    <Section icon={MapPin} label="By site" aside={`${rows.length} sites`}>
      <DrillList>
        {rows.slice(0, 20).map((r) => (
          <DrillRow key={r.key} label={r.name} sub={`${Math.round(r.percent)}%`} value={fmt(r.units)} />
        ))}
      </DrillList>
      {rows.length === 0 && (
        <p className="text-caption" style={{ color: FAINT }}>
          Nothing was administered in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

function SpeciesSplit() {
  const { scope } = useScope()
  const rows = useMemo(() => bySpecies(scope.site?.key ?? null, scope.win, 20), [scope])

  return (
    <Section icon={Dna} label="By species" aside={`top ${rows.length}`}>
      <DrillList>
        {rows.map((r) => (
          <DrillRow key={r.key} label={r.name} sub={`${Math.round(r.percent)}%`} value={fmt(r.units)} />
        ))}
      </DrillList>
      {rows.length === 0 && (
        <p className="text-caption" style={{ color: FAINT }}>
          Nothing was administered in {scope.win.window}.
        </p>
      )}
    </Section>
  )
}

/* ── 6 · the records ─────────────────────────────────────────────────────── */

/** The individual administrations behind the figures above. */
function Records() {
  const { scope } = useScope()
  const [stream, setStream] = useState<Stream>('Prescription')
  const slug = STREAM_OF.get(stream)?.slug ?? 'pharmacy'
  const page = usePaged(
    (offset, limit) => {
      const p = records(scope, slug, offset, limit)
      return { rows: p.rows, total: p.total }
    },
    15,
    [slug, scope.win.key, scope.win.from, scope.site?.key],
  )

  return (
    <Wide>
      <Section icon={Search} label="Records" aside={`${fmt(page.total)} · ${scope.win.window}`}>
        <div className="flex flex-wrap gap-1.5">
          {STREAMS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={stream === s.key}
              onClick={() => setStream(s.key)}
              className={`card-press shrink-0 rounded-full px-3 py-[6px] text-caption font-medium whitespace-nowrap transition-colors ${
                stream === s.key ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <DrillList>
            {page.rows.map((ev) => (
              <DrillRow
                key={ev.id}
                label={ev.detail}
                sub={`${ev.speciesName} · ${ev.animalId || '—'} · ${shortDate(ev.day)}`}
                value=""
              />
            ))}
          </DrillList>
          <MoreRows page={page} noun="records" />
        </div>
      </Section>
    </Wide>
  )
}
