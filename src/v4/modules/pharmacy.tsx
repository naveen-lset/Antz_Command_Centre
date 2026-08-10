/**
 * PHARMACY — usage, requests, the queue, expiry, and what ran out.
 *
 * The one module in the set whose second axis is money, and the only one whose subject is a
 * supply chain rather than a population. That is what the page is composed to look like: four
 * usage bands stacked into a column per period, an aging queue drawn as one segmented run of
 * days, and a central store split against six site dispensaries. None of those marks appears on
 * any other page, so Pharmacy is recognisable before the title is read — while every colour,
 * type size and card in it is the same design system as everywhere else.
 *
 * WHAT IS DERIVED AND WHAT IS MODELLED. Usage is the existing `pharmacy` flow, grouped by the
 * medicine each dispensing event was already attributed to — nothing here re-derives it. The
 * request queue, the expiry ledger and the availability list had no model at all and are
 * generated deterministically in `supply.ts`, in the same idiom `core/animals.ts` uses for the
 * collection: a pure function of a key, stable on every read, never stored and never random.
 *
 * ONE SCOPE, AND EVERY SECTION OBEYS IT. Pick a site and the hero, the bands, the categories,
 * the request table, the queue, the aging, the expiry split, the shortages and the medicine
 * records all recut to it. The toolbar states the scope so it never has to be inferred.
 *
 * TWO CLOCKS, HELD APART. A window says WHEN a request was raised; aging says HOW LONG it has
 * been waiting. Cutting the queue to the window would empty the 60+ bucket exactly when it
 * matters, so the queue is read as of the window's last day over its own lookback, and the
 * window is stated separately as how many of those were raised inside it.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Building2,
  ClipboardList,
  Hourglass,
  Layers,
  MapPin,
  PackageX,
  Pill,
  Search,
  SlidersHorizontal,
  SquareStack,
  TrendingUp,
  Warehouse,
  X,
} from 'lucide-react'
import { resolveWindow, shortDate, type Win, type WindowKey } from '../../core/calendar'
import { SITES } from '../../core/world'
import {
  ACCENT_INK,
  Composition,
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  TRACK,
  VALUE,
  fmt,
  mix,
  step,
  useAccent,
} from '../../exec/system'
import { TapList, TapRow } from '../panels'
import { useSheet } from '../sheet'
import { useScope } from '../scope'
import { MoreRows, usePaged } from '../perf'
import {
  AGING,
  CATEGORIES,
  RANGES,
  rangeForWindow,
  agingBuckets,
  expirySplit,
  inr,
  medCode,
  matches,
  medicinesIn,
  openRequests,
  pendingDays,
  requestedByCategory,
  requestsBySite,
  requestsIn,
  siteOverview,
  sortRequests,
  sortSites,
  statusOf,
  unavailable,
  unitCost,
  usage,
  usageBands,
  type Category,
  type RequestSort,
  type RequestStatus,
  type Req,
  type SiteRequests,
  type SiteRow,
  type SiteSort,
} from './supply'
import {
  AgingPanel,
  AvailabilityPanel,
  CategoryPanel,
  ExpiredPanel,
  ExpiryPanel,
  MedicinePanel,
  PendingPanel,
  SitePharmacyPanel,
  UsagePanel,
  type Scope,
} from './pharmacySheets'

/* ── the contextual lens ─────────────────────────────────────────────────── */

/**
 * The secondary filters, behind the toolbar's button rather than on the page.
 *
 * Each one is applied where it means something and nowhere else — a CITES-style lens that
 * silently recut sections it cannot describe would be worse than no filter. The chip row under
 * the toolbar says which are on, and each card's aside names the facet it is honouring.
 */
interface Facets {
  category: 'all' | Category
  status: 'all' | RequestStatus
  aging: 'all' | string
  store: 'all' | 'central' | 'local'
  availability: 'all' | 'unavailable'
}

const NO_FACETS: Facets = { category: 'all', status: 'all', aging: 'all', store: 'all', availability: 'all' }
const facetsOn = (f: Facets) => Object.values(f).filter((v) => v !== 'all').length

/* ── the page ────────────────────────────────────────────────────────────── */

export default function Pharmacy() {
  const { scope: global, windowKey } = useScope()
  const { open } = useSheet()
  const win = global.win
  const siteKey = global.site?.key ?? null
  const asOf = win.to
  const scope: Scope = useMemo(() => ({ siteKey, win, asOf }), [siteKey, win, asOf])

  const [facets, setFacets] = useState<Facets>(NO_FACETS)
  const [query, setQuery] = useState('')

  /* The sheet keeps the element it was handed, so a filter sheet reading this closure would
     show the values it opened with for ever. It holds a draft and writes back through a ref. */
  const applyRef = useRef(setFacets)
  applyRef.current = setFacets
  const applyFacets = useCallback((next: Facets) => applyRef.current(next), [])

  /* ── the four reads every section is built from ── */
  const use = useMemo(() => usage(siteKey, win), [siteKey, win])
  const raised = useMemo(() => requestsIn(siteKey, win), [siteKey, win])
  const queue = useMemo(() => openRequests(siteKey, asOf), [siteKey, asOf])
  const expiry = useMemo(() => expirySplit(siteKey, win), [siteKey, win])
  const shortages = useMemo(() => unavailable(siteKey, asOf), [siteKey, asOf])

  /* Facets narrow the request-level reads. Usage is an event count and carries no status, so
     only the category facet touches it — stated in each card's aside rather than assumed. */
  const keptRequests = useMemo(
    () =>
      raised.filter(
        (r) =>
          (facets.category === 'all' || r.category === facets.category) &&
          (facets.status === 'all' || statusOf(r, asOf) === facets.status),
      ),
    [raised, facets.category, facets.status, asOf],
  )

  /* Section 4 asks for a category's cost where cost data exists. Usage is a dispensing count
     and carries none; what these medicines COST is what the sites asked to spend on them, so
     the figure beside a category is its requested value rather than an invented issue value. */
  const requestedCost = useMemo(() => requestedByCategory(raised), [raised])

  const buckets = useMemo(() => agingBuckets(queue, asOf), [queue, asOf])
  const shownBuckets = facets.aging === 'all' ? buckets : buckets.filter((b) => b.key === facets.aging)
  /* The open queue under the category facet, so the request table's Pending column means the
     same thing as the hero's and the aging bands'. */
  const keptQueue = useMemo(
    () => queue.filter((r) => facets.category === 'all' || r.category === facets.category),
    [queue, facets.category],
  )
  const pendingCost = queue.reduce((n, r) => n + r.cost, 0)
  const raisedInWindow = queue.filter((r) => r.day >= win.from && r.day <= win.to).length

  const scopeName = global.site ? global.site.name : 'Overall'
  const lensed = facetsOn(facets) > 0

  return (
    <>
      {/* 1 · TOOLBAR. The router's header already carries the back chevron, the title and the
          date and site pills; this adds the page's own three — the scope statement, medicine
          search, and the contextual filters. Nothing shared is modified. */}
      <Toolbar
        scopeName={scopeName}
        win={win}
        medicines={use.byMedicine.length}
        query={query}
        onQuery={setQuery}
        facets={facets}
        onApply={applyFacets}
      />

      {/* 2 · HERO. Five figures, one composition — the brief's "do not create a large collection
          of generic KPI cards". The headline is usage; the four beneath it each open their own
          sheet, so the hero is the page's index as well as its summary. */}
      <PharmacyHero
        units={use.total}
        window={win.window}
        tiles={[
          { label: 'Requested', value: inr(raised.reduce((n, r) => n + r.cost, 0)), note: `${fmt(raised.length)} requests`, onOpen: () => open({ title: 'Requests', eyebrow: 'Pharmacy', body: <SiteRequestsSheet scope={scope} /> }) },
          { label: 'Pending', value: fmt(queue.length), note: inr(pendingCost), tone: queue.length ? 'warn' : undefined, onOpen: () => open({ title: 'Central Pharmacy', eyebrow: 'Pending', body: <PendingPanel scope={scope} /> }) },
          { label: 'Expired', value: inr(expiry.total), note: `${expiry.central.lots + expiry.local.lots} batches`, tone: expiry.total ? 'bad' : undefined, onOpen: () => open({ title: 'Expired medicine', eyebrow: 'Pharmacy', body: <ExpiryPanel scope={scope} /> }) },
          { label: 'Unavailable', value: fmt(shortages.length), note: 'medicines', tone: shortages.length ? 'bad' : undefined, onOpen: () => open({ title: 'Unavailable medicines', eyebrow: 'Pharmacy', body: <ShortagesSheet scope={scope} /> }) },
        ]}
        onOpenUsage={() => open({ title: 'Usage', eyebrow: 'Pharmacy', body: <UsagePanel scope={scope} /> })}
      />

      <Stack>
        {/* 3 · USAGE TREND — the page's signature mark. Four bands stacked into one column per
            period, so the total and its composition are read in a single glance rather than in
            four charts stacked down the card. */}
        <Wide>
          <UsageTrend scope={scope} scopeName={scopeName} windowKey={windowKey} />
        </Wide>

        {/* 4 · USAGE BY CATEGORY. Compact by instruction — four rows, not four cards. */}
        <Wide>
        <Section
          icon={Layers}
          label="Usage by category"
          aside={facets.category === 'all' ? `${fmt(use.total)} units` : facets.category}
        >
          <Composition items={use.categories.map((c) => ({ label: c.category, value: c.units }))} unit="units issued" />
          <Rule label="Tap to drill" />
          <TapList>
            {use.categories
              .filter((c) => facets.category === 'all' || c.category === facets.category)
              .map((c) => (
                <TapRow
                  key={c.category}
                  label={c.category}
                  sub={`${c.medicines} items · ${c.percent.toFixed(1)}% · ${inr(requestedCost.get(c.category) ?? 0)} requested`}
                  value={fmt(c.units)}
                  bar={c.percent}
                  onOpen={
                    c.units > 0
                      ? () => open({ title: c.category, eyebrow: 'Usage', body: <CategoryPanel category={c.category} scope={scope} /> })
                      : undefined
                  }
                />
              ))}
          </TapList>
        </Section>
        </Wide>

        {/* 5 · MEDICINES REQUESTED FROM SITES. All sites, sorted on any column — dense table
            where there is room, stacked rows where there is not. */}
        <Wide>
          <SiteRequestsCard rows={keptRequests} queue={keptQueue} scoped={siteKey} scope={scope} lens={facets} />
        </Wide>

        {/* 6 · CENTRAL PHARMACY PENDING. The queue as of the reading date, with how much of it
            the selected window accounts for stated rather than implied. */}
        <Wide>
        <Section icon={Building2} label="Central pharmacy pending" aside={`open at ${shortDate(asOf)}`}>
          <Snapshot
            cols={3}
            items={[
              { label: 'Pending', value: fmt(queue.length), note: 'requests', tone: queue.length ? 'warn' : undefined },
              { label: 'Est. cost', value: inr(pendingCost) },
              { label: 'In window', value: fmt(raisedInWindow), note: win.window },
            ]}
          />
          <div className="mt-4 border-t border-[#f0efec] pt-2">
            <TapList>
              <TapRow
                lead={ClipboardList}
                label="Open requests"
                sub="Every request waiting on the central store"
                value="Open"
                onOpen={() => open({ title: 'Central Pharmacy', eyebrow: 'Pending', body: <PendingPanel scope={scope} /> })}
              />
            </TapList>
          </div>
        </Section>
        </Wide>

        {/* 7 · PENDING AGING — one run of days split four ways, which is the section's whole
            point: a queue of 160 is fine, a queue with 24 items past two months is not, and
            only the bands can tell them apart. */}
        <Wide>
          <AgingCard
            buckets={buckets}
            shown={shownBuckets}
            total={queue.length}
            asOf={asOf}
            lens={facets.aging}
            onOpen={(key, label) => open({ title: label, eyebrow: 'Pending', body: <AgingPanel bucketKey={key} scope={scope} /> })}
          />
        </Wide>

        {/* 8 · 9 · EXPIRED COST, then where the value sits. Two cards rather than one: the
            figure is the executive read and the central-against-local split is the operational
            one, and they are answered at different grains. */}
        <Wide>
          <Section icon={PackageX} label="Expired medicine cost" aside={`${expiry.central.lots + expiry.local.lots} batches`}>
            <div className="flex items-baseline gap-3">
              <Figure value={inr(expiry.total)} size={34} color={expiry.total ? TONE.bad : VALUE} />
              <span className="text-[12px]" style={{ color: FAINT }}>
                written off in {win.window}
              </span>
            </div>
            <Rule label={siteKey ? 'Site dispensary' : 'Central against local'} />
            {siteKey ? (
              <p className="text-[12px]" style={{ color: FAINT }}>
                Central Pharmacy stock is held for the whole collection and is not attributed to a
                site — clear the site filter to see it.
              </p>
            ) : (
              <Composition
                items={[
                  { label: 'Central', value: expiry.central.cost },
                  { label: 'Local', value: expiry.local.cost },
                ]}
              />
            )}
            <div className="mt-4">
              <TapList>
                {(facets.store === 'all' || facets.store === 'central') && !siteKey && (
                  <TapRow
                    lead={Building2}
                    label="Central Pharmacy"
                    sub={`Master store · ${expiry.central.lots} ${expiry.central.lots === 1 ? 'batch' : 'batches'}`}
                    value={inr(expiry.central.cost)}
                    tone={expiry.central.cost ? 'bad' : undefined}
                    onOpen={expiry.central.lots ? () => open({ title: 'Central Pharmacy', eyebrow: 'Expired medicine', body: <ExpiredPanel side="central" scope={scope} /> }) : undefined}
                  />
                )}
                {(facets.store === 'all' || facets.store === 'local') && (
                  <TapRow
                    lead={Warehouse}
                    label="Local pharmacies"
                    sub={`${expiry.bySite.filter((b) => b.lots > 0).length} site dispensaries · ${expiry.local.lots} ${expiry.local.lots === 1 ? 'batch' : 'batches'}`}
                    value={inr(expiry.local.cost)}
                    tone={expiry.local.cost ? 'bad' : undefined}
                    onOpen={expiry.local.lots ? () => open({ title: 'Local pharmacies', eyebrow: 'Expired medicine', body: <ExpiredPanel side="local" scope={scope} /> }) : undefined}
                  />
                )}
              </TapList>
            </div>
          </Section>
        </Wide>

        {/* Where the expired value sits, site by site. */}
        <Wide>
        <Section
          icon={MapPin}
          label="Expired by site"
          aside={`${expiry.bySite.filter((b) => b.lots > 0).length} ${expiry.bySite.filter((b) => b.lots > 0).length === 1 ? 'site' : 'sites'}`}
        >
          <TapList>
            {expiry.bySite.map((b) => (
              <TapRow
                key={b.key}
                label={b.name}
                sub={`${b.code} · ${b.lots} ${b.lots === 1 ? 'batch' : 'batches'}`}
                value={inr(b.cost)}
                bar={(b.cost / Math.max(1, expiry.bySite[0]?.cost ?? 1)) * 100}
                onOpen={b.lots ? () => open({ title: b.name, eyebrow: 'Expired medicine', body: <ExpiredPanel side="local" scope={scope} pharmacySite={b.key} /> }) : undefined}
              />
            ))}
          </TapList>
          {expiry.bySite.every((b) => b.lots === 0) && (
            <p className="text-[13px] text-[#6d6860]">Nothing expired at a site pharmacy in {win.window}.</p>
          )}
        </Section>
        </Wide>

        {/* 10 · UNAVAILABLE MEDICINES. Highly visible, compact, and ordered by how many sites
            are waiting — which is the question the section exists to answer. */}
        <Wide>
          <Section
            icon={PackageX}
            label="Unavailable medicines"
            aside={`${shortages.length} · ${fmt(shortages.reduce((n, u) => n + u.sites.length, 0))} site requests`}
          >
            {shortages.length === 0 ? (
              <p className="text-[13px] text-[#6d6860]">Every request was supplied in this scope.</p>
            ) : (
              <TapList>
                {shortages.map((u) => (
                  <TapRow
                    key={u.medicineId}
                    lead={Pill}
                    label={u.name}
                    sub={`${u.category} · ${fmt(u.qty)} units requested`}
                    value={`${u.sites.length} ${u.sites.length === 1 ? 'site' : 'sites'}`}
                    tone="bad"
                    bar={(u.sites.length / Math.max(1, shortages[0].sites.length)) * 100}
                    onOpen={() => open({ title: u.name, eyebrow: 'Unavailable', body: <AvailabilityPanel medicineId={u.medicineId} scope={scope} /> })}
                  />
                ))}
              </TapList>
            )}
          </Section>
        </Wide>

        {/* 11 · SITE-WISE PHARMACY OVERVIEW. Six figures per site and no others. */}
        <Wide>
          <SiteOverviewCard win={win} asOf={asOf} scoped={siteKey} scope={scope} />
        </Wide>

        {/* 12 · MEDICINE RECORDS. The search surface — every medicine in the registry with its
            usage, its request state and its availability, filtered by the toolbar's box. */}
        <Wide>
          <MedicineRecords
            scope={scope}
            query={query}
            onQuery={setQuery}
            facets={facets}
            usage={use}
            requests={raised}
            queue={queue}
            shortages={shortages}
          />
        </Wide>
      </Stack>

      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
        {scopeName} · pharmacy {win.window}
        {lensed ? ' · filtered' : ''}
      </p>
    </>
  )
}

/* ── shared pieces ───────────────────────────────────────────────────────── */

/**
 * A card that spans the stack once it has split into two columns.
 *
 * EVERY SECTION ON THIS PAGE USES IT, and that is a decision rather than an oversight. Grid
 * placement will not pull a later card up into an empty half, so a half-width card sitting
 * between two full-width ones leaves the column beside it blank — and this page alternated
 * three times, which showed as three holes down a tablet in landscape. Nothing here wants half
 * a column anyway: every section is a wide table, a stacked band or a run of record rows. The
 * two-column work happens INSIDE the cards, where the hero's tiles go four-up, the legends go
 * two-up, and the tables reveal their fifth, sixth and seventh columns.
 */
const Wide = ({ children }: { children: React.ReactNode }) => (
  <div className="@[760px]:col-span-2">{children}</div>
)

/* ── the hero ────────────────────────────────────────────────────────────── */

/**
 * One headline and four tappable figures under a hairline.
 *
 * `Hero` from the design system carries three supporting stats and none of them opens anything;
 * this page needs four and every one of them is a door, so the anatomy is the same — figure,
 * word, status, ruled strip — with buttons in the strip.
 */
function PharmacyHero({
  units,
  window,
  tiles,
  onOpenUsage,
}: {
  units: number
  window: string
  tiles: { label: string; value: string; note: string; tone?: 'warn' | 'bad'; onOpen: () => void }[]
  onOpenUsage: () => void
}) {
  const accent = useAccent()
  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <button type="button" onClick={onOpenUsage} className="card-press block text-left">
          <Figure value={fmt(units)} size={58} color={HERO_INK} />
          <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
            <Pill size={15} strokeWidth={1.75} style={{ color: accent }} aria-hidden />
            Units issued
            <span className="text-[12px]" style={{ color: ACCENT_INK }} aria-hidden>
              ›
            </span>
          </p>
        </button>
        <p className="mt-2.5 text-[12px]" style={{ color: FAINT }}>
          {window}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-[#f0efec] pt-4 @[460px]:grid-cols-4">
          {tiles.map((t, i) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onOpen}
              className={`card-press min-w-0 text-left @[460px]:px-3 ${i ? '@[460px]:border-l @[460px]:border-[#f0efec]' : ''} ${
                i === 0 ? '@[460px]:pl-0' : ''
              }`}
            >
              <Figure value={t.value} size={22} color={t.tone ? TONE[t.tone] : VALUE} />
              <span className="mt-0.5 block truncate text-[12px] text-[#3d3a34]">{t.label}</span>
              <span className="mt-0.5 block truncate text-[11px]" style={{ color: FAINT }}>
                {t.note}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── the toolbar ─────────────────────────────────────────────────────────── */

function Toolbar({
  scopeName,
  win,
  medicines,
  query,
  onQuery,
  facets,
  onApply,
}: {
  scopeName: string
  win: Win
  medicines: number
  query: string
  onQuery: (v: string) => void
  facets: Facets
  onApply: (f: Facets) => void
}) {
  const { open } = useSheet()
  const on = facetsOn(facets)

  return (
    <div className="px-[var(--gutter-lg)] pb-3">
      <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card-sm)]">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate text-[13px] font-medium text-[#1c1a16]">
            {scopeName} · {win.window}
          </p>
          <p className="shrink-0 text-[11px] whitespace-nowrap" style={{ color: FAINT }}>
            {medicines} medicines issued
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[#f7f6f3] px-3 py-2">
            <Search size={14} strokeWidth={2} className="shrink-0" style={{ color: FAINT }} aria-hidden />
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Medicine, category or code"
              aria-label="Search medicines"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1c1a16] outline-none placeholder:text-[#9b958b]"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQuery('')}
                aria-label="Clear search"
                className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full active:bg-[#eceae5]"
              >
                <X size={13} strokeWidth={2} style={{ color: '#6d6860' }} aria-hidden />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => open({ title: 'Filters', eyebrow: 'Pharmacy', body: <FacetSheet initial={facets} onApply={onApply} /> })}
            aria-label="Filters"
            className={`card-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium ${
              on ? 'bg-[#123a2c] text-white' : 'bg-[#f7f6f3] text-[#3d3a34]'
            }`}
          >
            <SlidersHorizontal size={13} strokeWidth={2} aria-hidden />
            Filter
            {on > 0 && <span className="tabular-nums opacity-70">{on}</span>}
          </button>
        </div>

        {on > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {chipsOf(facets).map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-[#f4f3ef] py-[4px] pr-1.5 pl-2.5 text-[11.5px] font-medium text-[#55524a]"
              >
                {c.label}
                <button
                  type="button"
                  onClick={() => onApply({ ...facets, [c.key]: 'all' } as Facets)}
                  aria-label={`Clear ${c.label}`}
                  className="grid size-[16px] shrink-0 place-items-center rounded-full bg-[#e4e2dc]"
                >
                  <X size={10} strokeWidth={2.5} aria-hidden />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => onApply(NO_FACETS)}
              className="rounded-full px-2 py-[4px] text-[11.5px] font-semibold"
              style={{ color: ACCENT_INK }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function chipsOf(f: Facets): { key: keyof Facets; label: string }[] {
  const out: { key: keyof Facets; label: string }[] = []
  if (f.category !== 'all') out.push({ key: 'category', label: f.category })
  if (f.status !== 'all') out.push({ key: 'status', label: f.status })
  if (f.aging !== 'all') out.push({ key: 'aging', label: AGING.find((a) => a.key === f.aging)?.label ?? f.aging })
  if (f.store !== 'all') out.push({ key: 'store', label: f.store === 'central' ? 'Central Pharmacy' : 'Local pharmacies' })
  if (f.availability !== 'all') out.push({ key: 'availability', label: 'Unavailable only' })
  return out
}

function FacetSheet({ initial, onApply }: { initial: Facets; onApply: (f: Facets) => void }) {
  const { back } = useSheet()
  const [draft, setDraft] = useState(initial)
  const set = <K extends keyof Facets>(key: K, value: Facets[K]) => setDraft((d) => ({ ...d, [key]: value }))

  return (
    <>
      <Stack>
        <Section icon={Layers} label="Category">
          <Chips
            options={[['all', 'All'], ...CATEGORIES.map((c) => [c, c] as [string, string])]}
            value={draft.category}
            onPick={(v) => set('category', v as Facets['category'])}
          />
        </Section>
        <Section icon={ClipboardList} label="Request status">
          <Chips
            options={[
              ['all', 'All'],
              ['Pending', 'Pending'],
              ['Fulfilled', 'Fulfilled'],
              ['Unavailable', 'Unavailable'],
            ]}
            value={draft.status}
            onPick={(v) => set('status', v as Facets['status'])}
          />
        </Section>
        <Section icon={Hourglass} label="Aging">
          <Chips
            options={[['all', 'All'], ...AGING.map((a) => [a.key, a.label] as [string, string])]}
            value={draft.aging}
            onPick={(v) => set('aging', v)}
          />
        </Section>
        <Section icon={Building2} label="Pharmacy">
          <Chips
            options={[
              ['all', 'All'],
              ['central', 'Central'],
              ['local', 'Local / site'],
            ]}
            value={draft.store}
            onPick={(v) => set('store', v as Facets['store'])}
          />
        </Section>
        <Section icon={PackageX} label="Availability">
          <Chips
            options={[
              ['all', 'All medicines'],
              ['unavailable', 'Unavailable only'],
            ]}
            value={draft.availability}
            onPick={(v) => set('availability', v as Facets['availability'])}
          />
        </Section>
      </Stack>
      <div className="flex gap-2 px-[var(--gutter-lg)] pt-1 pb-3">
        <button
          type="button"
          onClick={() => {
            onApply(NO_FACETS)
            back()
          }}
          className="card-press flex-1 rounded-[11px] border border-[#eceae5] bg-white py-2.5 text-[13px] font-semibold text-[#3d3a34]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(draft)
            back()
          }}
          className="card-press flex-[2] rounded-[11px] py-2.5 text-[13px] font-semibold text-white"
          style={{ backgroundColor: '#123a2c' }}
        >
          Apply
        </button>
      </div>
    </>
  )
}

/** The chip row every facet and sort control on this page shares. */
function Chips({
  options,
  value,
  onPick,
}: {
  options: [string, string][]
  value: string
  onPick: (v: string) => void
}) {
  return (
    <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
      {options.map(([key, label]) => {
        const on = key === value
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(key)}
            className={`shrink-0 rounded-full px-2.5 py-[5px] text-[11.5px] font-medium whitespace-nowrap transition-colors ${
              on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ── 3 · the stacked usage bands ─────────────────────────────────────────── */

/**
 * Four bands, one column per period.
 *
 * THE PAGE'S SIGNATURE MARK, and deliberately not a line. A line through "units issued per
 * week" would say what the total did and nothing about what it was made of, and the composition
 * is half the question here. Stacking gives both readings from one shape: column height is the
 * total, band depth is the mix, and a month where consumables doubled is visible without a
 * second chart.
 *
 * Bands are lightness steps of the one accent, in a fixed order — Medication darkest — so the
 * legend is learnt once and holds across every column and every scope.
 */
function UsageTrend({ scope, scopeName, windowKey }: { scope: Scope; scopeName: string; windowKey: WindowKey }) {
  const accent = useAccent()
  const { open } = useSheet()
  /**
   * The chart FOLLOWS the page's window until the reader picks a chip, then holds.
   *
   * `null` means following. It cannot be a `useState` initialiser: the page does not remount
   * when the window changes — the router keys on the route, deliberately, so that re-cutting
   * the dates re-reads the figures in place — so an initialiser would latch the window the
   * reader arrived on and the chart would go on saying July under a hero saying last week.
   * Following by default also makes the chart's total the hero's total, rather than a span
   * that lands a day off it and reads as a contradiction two inches below.
   */
  const [picked, setRange] = useState<string | null>(null)
  const range = picked ?? rangeForWindow(windowKey)

  const win: Win = useMemo(() => {
    if (range === 'custom') return scope.win
    /* Every preset resolves through the global filter's own windows, so "This month" and
       "6 months" mean the same spans here that the header would give. */
    const spec = RANGES.find((r) => r.key === range)
    return spec ? resolveWindow(spec.window) : scope.win
  }, [range, scope.win])

  const columns = win.days <= 1 ? 1 : win.days <= 7 ? 7 : win.days <= 31 ? 10 : win.days <= 92 ? 13 : 13
  const { bands, totals, spans } = useMemo(
    () => usageBands(scope.siteKey, win, columns),
    [scope.siteKey, win, columns],
  )

  const peak = Math.max(...totals, 1)
  const grand = totals.reduce((n, t) => n + t, 0)
  const perCategory = CATEGORIES.map((c, i) => ({
    category: c,
    units: bands.reduce((n, b) => n + (b[i] ?? 0), 0),
  }))

  return (
    <Section icon={TrendingUp} label="Usage trend" aside={`${scopeName} · ${win.window}`}>
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hidden">
        {[...RANGES.map((r) => [r.key, r.label] as [string, string]), ['custom', 'Custom'] as [string, string]].map(
          ([key, label]) => {
            const on = key === range
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setRange(key)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                  on ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a] active:bg-[#eceae5]'
                }`}
              >
                {label}
              </button>
            )
          },
        )}
      </div>

      <div className="flex items-baseline gap-3">
        <Figure value={fmt(grand)} size={30} />
        <span className="text-[12px]" style={{ color: FAINT }}>
          units issued · {win.window}
        </span>
      </div>

      {grand === 0 ? (
        /* The honest empty state: a range the ledger has nothing in says so rather than
           drawing a flat axis that reads as zero usage. */
        <p className="py-6 text-[13px] text-[#6d6860]">Nothing was issued in {win.window}.</p>
      ) : (
        <>
          <div className="mt-4 flex h-[150px] items-end gap-[3px]">
            {bands.map((column, ci) => (
              <div key={ci} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-[2px]">
                {column
                  .map((v, i) => ({ v, i }))
                  .filter((s) => s.v > 0)
                  .reverse()
                  .map((s) => (
                    <span
                      key={s.i}
                      className="w-full rounded-[2px]"
                      style={{
                        /* Floor of 2px so a band with a handful of units is still a mark
                           rather than a gap the eye reads as missing data. */
                        height: `${Math.max(2, (s.v / peak) * 132)}px`,
                        backgroundColor: mix(accent, step(s.i)),
                      }}
                      title={`${CATEGORIES[s.i]} · ${fmt(s.v)}`}
                    />
                  ))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-[3px]">
            {spans.map((s, i) => (
              <span
                key={i}
                className={`min-w-0 flex-1 text-center text-[9.5px] ${
                  i === spans.length - 1 ? 'font-semibold text-[#1c1a16]' : 'text-[#9b958b]'
                }`}
              >
                {/* Only the ends and the middle are labelled — thirteen dates across a phone
                    column is thirteen overlapping strings. */}
                {i === 0 || i === spans.length - 1 || i === Math.floor(spans.length / 2) ? shortDate(s.to) : ''}
              </span>
            ))}
          </div>

          <Rule label="Bands" />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {perCategory.map((c, i) => (
              <li key={c.category}>
                <button
                  type="button"
                  onClick={() => open({ title: c.category, eyebrow: 'Usage', body: <CategoryPanel category={c.category} scope={scope} /> })}
                  className="card-press flex w-full items-baseline gap-2 text-left"
                >
                  <span
                    className="mt-[5px] size-[8px] shrink-0 rounded-[2px]"
                    style={{ backgroundColor: mix(accent, step(i)) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[#3d3a34]">{c.category}</span>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums text-[#1c1a16]">{fmt(c.units)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}

/* ── 5 · requests from sites ─────────────────────────────────────────────── */

const REQUEST_SORTS: [RequestSort, string][] = [
  ['cost', 'Est. cost'],
  ['requests', 'Requests'],
  ['qty', 'Quantity'],
  ['pending', 'Pending'],
]

/**
 * Every site's requisitions, sorted on any of the four columns.
 *
 * The rows are built from the FILTERED request array rather than re-queried, so a category or
 * status chip narrows the table and its totals together — a table that ignored the chip above
 * it would be the page contradicting its own filter.
 */
function SiteRequestsCard({
  rows,
  queue,
  scoped,
  scope,
  lens,
}: {
  rows: Req[]
  /** The open queue, not the open subset of `rows` — see the note at the call site. */
  queue: Req[]
  scoped: string | null
  scope: Scope
  lens: Facets
}) {
  const { open } = useSheet()
  const [sort, setSort] = useState<RequestSort>('cost')

  const sites: SiteRequests[] = useMemo(() => {
    const list = SITES.filter((s) => !scoped || s.key === scoped)
    return list.map((s) => {
      const mine = rows.filter((r) => r.siteKey === s.key)
      const pending = queue.filter((r) => r.siteKey === s.key)
      return {
        key: s.key,
        name: s.name,
        code: s.code,
        requests: mine.length,
        qty: mine.reduce((n, r) => n + r.qty, 0),
        cost: mine.reduce((n, r) => n + r.cost, 0),
        pending: pending.length,
        pendingCost: pending.reduce((n, r) => n + r.cost, 0),
      }
    })
  }, [rows, queue, scoped])

  const shown = sortRequests(sites, sort)
  const widest = Math.max(...shown.map((r) => r[sort]), 1)
  const totalCost = shown.reduce((n, r) => n + r.cost, 0)

  return (
    <Section
      icon={ClipboardList}
      label="Medicines requested from sites"
      aside={`${shown.length} ${shown.length === 1 ? 'site' : 'sites'} · ${inr(totalCost)}`}
    >
      <Chips options={REQUEST_SORTS.map(([k, l]) => [k, l] as [string, string])} value={sort} onPick={(v) => setSort(v as RequestSort)} />

      {lens.category !== 'all' || lens.status !== 'all' ? (
        <p className="mt-3 text-[11px]" style={{ color: FAINT }}>
          Filtered to {[lens.category !== 'all' && lens.category, lens.status !== 'all' && lens.status].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {/* Dense table where the column has room for it. */}
      <div className="mt-3.5 hidden @[560px]:block">
        <table className="w-full">
          <thead>
            <tr>
              {['Site', 'Requests', 'Quantity', 'Est. cost', 'Pending'].map((h, i) => (
                <th
                  key={h}
                  className={`pb-2 text-[9.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${i === 0 ? 'text-left' : 'pl-3 text-right'}`}
                  style={{ color: FAINT }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="border-t border-[#f0efec]">
                <td className="py-0">
                  <button
                    type="button"
                    onClick={() => open({ title: r.name, eyebrow: 'Site pharmacy', body: <SitePharmacyPanel siteKey={r.key} scope={{ ...scope, siteKey: r.key }} /> })}
                    className="card-press block w-full py-2.5 text-left"
                  >
                    <span className="block text-[13.5px] leading-[17px] text-[#1c1a16]">{r.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-[14px]" style={{ color: FAINT }}>
                      {r.code}
                    </span>
                  </button>
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{fmt(r.requests)}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{fmt(r.qty)}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums" style={{ color: VALUE }}>
                  {inr(r.cost)}
                </td>
                <td
                  className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums"
                  style={{ color: r.pending ? TONE.warn : FAINT }}
                >
                  {fmt(r.pending)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked rows on a phone — the same five facts laid out for a thumb. */}
      <div className="mt-3.5 @[560px]:hidden">
        <ul className="flex flex-col">
          {shown.map((r) => (
            <li key={r.key} className="border-b border-[#f0efec] last:border-0">
              <button
                type="button"
                onClick={() => open({ title: r.name, eyebrow: 'Site pharmacy', body: <SitePharmacyPanel siteKey={r.key} scope={{ ...scope, siteKey: r.key }} /> })}
                className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left"
              >
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#1c1a16]">{r.name}</span>
                  <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: VALUE }}>
                    {inr(r.cost)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: FAINT }}>
                  {fmt(r.requests)} requests · {fmt(r.qty)} units · {r.pending} pending
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(3, (r[sort] / widest) * 100)}%`, backgroundColor: mix('#2f9e5b', 0.72) }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/** The hero's "Requested" tile — every site, then every record. */
function SiteRequestsSheet({ scope }: { scope: Scope }) {
  const { open } = useSheet()
  const rows = useMemo(() => requestsBySite(scope.win, scope.asOf), [scope.win, scope.asOf])
  const shown = rows.filter((r) => !scope.siteKey || r.key === scope.siteKey)
  const cost = shown.reduce((n, r) => n + r.cost, 0)

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={inr(cost)} size={48} color={HERO_INK} />
          <p className="mt-1 text-[15px] text-[#3d3a34]">Estimated request cost</p>
          <p className="mt-2.5 text-[12px]" style={{ color: FAINT }}>
            {fmt(shown.reduce((n, r) => n + r.requests, 0))} requests · {scope.win.window}
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={MapPin} label="By site" aside={`${shown.length}`}>
          <TapList>
            {[...shown]
              .sort((a, b) => b.cost - a.cost)
              .map((r) => (
                <TapRow
                  key={r.key}
                  label={r.name}
                  sub={`${r.code} · ${fmt(r.requests)} requests · ${fmt(r.qty)} units`}
                  value={inr(r.cost)}
                  bar={(r.cost / Math.max(1, Math.max(...shown.map((x) => x.cost)))) * 100}
                  onOpen={() => open({ title: r.name, eyebrow: 'Site pharmacy', body: <SitePharmacyPanel siteKey={r.key} scope={{ ...scope, siteKey: r.key }} /> })}
                />
              ))}
          </TapList>
        </Section>
      </Stack>
    </>
  )
}

/** The hero's "Unavailable" tile. */
function ShortagesSheet({ scope }: { scope: Scope }) {
  const { open } = useSheet()
  const rows = useMemo(() => unavailable(scope.siteKey, scope.asOf), [scope.siteKey, scope.asOf])

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <Figure value={fmt(rows.length)} size={48} color={rows.length ? TONE.bad : HERO_INK} />
          <p className="mt-1 text-[15px] text-[#3d3a34]">Unavailable medicines</p>
          <p className="mt-2.5 text-[12px]" style={{ color: FAINT }}>
            {fmt(rows.reduce((n, u) => n + u.qty, 0))} units requested and unfilled
          </p>
        </section>
      </div>
      <Stack>
        <Section icon={PackageX} label="Medicines" aside={`${rows.length}`}>
          <TapList>
            {rows.map((u) => (
              <TapRow
                key={u.medicineId}
                lead={Pill}
                label={u.name}
                sub={`${u.category} · ${fmt(u.qty)} units · ${u.requests} requests`}
                value={`${u.sites.length} ${u.sites.length === 1 ? 'site' : 'sites'}`}
                tone="bad"
                onOpen={() => open({ title: u.name, eyebrow: 'Unavailable', body: <AvailabilityPanel medicineId={u.medicineId} scope={scope} /> })}
              />
            ))}
          </TapList>
          {rows.length === 0 && <p className="text-[13px] text-[#6d6860]">Every request was supplied in this scope.</p>}
        </Section>
      </Stack>
    </>
  )
}

/* ── 7 · the aging bands ─────────────────────────────────────────────────── */

/**
 * The queue as one run of days, split four ways.
 *
 * A SEGMENTED BAR, NOT A PIE. The four buckets are ordered — 0–15 leads to 16–30 leads to
 * 31–60 — and a pie throws that ordering away, which is the only thing the section is for. The
 * ramp runs accent → warn → bad across the bar so the shape of the queue reads before any
 * number does: a run that is mostly pale is healthy, one with a red tail is not.
 */
function AgingCard({
  buckets,
  shown,
  total,
  asOf,
  lens,
  onOpen,
}: {
  buckets: { key: string; label: string; count: number; cost: number; qty: number; requests: Req[] }[]
  shown: typeof buckets
  total: number
  asOf: number
  lens: string
  onOpen: (key: string, label: string) => void
}) {
  const accent = useAccent()
  const colour = (key: string) =>
    key === '60+' ? TONE.bad : key === '31-60' ? TONE.warn : key === '16-30' ? mix(accent, 0.55) : accent
  const oldest = [...buckets.flatMap((b) => b.requests)].sort((a, b) => a.day - b.day)[0]

  return (
    <Section icon={Hourglass} label="Pending aging" aside={lens === 'all' ? `${fmt(total)} open` : (AGING.find((a) => a.key === lens)?.label ?? '')}>
      {total === 0 ? (
        <p className="text-[13px] text-[#6d6860]">Nothing is waiting on the central store.</p>
      ) : (
        <>
          <div className="flex h-[14px] w-full gap-[2px] overflow-hidden">
            {buckets.map((b) => (
              <span
                key={b.key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${Math.max(b.count ? 2 : 0, (b.count / total) * 100)}%`, backgroundColor: colour(b.key) }}
                title={`${b.label} · ${b.count}`}
              />
            ))}
          </div>

          <div className="mt-4">
            <TapList>
              {shown.map((b) => (
                <TapRow
                  key={b.key}
                  label={b.label}
                  sub={`${inr(b.cost)} · ${fmt(b.qty)} units`}
                  value={fmt(b.count)}
                  tone={b.count === 0 ? undefined : b.key === '60+' ? 'bad' : b.key === '31-60' ? 'warn' : undefined}
                  bar={total ? (b.count / total) * 100 : 0}
                  onOpen={b.count > 0 ? () => onOpen(b.key, b.label) : undefined}
                />
              ))}
            </TapList>
          </div>

          {oldest && (
            <>
              <Rule label="Oldest waiting" />
              <Facts
                items={[
                  {
                    label: oldest.medicineName,
                    sub: `${oldest.id} · ${oldest.siteName} · ${fmt(oldest.qty)} units`,
                    value: `${pendingDays(oldest, asOf)} d`,
                    tone: 'bad',
                  },
                ]}
              />
            </>
          )}
        </>
      )}
    </Section>
  )
}

/* ── 11 · the site overview ──────────────────────────────────────────────── */

const SITE_SORTS: [SiteSort, string][] = [
  ['units', 'Usage'],
  ['requests', 'Requests'],
  ['cost', 'Cost'],
  ['pending', 'Pending'],
  ['expired', 'Expired'],
]

function SiteOverviewCard({
  win,
  asOf,
  scoped,
  scope,
}: {
  win: Win
  asOf: number
  scoped: string | null
  scope: Scope
}) {
  const { open } = useSheet()
  const [sort, setSort] = useState<SiteSort>('units')
  const all = useMemo(() => siteOverview(win, asOf), [win, asOf])
  const shown = sortSites(scoped ? all.filter((r) => r.key === scoped) : all, sort)
  const widest = Math.max(...shown.map((r) => r[sort]), 1)

  const openSite = (r: SiteRow) =>
    open({ title: r.name, eyebrow: 'Site pharmacy', body: <SitePharmacyPanel siteKey={r.key} scope={{ ...scope, siteKey: r.key }} /> })

  return (
    <Section icon={SquareStack} label="Site-wise pharmacy overview" aside={`${shown.length} of ${all.length} sites`}>
      <Chips options={SITE_SORTS.map(([k, l]) => [k, l] as [string, string])} value={sort} onPick={(v) => setSort(v as SiteSort)} />

      <div className="mt-3.5 hidden @[560px]:block">
        <table className="w-full">
          <thead>
            <tr>
              {['Site', 'Usage', 'Requests', 'Est. cost', 'Pending', 'Expired', 'Nil'].map((h, i) => (
                <th
                  key={h}
                  className={`pb-2 text-[9.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${i === 0 ? 'text-left' : 'pl-3 text-right'}`}
                  style={{ color: FAINT }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.key} className="border-t border-[#f0efec]">
                <td className="py-0">
                  <button type="button" onClick={() => openSite(r)} className="card-press block w-full py-2.5 text-left">
                    <span className="block text-[13.5px] leading-[17px] text-[#1c1a16]">{r.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-[14px]" style={{ color: FAINT }}>
                      {r.code}
                    </span>
                  </button>
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(r.units)}
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{fmt(r.requests)}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{inr(r.cost)}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums" style={{ color: r.pending ? TONE.warn : FAINT }}>
                  {fmt(r.pending)}
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums" style={{ color: r.expired ? TONE.bad : FAINT }}>
                  {inr(r.expired)}
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums" style={{ color: r.unavailable ? TONE.bad : FAINT }}>
                  {fmt(r.unavailable)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 @[560px]:hidden">
        <ul className="flex flex-col">
          {shown.map((r) => (
            <li key={r.key} className="border-b border-[#f0efec] last:border-0">
              <button type="button" onClick={() => openSite(r)} className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left">
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#1c1a16]">{r.name}</span>
                  <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: VALUE }}>
                    {fmt(r.units)}
                  </span>
                  <span className="w-[52px] shrink-0 text-right text-[12px] tabular-nums" style={{ color: FAINT }}>
                    {inr(r.cost)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: FAINT }}>
                  {r.code} · {fmt(r.requests)} requests · {r.pending} pending · {inr(r.expired)} expired · {r.unavailable} nil
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(3, (r[sort] / widest) * 100)}%`, backgroundColor: mix('#2f9e5b', 0.72) }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}

/* ── 12 · medicine records, and the search over them ─────────────────────── */

/**
 * Every medicine in the registry, as the search surface.
 *
 * The columns are the five the brief asks a search result to carry — medicine, category, usage,
 * request state, availability — so the list and the search are one thing rather than a list with
 * a search bolted above it. Paged twenty at a time, with the real total beside the page.
 */
function MedicineRecords({
  scope,
  query,
  onQuery,
  facets,
  usage: use,
  requests,
  queue,
  shortages,
}: {
  scope: Scope
  query: string
  onQuery: (v: string) => void
  facets: Facets
  usage: ReturnType<typeof usage>
  requests: Req[]
  queue: Req[]
  shortages: ReturnType<typeof unavailable>
}) {
  const { open } = useSheet()

  const rows = useMemo(() => {
    const units = new Map(use.byMedicine.map((m) => [m.id, m.units]))
    const pool = facets.category === 'all' ? CATEGORIES.flatMap(medicinesIn) : medicinesIn(facets.category)

    return pool
      .map((m) => {
        const mine = requests.filter((r) => r.medicineId === m.id)
        const pending = queue.filter((r) => r.medicineId === m.id).length
        const short = shortages.find((u) => u.medicineId === m.id)
        return {
          id: m.id,
          name: m.name,
          kind: m.category,
          unit: m.unit,
          category: CATEGORIES.find((c) => medicinesIn(c).some((x) => x.id === m.id))!,
          code: medCode(m.id),
          units: units.get(m.id) ?? 0,
          requests: mine.length,
          qty: mine.reduce((n, r) => n + r.qty, 0),
          cost: mine.reduce((n, r) => n + r.cost, 0),
          pending,
          sites: short?.sites.length ?? 0,
          price: unitCost(m.id),
        }
      })
      .filter((r) => (facets.availability === 'all' ? true : r.sites > 0))
      /* Name, pharmacological class, executive category, catalogue number and dispensing unit,
         all folded — see `matches`. The name column holds the generic (INN) name, so this is
         the generic-name search the brief asks for. */
      .filter((r) => matches(query, r.name, r.kind, r.category, r.code, r.unit))
      .sort((a, b) => b.units - a.units || b.cost - a.cost)
  }, [use, requests, queue, shortages, facets.category, facets.availability, query])

  const paged = usePaged((offset, limit) => ({ rows: rows.slice(0, offset + limit), total: rows.length }), 20, [rows])
  const widest = Math.max(...rows.map((r) => r.units), 1)

  const status = (r: (typeof rows)[number]) =>
    r.sites > 0 ? 'Unavailable' : r.pending > 0 ? `${r.pending} pending` : r.requests > 0 ? 'Fulfilled' : '—'
  const tone = (r: (typeof rows)[number]) => (r.sites > 0 ? 'bad' : r.pending > 0 ? 'warn' : undefined)

  return (
    <Section
      icon={Pill}
      label="Medicine records"
      aside={query ? `${rows.length} matching` : `${rows.length} medicines`}
    >
      {rows.length === 0 && (
        <p className="text-[12.5px]" style={{ color: FAINT }}>
          No medicine matches “{query.trim()}”.{' '}
          <button type="button" onClick={() => onQuery('')} className="font-semibold" style={{ color: ACCENT_INK }}>
            Clear
          </button>
        </p>
      )}

      <div className="hidden @[560px]:block">
        <table className="w-full">
          <thead>
            <tr>
              {['Medicine', 'Usage', 'Requests', 'Est. cost', 'Status'].map((h, i) => (
                <th
                  key={h}
                  className={`pb-2 text-[9.5px] font-medium tracking-[0.08em] whitespace-nowrap uppercase ${i === 0 ? 'text-left' : 'pl-3 text-right'}`}
                  style={{ color: FAINT }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((r) => (
              <tr key={r.id} className="border-t border-[#f0efec]">
                <td className="py-0">
                  <button
                    type="button"
                    onClick={() => open({ title: r.name, eyebrow: 'Medicine', body: <MedicinePanel medicineId={r.id} scope={scope} /> })}
                    className="card-press block w-full py-2.5 text-left"
                  >
                    <span className="block text-[13.5px] leading-[17px] text-[#1c1a16]">{r.name}</span>
                    <span className="mt-0.5 block text-[11px] leading-[14px]" style={{ color: FAINT }}>
                      {r.category} · {r.kind} · {r.code}
                    </span>
                  </button>
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] font-medium tabular-nums" style={{ color: VALUE }}>
                  {fmt(r.units)}
                </td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{fmt(r.requests)}</td>
                <td className="py-2.5 pl-3 text-right text-[13px] tabular-nums text-[#3d3a34]">{inr(r.cost)}</td>
                <td
                  className="py-2.5 pl-3 text-right text-[11.5px] whitespace-nowrap tabular-nums"
                  style={{ color: tone(r) ? TONE[tone(r)!] : FAINT }}
                >
                  {status(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="@[560px]:hidden">
        <ul className="flex flex-col">
          {paged.rows.map((r) => (
            <li key={r.id} className="border-b border-[#f0efec] last:border-0">
              <button
                type="button"
                onClick={() => open({ title: r.name, eyebrow: 'Medicine', body: <MedicinePanel medicineId={r.id} scope={scope} /> })}
                className="card-press -mx-2 block w-full rounded-[10px] px-2 py-2.5 text-left"
              >
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#1c1a16]">{r.name}</span>
                  <span className="shrink-0 text-[14px] font-medium tabular-nums" style={{ color: VALUE }}>
                    {fmt(r.units)}
                  </span>
                  <span
                    className="w-[64px] shrink-0 text-right text-[11px] tabular-nums"
                    style={{ color: tone(r) ? TONE[tone(r)!] : FAINT }}
                  >
                    {status(r)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: FAINT }}>
                  {r.category} · {r.requests} requests · {inr(r.cost)} · {inr(r.price)} per unit
                </span>
                <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(3, (r.units / widest) * 100)}%`, backgroundColor: mix('#2f9e5b', 0.72) }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <MoreRows page={paged} noun="medicines" />
    </Section>
  )
}
