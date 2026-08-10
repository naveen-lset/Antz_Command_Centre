/**
 * WHAT THE PHARMACY PAGE OPENS.
 *
 * Eight sheets, and the brief names all eight: a usage category, a site pharmacy, a single
 * request, an aging bucket, the expired stock at the central store or at the sites, one expired
 * batch, an unavailable medicine, and one medicine's whole file. None of them is a route — the
 * page is the analysis and the sheet is the record, which is the brief's own division.
 *
 * THEY ALL BOTTOM OUT ON THE SAME TWO RECORDS. A request and a batch are the only leaves in
 * this module, and every path reaches one of them: category → medicine → request, site →
 * medicine → request, aging → request, expired → medicine → batch, unavailable → site →
 * request. That is what makes the counts on the page openable rather than merely true.
 *
 * Nothing is drawn here. Every mark comes from `exec/system.tsx` and every row is `panels.tsx`'s
 * `TapRow`, exactly as the Animal Population sheets do — what differs is the composition, not
 * the vocabulary.
 */

import { useMemo } from 'react'
import {
  Building2,
  CalendarClock,
  ClipboardList,
  Hourglass,
  IndianRupee,
  Layers,
  MapPin,
  PackageX,
  Pill,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { longDate, shortDate, type Win } from '../../core/calendar'
import { SITES, siteOf } from '../../core/world'
import {
  Bars,
  Columns,
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
  fmt,
  type Tone,
} from '../../exec/system'
import { TapList, TapRow } from '../panels'
import { useSheet } from '../sheet'
import { MoreRows, usePaged } from '../perf'
import {
  AGING,
  agingBuckets,
  categoryBySite,
  categoryOf,
  expiredLots,
  expirySplit,
  inr,
  medCode,
  medicineFile,
  medicinesIn,
  openRequests,
  pendingDays,
  requestsIn,
  statusOf,
  unavailable,
  unitCost,
  usage,
  usageBands,
  type Category,
  type Lot,
  type Req,
} from './supply'

/* ── the shared sheet hero ───────────────────────────────────────────────── */

function SheetHero({
  value,
  label,
  note,
  status,
  tone,
  icon: Glyph,
}: {
  value: string
  label: string
  note?: string
  status?: string
  tone?: Tone
  icon?: LucideIcon
}) {
  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} size={48} color={HERO_INK} />
        <p className="mt-1 flex items-center gap-2 text-[15px] text-[#3d3a34]">
          {Glyph && <Glyph size={15} strokeWidth={1.75} aria-hidden />}
          {label}
        </p>
        {status && (
          <p className="mt-3 flex items-center gap-2">
            <span className="size-[7px] rounded-full" style={{ backgroundColor: TONE[tone ?? 'neutral'] }} aria-hidden />
            <span className="text-[13px] font-medium" style={{ color: TONE[tone ?? 'neutral'] }}>
              {status}
            </span>
          </p>
        )}
        {note && (
          <p className="mt-2.5 text-[12px]" style={{ color: FAINT }}>
            {note}
          </p>
        )}
      </section>
    </div>
  )
}

const STATUS_TONE = { Fulfilled: 'good', Pending: 'warn', Unavailable: 'bad' } as const

export interface Scope {
  siteKey: string | null
  win: Win
  asOf: number
}

const where = (siteKey: string | null) => (siteKey ? (siteOf(siteKey)?.name ?? 'Site') : 'Zoo-wide')

/* ── one request · the leaf ──────────────────────────────────────────────── */

/** Every field the brief lists for a request, and nothing else. */
export function RequestPanel({ req, asOf }: { req: Req; asOf: number }) {
  const { open } = useSheet()
  const status = statusOf(req, asOf)
  const waited = pendingDays(req, asOf)

  return (
    <>
      <SheetHero
        value={inr(req.cost)}
        label={`${req.medicineName} · ${fmt(req.qty)} ${req.qty === 1 ? 'unit' : 'units'}`}
        status={status === 'Pending' ? `${waited} days waiting` : status}
        tone={STATUS_TONE[status]}
        note={`${req.id} · ${req.siteName}`}
        icon={ClipboardList}
      />
      <Stack>
        <Section icon={ClipboardList} label="Request" aside={req.id}>
          <Facts
            items={[
              { label: 'Request ID', value: req.id },
              { label: 'Site', value: req.siteName },
              { label: 'Request date', value: longDate(req.day) },
              { label: 'Medicine', value: req.medicineName, sub: medCode(req.medicineId) },
              { label: 'Category', value: req.category },
              { label: 'Requested quantity', value: fmt(req.qty) },
              { label: 'Estimated cost', value: inr(req.cost), sub: `${inr(req.unitCost)} per unit` },
              { label: 'Status', value: status, tone: STATUS_TONE[status] },
              ...(status === 'Pending' ? [{ label: 'Pending', value: `${waited} days`, tone: 'warn' as const }] : []),
            ]}
          />
        </Section>
        <Section icon={Pill} label="Medicine">
          <TapList>
            <TapRow
              lead={Pill}
              label={req.medicineName}
              sub={`${req.category} · ${medCode(req.medicineId)}`}
              value="Open"
              onOpen={() =>
                open({
                  title: req.medicineName,
                  eyebrow: 'Medicine',
                  body: <MedicinePanel medicineId={req.medicineId} scope={{ siteKey: req.siteKey, win: { from: 0, to: asOf, days: asOf + 1 } as Win, asOf }} />,
                })
              }
            />
          </TapList>
        </Section>
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
        Request record · deepest level
      </p>
    </>
  )
}

/**
 * A paged list of requests — the same rows wherever requests are listed.
 *
 * Written once because five sheets show requests and a hand-composed row at each of them is
 * five chances for one to print a quantity where the others print a cost.
 */
function RequestList({
  rows,
  asOf,
  eyebrow,
  label = 'Requests',
}: {
  rows: Req[]
  asOf: number
  eyebrow: string
  label?: string
}) {
  const { open } = useSheet()
  const paged = usePaged<Req>((offset, limit) => ({ rows: rows.slice(0, offset + limit), total: rows.length }), 20, [rows])

  return (
    <Section icon={ClipboardList} label={label} aside={rows.length ? fmt(rows.length) : undefined}>
      <TapList>
        {paged.rows.map((r) => {
          const status = statusOf(r, asOf)
          return (
            <TapRow
              key={r.id}
              label={r.medicineName}
              /* Pending days on the row, not only inside the record it opens — an aging
                 bucket that makes the reader open each request to find out how long it has
                 waited is a list sorted by a number it does not show. */
              sub={`${r.id} · ${r.siteName} · ${shortDate(r.day)} · ${fmt(r.qty)} units${
                status === 'Pending' ? ` · ${pendingDays(r, asOf)} d waiting` : ''
              }`}
              value={inr(r.cost)}
              tone={status === 'Unavailable' ? 'bad' : status === 'Pending' ? 'warn' : undefined}
              onOpen={() => open({ title: r.id, eyebrow, body: <RequestPanel req={r} asOf={asOf} /> })}
            />
          )
        })}
      </TapList>
      {rows.length === 0 && <p className="text-[13px] text-[#6d6860]">No requests in this scope.</p>}
      <MoreRows page={paged} noun="requests" />
    </Section>
  )
}

/* ── a usage category ────────────────────────────────────────────────────── */

/**
 * One of the four categories: how much, over what shape, which items, and where.
 *
 * The trend inside uses `Columns` rather than the page's stacked bands — at sheet width a
 * four-band stack is four slivers, and this sheet is already about a single band.
 */
export function CategoryPanel({ category, scope }: { category: Category; scope: Scope }) {
  const { open } = useSheet()
  const { siteKey, win } = scope

  const use = useMemo(() => usage(siteKey, win), [siteKey, win])
  const mine = use.byMedicine.filter((m) => m.category === category)
  const total = mine.reduce((n, m) => n + m.units, 0)
  const index = ['Medication', 'Vaccination', 'Supplements', 'Consumables'].indexOf(category)

  const { bands, spans } = useMemo(() => usageBands(siteKey, win, 6), [siteKey, win])
  const series = bands.map((b) => b[index] ?? 0)
  /* The real per-site figure for THIS category, cross-tabulated from the events' own site and
     medicine attributions rather than apportioned from each site's total. */
  const sites = useMemo(() => categoryBySite(siteKey, win, category), [siteKey, win, category])
  const requested = useMemo(
    () => requestsIn(siteKey, win).filter((r) => r.category === category),
    [siteKey, win, category],
  )
  const requestedCost = requested.reduce((n, r) => n + r.cost, 0)

  return (
    <>
      <SheetHero
        value={fmt(total)}
        label={`${category} · units issued`}
        note={`${where(siteKey)} · ${win.window}`}
        status={`${use.total ? ((total / use.total) * 100).toFixed(1) : '0'}% of all usage`}
        icon={Layers}
      />
      <Stack>
        <Section icon={Layers} label="Usage" aside={`${mine.length} items`}>
          <Snapshot
            cols={2}
            items={[
              { label: 'Units issued', value: fmt(total) },
              { label: 'Share of usage', value: `${use.total ? ((total / use.total) * 100).toFixed(1) : '0'}%` },
              { label: 'Items', value: String(mine.length), note: `of ${medicinesIn(category).length} stocked` },
              { label: 'Requested', value: inr(requestedCost), note: `${requested.length} requests` },
            ]}
          />
          {series.length > 1 && (
            <>
              <Rule label="Over the window" />
              <Columns
                values={series}
                labels={spans.map((s) => shortDate(s.to))}
                unit={`${category} · units issued`}
              />
            </>
          )}
        </Section>

        <Section icon={Pill} label="Items" aside={`${mine.length}`}>
          <TapList>
            {mine.map((m) => (
              <TapRow
                key={m.id}
                label={m.name}
                sub={`${m.kind} · ${medCode(m.id)} · ${inr(unitCost(m.id))} per unit`}
                value={fmt(m.units)}
                bar={(m.units / Math.max(1, mine[0]?.units ?? 1)) * 100}
                onOpen={() =>
                  open({ title: m.name, eyebrow: category, body: <MedicinePanel medicineId={m.id} scope={scope} /> })
                }
              />
            ))}
          </TapList>
          {mine.length === 0 && <p className="text-[13px] text-[#6d6860]">Nothing issued in this category.</p>}
        </Section>

        {sites.length > 0 && (
          <Section icon={MapPin} label="Site distribution" aside={`${sites.length}`}>
            <TapList>
              {sites.map((s) => (
                <TapRow
                  key={s.key}
                  label={s.name}
                  sub={`${s.code} · ${total ? ((s.units / total) * 100).toFixed(1) : '0'}% of this category`}
                  value={fmt(s.units)}
                  unit="units"
                  bar={(s.units / Math.max(1, sites[0].units)) * 100}
                  onOpen={() =>
                    open({
                      title: s.name,
                      eyebrow: category,
                      body: <SitePharmacyPanel siteKey={s.key} scope={{ ...scope, siteKey: s.key }} />,
                    })
                  }
                />
              ))}
            </TapList>
          </Section>
        )}
      </Stack>
    </>
  )
}

/* ── one site pharmacy ───────────────────────────────────────────────────── */

/** The site sheet in the brief's own order: the three figures, the medicines, the records. */
export function SitePharmacyPanel({ siteKey, scope }: { siteKey: string; scope: Scope }) {
  const { open } = useSheet()
  const { win, asOf } = scope
  const site = siteOf(siteKey)

  const raised = useMemo(() => requestsIn(siteKey, win), [siteKey, win])
  const open_ = useMemo(() => openRequests(siteKey, asOf), [siteKey, asOf])
  const expiry = useMemo(() => expirySplit(siteKey, win), [siteKey, win])
  const shortages = useMemo(() => unavailable(siteKey, asOf), [siteKey, asOf])
  const use = useMemo(() => usage(siteKey, win), [siteKey, win])

  /* One row per medicine the site asked for, biggest spend first — the brief's "medicine list"
     between the site's figures and its request records. */
  const byMedicine = useMemo(() => {
    const at = new Map<string, { id: string; name: string; category: Category; qty: number; cost: number; count: number }>()
    for (const r of raised) {
      const row = at.get(r.medicineId) ?? { id: r.medicineId, name: r.medicineName, category: r.category, qty: 0, cost: 0, count: 0 }
      row.qty += r.qty
      row.cost += r.cost
      row.count++
      at.set(r.medicineId, row)
    }
    return [...at.values()].sort((a, b) => b.cost - a.cost)
  }, [raised])

  if (!site) return null

  const cost = raised.reduce((n, r) => n + r.cost, 0)
  const qty = raised.reduce((n, r) => n + r.qty, 0)

  return (
    <>
      <SheetHero
        value={inr(cost)}
        label={`Requested · ${site.name}`}
        status={open_.length ? `${open_.length} pending` : 'Queue clear'}
        tone={open_.length ? 'warn' : 'good'}
        note={`${site.code} · ${win.window}`}
        icon={Warehouse}
      />
      <Stack>
        <Section icon={Warehouse} label="Site pharmacy" aside={site.code}>
          <Snapshot
            cols={2}
            items={[
              { label: 'Requests', value: fmt(raised.length) },
              { label: 'Requested quantity', value: fmt(qty), note: 'units' },
              { label: 'Estimated cost', value: inr(cost) },
              { label: 'Pending', value: fmt(open_.length), tone: open_.length ? 'warn' : undefined },
            ]}
          />
          <Rule label="Also here" />
          <Facts
            items={[
              { label: 'Units dispensed', value: fmt(use.total) },
              { label: 'Expired cost', value: inr(expiry.local.cost), tone: expiry.local.cost > 0 ? 'bad' : undefined },
              { label: 'Unavailable medicines', value: fmt(shortages.length), tone: shortages.length ? 'bad' : undefined },
            ]}
          />
        </Section>

        <Section icon={Pill} label="Medicines requested" aside={`${byMedicine.length}`}>
          <TapList>
            {byMedicine.slice(0, 14).map((m) => (
              <TapRow
                key={m.id}
                label={m.name}
                sub={`${m.category} · ${m.count} ${m.count === 1 ? 'request' : 'requests'} · ${fmt(m.qty)} units`}
                value={inr(m.cost)}
                bar={(m.cost / Math.max(1, byMedicine[0]?.cost ?? 1)) * 100}
                onOpen={() =>
                  open({ title: m.name, eyebrow: site.name, body: <MedicinePanel medicineId={m.id} scope={scope} /> })
                }
              />
            ))}
          </TapList>
          {byMedicine.length === 0 && <p className="text-[13px] text-[#6d6860]">No requests in {win.window}.</p>}
        </Section>

        <RequestList rows={raised} asOf={asOf} eyebrow={site.name} label="Request records" />
      </Stack>
    </>
  )
}

/* ── an aging bucket ─────────────────────────────────────────────────────── */

export function AgingPanel({ bucketKey, scope }: { bucketKey: string; scope: Scope }) {
  const { siteKey, asOf } = scope
  const open_ = useMemo(() => openRequests(siteKey, asOf), [siteKey, asOf])
  const bucket = agingBuckets(open_, asOf).find((b) => b.key === bucketKey)
  if (!bucket) return null

  const bySite = SITES.map((s) => ({
    site: s,
    rows: bucket.requests.filter((r) => r.siteKey === s.key),
  })).filter((g) => g.rows.length > 0)

  const tone: Tone = bucket.key === '60+' ? 'bad' : bucket.key === '31-60' ? 'warn' : 'neutral'

  return (
    <>
      <SheetHero
        value={fmt(bucket.count)}
        label={`Pending · ${bucket.label}`}
        status={inr(bucket.cost)}
        tone={tone}
        note={`${where(siteKey)} · open at ${longDate(asOf)}`}
        icon={Hourglass}
      />
      <Stack>
        <Section icon={Hourglass} label="Bucket" aside={bucket.label}>
          <Snapshot
            cols={3}
            items={[
              { label: 'Requests', value: fmt(bucket.count) },
              { label: 'Quantity', value: fmt(bucket.qty), note: 'units' },
              { label: 'Estimated cost', value: inr(bucket.cost) },
            ]}
          />
        </Section>

        {bySite.length > 0 && (
          <Section icon={MapPin} label="By site" aside={`${bySite.length}`}>
            <Bars
              items={bySite
                .map((g) => ({ label: g.site.name, value: g.rows.length, sub: inr(g.rows.reduce((n, r) => n + r.cost, 0)) }))
                .sort((a, b) => b.value - a.value)}
              unit="requests"
            />
          </Section>
        )}

        {/* Oldest first inside a bucket — the one that has waited longest is the one this
            bucket was opened to find. */}
        <RequestList
          rows={[...bucket.requests].sort((a, b) => a.day - b.day)}
          asOf={asOf}
          eyebrow={`Pending · ${bucket.label}`}
          label="Pending requests"
        />
      </Stack>
    </>
  )
}

/* ── expired stock ───────────────────────────────────────────────────────── */

/** One batch — the deepest level on the expiry side. */
export function LotPanel({ lot }: { lot: Lot }) {
  return (
    <>
      <SheetHero
        value={inr(lot.cost)}
        label={`${lot.medicineName} · ${fmt(lot.qty)} units`}
        status={`Expired ${longDate(lot.day)}`}
        tone="bad"
        note={`${lot.id} · ${lot.pharmacyName}`}
        icon={CalendarClock}
      />
      <Stack>
        <Section icon={CalendarClock} label="Batch" aside={lot.id}>
          <Facts
            items={[
              { label: 'Medicine', value: lot.medicineName, sub: medCode(lot.medicineId) },
              { label: 'Category', value: lot.category },
              { label: 'Held at', value: lot.pharmacyName },
              { label: 'Quantity', value: fmt(lot.qty) },
              { label: 'Unit cost', value: inr(lot.unitCost) },
              { label: 'Expired cost', value: inr(lot.cost), tone: 'bad' },
              { label: 'Expiry date', value: longDate(lot.day) },
            ]}
          />
        </Section>
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-[11px] text-[#9b958b]">
        Batch record · deepest level
      </p>
    </>
  )
}

/**
 * Expired stock at the central store, or across the site pharmacies.
 *
 * One panel for both, because the brief asks the same four questions of each — which medicines,
 * how much, what it cost, when it expired — and two panels would be two chances to answer them
 * differently.
 */
export function ExpiredPanel({
  side,
  scope,
  pharmacySite,
}: {
  side: 'central' | 'local'
  scope: Scope
  /** Narrows the local side to one site pharmacy. */
  pharmacySite?: string
}) {
  const { open } = useSheet()
  const { siteKey, win } = scope
  const all = useMemo(() => expiredLots(pharmacySite ?? siteKey, win), [pharmacySite, siteKey, win])
  const lots = all.filter((l) => (side === 'central' ? l.central : !l.central))
  const cost = lots.reduce((n, l) => n + l.cost, 0)

  const byMedicine = useMemo(() => {
    const at = new Map<string, { id: string; name: string; qty: number; cost: number; lots: Lot[] }>()
    for (const l of lots) {
      const row = at.get(l.medicineId) ?? { id: l.medicineId, name: l.medicineName, qty: 0, cost: 0, lots: [] }
      row.qty += l.qty
      row.cost += l.cost
      row.lots.push(l)
      at.set(l.medicineId, row)
    }
    return [...at.values()].sort((a, b) => b.cost - a.cost)
  }, [lots])

  const title = side === 'central' ? 'Central Pharmacy' : (siteOf(pharmacySite ?? '')?.name ?? 'Local pharmacies')

  const bySite = SITES.map((s) => ({
    site: s,
    cost: lots.filter((l) => l.siteKey === s.key).reduce((n, l) => n + l.cost, 0),
    lots: lots.filter((l) => l.siteKey === s.key).length,
  })).filter((g) => g.lots > 0)

  return (
    <>
      <SheetHero
        value={inr(cost)}
        label={`Expired · ${title}`}
        status={`${lots.length} ${lots.length === 1 ? 'batch' : 'batches'}`}
        tone="bad"
        note={win.window}
        icon={PackageX}
      />
      <Stack>
        {side === 'local' && !pharmacySite && bySite.length > 0 && (
          <Section icon={MapPin} label="By site" aside={`${bySite.length}`}>
            <TapList>
              {bySite
                .sort((a, b) => b.cost - a.cost)
                .map((g) => (
                  <TapRow
                    key={g.site.key}
                    label={g.site.name}
                    sub={`${g.site.code} · ${g.lots} ${g.lots === 1 ? 'batch' : 'batches'}`}
                    value={inr(g.cost)}
                    bar={(g.cost / Math.max(1, bySite[0].cost)) * 100}
                    onOpen={() =>
                      open({
                        title: g.site.name,
                        eyebrow: 'Expired medicine',
                        body: <ExpiredPanel side="local" scope={scope} pharmacySite={g.site.key} />,
                      })
                    }
                  />
                ))}
            </TapList>
          </Section>
        )}

        <Section icon={Pill} label="Medicines" aside={`${byMedicine.length}`}>
          <TapList>
            {byMedicine.map((m) => (
              <TapRow
                key={m.id}
                label={m.name}
                sub={`${fmt(m.qty)} units · ${m.lots.length} ${m.lots.length === 1 ? 'batch' : 'batches'}`}
                value={inr(m.cost)}
                bar={(m.cost / Math.max(1, byMedicine[0]?.cost ?? 1)) * 100}
                onOpen={() =>
                  open({
                    title: m.name,
                    eyebrow: `Expired · ${title}`,
                    body: <ExpiredMedicinePanel name={m.name} lots={m.lots} />,
                  })
                }
              />
            ))}
          </TapList>
          {byMedicine.length === 0 && (
            <p className="text-[13px] text-[#6d6860]">Nothing expired here in {win.window}.</p>
          )}
        </Section>
      </Stack>
    </>
  )
}

/** One medicine's expired batches — the level between a medicine and a batch record. */
function ExpiredMedicinePanel({ name, lots }: { name: string; lots: Lot[] }) {
  const { open } = useSheet()
  const cost = lots.reduce((n, l) => n + l.cost, 0)
  const qty = lots.reduce((n, l) => n + l.qty, 0)

  return (
    <>
      <SheetHero
        value={inr(cost)}
        label={`${name} · expired`}
        status={`${fmt(qty)} units`}
        tone="bad"
        note={`${lots.length} ${lots.length === 1 ? 'batch' : 'batches'}`}
        icon={PackageX}
      />
      <Stack>
        <Section icon={CalendarClock} label="Batches" aside={`${lots.length}`}>
          <TapList>
            {[...lots]
              .sort((a, b) => b.day - a.day)
              .map((l) => (
                <TapRow
                  key={l.id}
                  label={l.id}
                  sub={`${l.pharmacyName} · ${fmt(l.qty)} units · expired ${shortDate(l.day)}`}
                  value={inr(l.cost)}
                  tone="bad"
                  onOpen={() => open({ title: l.id, eyebrow: name, body: <LotPanel lot={l} /> })}
                />
              ))}
          </TapList>
        </Section>
      </Stack>
    </>
  )
}

/* ── an unavailable medicine ─────────────────────────────────────────────── */

export function AvailabilityPanel({ medicineId, scope }: { medicineId: string; scope: Scope }) {
  const { open } = useSheet()
  const { siteKey, asOf } = scope
  const rows = useMemo(() => unavailable(siteKey, asOf), [siteKey, asOf])
  const row = rows.find((u) => u.medicineId === medicineId)
  if (!row) return null

  return (
    <>
      <SheetHero
        value={fmt(row.sites.length)}
        label={`${row.sites.length === 1 ? 'Site' : 'Sites'} affected · ${row.name}`}
        status="Unavailable"
        tone="bad"
        note={`${row.kind} · ${medCode(row.medicineId)} · ${fmt(row.qty)} units requested`}
        icon={PackageX}
      />
      <Stack>
        <Section icon={PackageX} label="Availability" aside={medCode(row.medicineId)}>
          <Facts
            items={[
              { label: 'Medicine', value: row.name },
              { label: 'Category', value: row.category },
              { label: 'Affected sites', value: fmt(row.sites.length), tone: 'bad' },
              { label: 'Requested quantity', value: fmt(row.qty), sub: `${row.requests} requests` },
              { label: 'Estimated cost', value: inr(row.cost) },
              { label: 'Availability status', value: 'Unavailable', tone: 'bad' },
            ]}
          />
        </Section>

        <Section icon={MapPin} label="Affected sites" aside={`${row.sites.length}`}>
          <TapList>
            {row.sites.map((s) => (
              <TapRow
                key={s.key}
                label={s.name}
                sub={`${s.code} · ${s.requests.length} ${s.requests.length === 1 ? 'request' : 'requests'}`}
                value={fmt(s.qty)}
                unit="units"
                bar={(s.qty / Math.max(1, row.sites[0].qty)) * 100}
                onOpen={() =>
                  open({
                    title: s.name,
                    eyebrow: row.name,
                    body: <RequestsOnly rows={s.requests} asOf={asOf} title={`${row.name} · ${s.name}`} />,
                  })
                }
              />
            ))}
          </TapList>
        </Section>

        <RequestList rows={row.sites.flatMap((s) => s.requests)} asOf={asOf} eyebrow={row.name} label="Unfilled requests" />
      </Stack>
    </>
  )
}

/** A bare list of requests, for the one place that needs nothing else around it. */
function RequestsOnly({ rows, asOf, title }: { rows: Req[]; asOf: number; title: string }) {
  const qty = rows.reduce((n, r) => n + r.qty, 0)
  return (
    <>
      <SheetHero
        value={fmt(rows.length)}
        label={rows.length === 1 ? 'Request' : 'Requests'}
        note={title}
        status={`${fmt(qty)} units · ${inr(rows.reduce((n, r) => n + r.cost, 0))}`}
        tone="bad"
        icon={ClipboardList}
      />
      <Stack>
        <RequestList rows={rows} asOf={asOf} eyebrow={title} />
      </Stack>
    </>
  )
}

/* ── one medicine's whole file ───────────────────────────────────────────── */

export function MedicinePanel({ medicineId, scope }: { medicineId: string; scope: Scope }) {
  const { open } = useSheet()
  const { siteKey, win, asOf } = scope
  const file = useMemo(() => medicineFile(medicineId, siteKey, win, asOf), [medicineId, siteKey, win, asOf])
  if (!file) return null

  const held = file.bySite.filter((s) => s.units > 0 || s.requests > 0)

  return (
    <>
      <SheetHero
        value={fmt(file.units)}
        label={`${file.medicine.name} · units issued`}
        status={
          file.unavailableAt > 0
            ? `Unavailable at ${file.unavailableAt} ${file.unavailableAt === 1 ? 'site' : 'sites'}`
            : file.pending > 0
              ? `${file.pending} pending`
              : undefined
        }
        tone={file.unavailableAt > 0 ? 'bad' : 'warn'}
        note={`${file.category} · ${file.medicine.category} · ${file.code} · ${inr(file.unitCost)} per ${file.medicine.unit}`}
        icon={Pill}
      />
      <Stack>
        <Section icon={Pill} label="Medicine" aside={file.code}>
          <Snapshot
            cols={2}
            items={[
              { label: 'Units issued', value: fmt(file.units) },
              { label: 'Requested', value: fmt(file.requested.qty), note: `${file.requested.count} requests` },
              { label: 'Pending', value: fmt(file.pending), tone: file.pending ? 'warn' : undefined },
              { label: 'Unavailable at', value: fmt(file.unavailableAt), note: 'sites', tone: file.unavailableAt ? 'bad' : undefined },
            ]}
          />
          <Rule label="Value" />
          <Facts
            items={[
              { label: 'Estimated request cost', value: inr(file.requested.cost) },
              { label: 'Expired cost', value: inr(file.expired.cost), sub: `${fmt(file.expired.qty)} units`, tone: file.expired.cost ? 'bad' : undefined },
              { label: 'Unit cost', value: inr(file.unitCost), sub: `per ${file.medicine.unit}` },
            ]}
          />
        </Section>

        {held.length > 0 && (
          <Section icon={MapPin} label="Site distribution" aside={`${held.length}`}>
            <TapList>
              {held.map((s) => (
                <TapRow
                  key={s.key}
                  label={s.name}
                  sub={`${s.code} · ${s.requests} ${s.requests === 1 ? 'request' : 'requests'} · ${fmt(s.qty)} units requested`}
                  value={fmt(s.units)}
                  unit="issued"
                  bar={(s.units / Math.max(1, held[0].units || 1)) * 100}
                  onOpen={() =>
                    open({
                      title: s.name,
                      eyebrow: file.medicine.name,
                      body: <SitePharmacyPanel siteKey={s.key} scope={{ ...scope, siteKey: s.key }} />,
                    })
                  }
                />
              ))}
            </TapList>

          </Section>
        )}

        <RequestList rows={file.requests} asOf={asOf} eyebrow={file.medicine.name} label="Related requests" />
      </Stack>
    </>
  )
}

/* ── the central pharmacy queue, as a sheet ──────────────────────────────── */

/** Everything open at the central store, with the aging bands repeated inside. */
export function PendingPanel({ scope }: { scope: Scope }) {
  const { open } = useSheet()
  const { siteKey, win, asOf } = scope
  const open_ = useMemo(() => openRequests(siteKey, asOf), [siteKey, asOf])
  const buckets = agingBuckets(open_, asOf)
  const cost = open_.reduce((n, r) => n + r.cost, 0)
  const inWindow = open_.filter((r) => r.day >= win.from && r.day <= win.to).length

  return (
    <>
      <SheetHero
        value={fmt(open_.length)}
        label="Pending from Central Pharmacy"
        status={inr(cost)}
        tone="warn"
        note={`${where(siteKey)} · open at ${longDate(asOf)}`}
        icon={Building2}
      />
      <Stack>
        <Section icon={Hourglass} label="Aging" aside={`${open_.length} open`}>
          <TapList>
            {buckets.map((b) => (
              <TapRow
                key={b.key}
                label={b.label}
                sub={`${inr(b.cost)} · ${fmt(b.qty)} units`}
                value={fmt(b.count)}
                tone={b.key === '60+' && b.count > 0 ? 'bad' : b.key === '31-60' && b.count > 0 ? 'warn' : undefined}
                bar={(b.count / Math.max(1, Math.max(...buckets.map((x) => x.count)))) * 100}
                onOpen={b.count > 0 ? () => open({ title: b.label, eyebrow: 'Pending', body: <AgingPanel bucketKey={b.key} scope={scope} /> }) : undefined}
              />
            ))}
          </TapList>
          <p className="mt-3 text-[11px]" style={{ color: FAINT }}>
            {fmt(inWindow)} of these were raised in {win.window}.
          </p>
        </Section>
        <RequestList rows={open_} asOf={asOf} eyebrow="Pending" label="Open requests" />
      </Stack>
    </>
  )
}

/* ── the whole-collection expiry sheet ───────────────────────────────────── */

export function ExpiryPanel({ scope }: { scope: Scope }) {
  const { open } = useSheet()
  const { siteKey, win } = scope
  const split = useMemo(() => expirySplit(siteKey, win), [siteKey, win])

  return (
    <>
      <SheetHero
        value={inr(split.total)}
        label="Expired medicine cost"
        status={`${split.central.lots + split.local.lots} batches`}
        tone="bad"
        note={`${where(siteKey)} · ${win.window}`}
        icon={PackageX}
      />
      <Stack>
        <Section icon={Building2} label="Central against local" aside={inr(split.total)}>
          <Composition
            items={[
              { label: 'Central Pharmacy', value: split.central.cost },
              { label: 'Local pharmacies', value: split.local.cost },
            ]}
          />
          <Rule label="Tap to drill" />
          <TapList>
            <TapRow
              lead={Building2}
              label="Central Pharmacy"
              sub={`${split.central.lots} batches`}
              value={inr(split.central.cost)}
              onOpen={split.central.lots ? () => open({ title: 'Central Pharmacy', eyebrow: 'Expired medicine', body: <ExpiredPanel side="central" scope={scope} /> }) : undefined}
            />
            <TapRow
              lead={Warehouse}
              label="Local pharmacies"
              sub={`${split.local.lots} batches · ${split.bySite.filter((b) => b.lots > 0).length} sites`}
              value={inr(split.local.cost)}
              onOpen={split.local.lots ? () => open({ title: 'Local pharmacies', eyebrow: 'Expired medicine', body: <ExpiredPanel side="local" scope={scope} /> }) : undefined}
            />
          </TapList>
        </Section>
      </Stack>
    </>
  )
}

/* ── the category index, for the hero's usage figure ─────────────────────── */

export function UsagePanel({ scope }: { scope: Scope }) {
  const { open } = useSheet()
  const { siteKey, win } = scope
  const use = useMemo(() => usage(siteKey, win), [siteKey, win])

  return (
    <>
      <SheetHero
        value={fmt(use.total)}
        label="Units issued"
        note={`${where(siteKey)} · ${win.window}`}
        status={`${use.byMedicine.length} medicines`}
        icon={IndianRupee}
      />
      <Stack>
        <Section icon={Layers} label="By category" aside={`${use.categories.filter((c) => c.units > 0).length}`}>
          <TapList>
            {use.categories.map((c) => (
              <TapRow
                key={c.category}
                label={c.category}
                sub={`${c.medicines} items · ${c.percent.toFixed(1)}%`}
                value={fmt(c.units)}
                bar={c.percent}
                onOpen={c.units > 0 ? () => open({ title: c.category, eyebrow: 'Usage', body: <CategoryPanel category={c.category} scope={scope} /> }) : undefined}
              />
            ))}
          </TapList>
        </Section>
        <Section icon={Pill} label="Top medicines" aside={`${Math.min(12, use.byMedicine.length)} of ${use.byMedicine.length}`}>
          <TapList>
            {use.byMedicine.slice(0, 12).map((m) => (
              <TapRow
                key={m.id}
                label={m.name}
                sub={`${m.kind} · ${medCode(m.id)}`}
                value={fmt(m.units)}
                bar={(m.units / Math.max(1, use.byMedicine[0]?.units ?? 1)) * 100}
                onOpen={() => open({ title: m.name, eyebrow: 'Medicine', body: <MedicinePanel medicineId={m.id} scope={scope} /> })}
              />
            ))}
          </TapList>
        </Section>
      </Stack>
    </>
  )
}

export { medicinesIn, categoryOf, AGING }
