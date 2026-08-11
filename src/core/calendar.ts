/**
 * The world clock, and every window a figure can be cut against.
 *
 * WHY THIS REPLACES `exec/period.tsx`'s ANCHOR TABLE. That table mapped nine windows
 * onto five authored columns and multiplied the difference: `yesterday` was today × 1.6,
 * a quarter was a month × 2.92, a year was six months × 1.96, and a custom range was
 * openly "estimated from the nearest reported grain". Those factors are invented
 * numbers. A director who picks 12–19 May and is shown a scaled slice of July has been
 * given a figure that no record anywhere supports.
 *
 * So the model inverts. The authored per-site figures become CONSTRAINTS on a real daily
 * series (see `series.ts`), and every window — including any custom range — is a plain
 * sum over days. Nine windows and a date picker, none of them estimated, and the factor
 * table is gone rather than relabelled.
 *
 * TIME IS AN INTEGER DAY INDEX, not a `Date`. Summing a window becomes a loop over a
 * typed array between two indices; with `Date` objects it becomes 2,192 allocations and
 * a timezone question on every read. `Date` appears only at the edges, for parsing input
 * and formatting output.
 *
 * THE CLOCK IS FIXED AT THE DATA'S OWN HORIZON, deliberately. A "today" that moved with the
 * wall clock would drift past the end of the extract, and by next month every window would be
 * empty. It is pinned to the last date any feed in `species_mgmt_anon` carries.
 *
 * THAT DATE MOVED FROM 31 JULY 2025 TO 20 MAY 2026 when the product was connected to the
 * database, and it had to. The dump's mass sits in 2025–2026 and two feeds begin AFTER the old
 * anchor — vaccination starts on 15 August 2025 and deworming is 17,153 of its 20,446 rows in
 * 2026. Left at July 2025, the entire preventive module would have read zero.
 *
 * The two constants below are properties of the extract, so they are restated here rather than
 * read from `store.ts`: `WINDOWS` is built at module evaluation and the store has not loaded
 * yet. `core/checks.ts` asserts them against the loaded metadata on every dev boot, so a
 * re-run of the ETL over a newer dump fails loudly here instead of quietly shifting every date
 * on every page.
 */

const MS_DAY = 86_400_000

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** The last day the world holds data for. Local midnight, so day arithmetic is exact. */
export const WORLD_TODAY = new Date(2026, 4, 20)

/**
 * The ledger, from 1 January 2020 to the horizon above.
 *
 * The epoch is chosen from the data: rows do exist before 2020, but they are a scatter of a
 * few hundred across six years and several are plainly corrupt — deaths dated 1970,
 * accessions dated 0001. Everything the product reports on falls inside this span, and the
 * ETL counts what it discards rather than silently clamping it in.
 */
export const HISTORY_DAYS = 2332

/** Day 0. Everything in the world is indexed from here. */
export const EPOCH = addDays(WORLD_TODAY, -(HISTORY_DAYS - 1))

/** The index of `WORLD_TODAY` — the last valid index, and the default window's end. */
export const TODAY = HISTORY_DAYS - 1

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

const midnight = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Whole days between two local midnights — DST-safe, unlike dividing raw timestamps. */
function diffDays(a: Date, b: Date): number {
  return Math.round((midnight(b).getTime() - midnight(a).getTime()) / MS_DAY)
}

/** A calendar date as a day index, clamped into the ledger. */
export const indexOf = (d: Date): number => clamp(diffDays(EPOCH, d))

export const dateAt = (i: number): Date => addDays(EPOCH, clamp(i))

export const clamp = (i: number): number => Math.max(0, Math.min(TODAY, Math.round(i)))

/* ── windows ─────────────────────────────────────────────────────────────── */

export type WindowKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'month'
  | 'lastMonth'
  | 'quarter'
  | 'half'
  | 'year'
  | 'all'
  | 'custom'

export interface Win {
  key: WindowKey
  /** Menu text. */
  label: string
  /** Inclusive first day, as a ledger index. */
  from: number
  /** Inclusive last day, as a ledger index. */
  to: number
  /** Inclusive day count — `to - from + 1`, never zero. */
  days: number
  /** The dates covered, printed wherever a figure needs its window stated. */
  window: string
  /** Named in prose slots — "23 deaths this month". */
  noun: string
}

/** First index of the calendar month `n` months before `WORLD_TODAY`'s month. */
function monthStart(back: number): number {
  const d = new Date(WORLD_TODAY.getFullYear(), WORLD_TODAY.getMonth() - back, 1)
  return indexOf(d)
}

/** Last index of that same month, never past today. */
function monthEnd(back: number): number {
  const d = new Date(WORLD_TODAY.getFullYear(), WORLD_TODAY.getMonth() - back + 1, 0)
  return clamp(indexOf(d))
}

/**
 * Every window the product offers, resolved to real day indices.
 *
 * `quarter` and `year` are TRAILING calendar months rather than calendar quarters and
 * calendar years. Today is the 31st of July: a quarter-to-date and a month-to-date would
 * both be "July", two menu entries showing the same figure. Trailing three and trailing
 * twelve are what an executive means by "the quarter" in a monthly review anyway.
 */
const SPECS: { key: Exclude<WindowKey, 'custom'>; label: string; noun: string; from: number; to: number }[] = [
  { key: 'today', label: 'Today', noun: 'today', from: TODAY, to: TODAY },
  { key: 'yesterday', label: 'Yesterday', noun: 'yesterday', from: TODAY - 1, to: TODAY - 1 },
  { key: 'last7', label: 'Last 7 days', noun: 'this week', from: TODAY - 6, to: TODAY },
  { key: 'last30', label: 'Last 30 days', noun: 'in 30 days', from: TODAY - 29, to: TODAY },
  { key: 'month', label: 'This month', noun: 'this month', from: monthStart(0), to: monthEnd(0) },
  { key: 'lastMonth', label: 'Last month', noun: 'last month', from: monthStart(1), to: monthEnd(1) },
  { key: 'quarter', label: 'Last 3 months', noun: 'this quarter', from: monthStart(2), to: monthEnd(0) },
  /*
   * SIX MONTHS LANDS EXACTLY ON AN AUTHORED COLUMN, which is why it belongs in this list rather
   * than being approximated by a custom range.
   *
   * `metrics.ts` states five nested totals per site and the fourth is "last 6 months";
   * `series.ts` carves its segments on the first day of the month five back, so a window from
   * `monthStart(5)` to `monthEnd(0)` sums to that authored figure to the unit. Today, last 7
   * days and this month already had presets on their authored columns; this was the one that
   * did not, so the filter could not ask for a figure the data states directly.
   *
   * `core/checks.ts` asserts it on every dev boot alongside the other three.
   */
  { key: 'half', label: 'Last 6 months', noun: 'in six months', from: monthStart(5), to: monthEnd(0) },
  { key: 'year', label: 'Last 12 months', noun: 'this year', from: monthStart(11), to: monthEnd(0) },
  { key: 'all', label: 'All time', noun: 'all time', from: 0, to: TODAY },
]

export const WINDOWS: Win[] = SPECS.map((s) => ({
  key: s.key,
  label: s.label,
  noun: s.noun,
  from: clamp(s.from),
  to: clamp(s.to),
  days: clamp(s.to) - clamp(s.from) + 1,
  window: describe(clamp(s.from), clamp(s.to)),
}))

export const DEFAULT_WINDOW: WindowKey = 'month'

const BY_KEY = new Map(WINDOWS.map((w) => [w.key, w]))

/** The lower bound a date input may offer — there is no data before the epoch. */
export const MIN_INPUT = toInput(EPOCH)
export const MAX_INPUT = toInput(WORLD_TODAY)

/**
 * Resolve a key to its window. A custom range is built from two ISO dates, clamped into
 * the ledger and ordered, so a reversed or out-of-range pair still yields a real window
 * rather than an empty or negative one.
 */
export function resolveWindow(key: WindowKey, custom?: { from: string; to: string }): Win {
  if (key !== 'custom') return BY_KEY.get(key) ?? BY_KEY.get(DEFAULT_WINDOW)!
  const a = fromInput(custom?.from) ?? addDays(WORLD_TODAY, -29)
  const b = fromInput(custom?.to) ?? WORLD_TODAY
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  const from = indexOf(lo)
  const to = indexOf(hi)
  return {
    key: 'custom',
    label: 'Custom range',
    noun: 'in the range',
    from,
    to,
    days: to - from + 1,
    window: describe(from, to),
  }
}

/** Same window, one span earlier — the comparison every delta on the product is against. */
export function previous(w: Win): Win {
  const to = w.from - 1
  const from = to - (w.days - 1)
  return {
    ...w,
    from: clamp(from),
    to: clamp(to),
    days: clamp(to) - clamp(from) + 1,
    window: describe(clamp(from), clamp(to)),
  }
}

/* ── formatting ──────────────────────────────────────────────────────────── */

/**
 * The dates covered, in the shortest unambiguous form:
 * "31 Jul 2025" · "July 2025" · "25 – 31 Jul 2025" · "Aug 2024 – Jul 2025".
 *
 * A whole calendar month prints as its name. "1 – 31 Jul 2025" is correct and reads as
 * an arbitrary range; "July 2025" says the thing the reader means by it.
 */
export function describe(from: number, to: number): string {
  const a = dateAt(from)
  const b = dateAt(to)
  if (from === to) return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`

  const wholeMonth =
    a.getDate() === 1 &&
    b.getDate() === new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  if (wholeMonth) return `${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}`

  /* A span of whole months across more than one month names the months, not the days —
     "Aug 2024 – Jul 2025" rather than "1 Aug 2024 – 31 Jul 2025". */
  const spansWholeMonths =
    a.getDate() === 1 && b.getDate() === new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate()
  if (spansWholeMonths) {
    const left = a.getFullYear() === b.getFullYear() ? MONTHS[a.getMonth()] : `${MONTHS[a.getMonth()]} ${a.getFullYear()}`
    return `${left} – ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
  }

  if (a.getFullYear() !== b.getFullYear())
    return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
  if (a.getMonth() === b.getMonth())
    return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
}

/** "31 Jul" — for a dense row where the year is already stated above. */
export const shortDate = (i: number): string => {
  const d = dateAt(i)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "31 Jul 2025". */
export const longDate = (i: number): string => {
  const d = dateAt(i)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** `<input type="date">` round-tripping in local time — `toISOString` would shift the day. */
export function toInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromInput(value: string | undefined): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

/** How many days ago an index is, phrased. Used by "last updated" and record rows. */
export function ago(i: number): string {
  const n = TODAY - i
  if (n <= 0) return 'today'
  if (n === 1) return 'yesterday'
  if (n < 7) return `${n} days ago`
  if (n < 30) return `${Math.round(n / 7)} weeks ago`
  if (n < 365) return `${Math.round(n / 30)} months ago`
  return `${Math.round(n / 365)} years ago`
}

/**
 * Bucket a window into at most `max` columns for a chart, on whole-day boundaries.
 *
 * A 12-month window has 365 days and a sparkline has room for about 30 marks, so the
 * days are grouped. The grouping is returned rather than applied, so the caller sums the
 * real series into it — a chart and the KPI above it are then the same numbers summed
 * two ways rather than two independent reads.
 */
export function buckets(w: Win, max = 30): { from: number; to: number }[] {
  const n = Math.min(max, w.days)
  const size = w.days / n
  return Array.from({ length: n }, (_, i) => ({
    from: w.from + Math.floor(i * size),
    to: w.from + Math.floor((i + 1) * size) - 1,
  }))
}
