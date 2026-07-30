/**
 * Shared model for every ANTZ drill-down page.
 *
 * Every detail page is one ordered list of sections rendered by `DetailPage`.
 * The section vocabulary is deliberately small so all 14 modules read as one
 * product: hero → trend → summary → breakdown → distribution → performance →
 * timeline.
 */

import type { LucideIcon } from 'lucide-react'

export type Tone = 'good' | 'warn' | 'bad' | 'neutral'

export interface SummaryItem {
  label: string
  value: string
  /** Small caption under the value — a share, a delta, a qualifier. */
  note?: string
  tone?: Tone
}

export interface NamedValue {
  label: string
  value: number
  /** Optional right-hand caption (e.g. "4 sites"). */
  sub?: string
}

type SectionVariant =
  /** Large smooth area line — the page's primary change-over-time story. */
  | {
      kind: 'trend'
      title: string
      unit?: string
      values: number[]
      xLabels: string[]
      /** Appended to the scrub readout's period, e.g. day "30" → "30 Jul". */
      xSuffix?: string
      /**
       * Range chips. `points` is how many trailing samples that window plots, so
       * switching windows zooms the same series instead of showing invented data.
       * First entry is the default and must cover the whole series.
       */
      ranges?: { label: string; points: number }[]
      note?: string
    }
  /** 2–4 quick metrics in hairline tiles. */
  | { kind: 'summary'; title?: string; items: SummaryItem[] }
  /** One stacked share bar + legend with direct labels. */
  | { kind: 'share'; title: string; items: NamedValue[]; unit?: string; note?: string }
  /** Horizontal bar rows, values at the tip. */
  | { kind: 'breakdown'; title: string; items: NamedValue[]; unit?: string; note?: string }
  /** Same as breakdown, but the reader switches dimension. */
  | { kind: 'tabs'; title: string; unit?: string; tabs: { label: string; items: NamedValue[] }[] }
  /** Two mini cards side by side, each with a sparkline. */
  | {
      kind: 'compare'
      title: string
      cards: { label: string; value: string; delta: string; tone: Tone; values: number[] }[]
    }
  /** Column chart for period-over-period comparison. */
  | { kind: 'columns'; title: string; values: number[]; xLabels: string[]; note?: string; highlight?: number }
  /** 1–3 donut rings for rates and coverage. */
  | { kind: 'gauges'; title: string; items: { label: string; percent: number; note?: string }[] }
  /** Ranked list with a magnitude bar behind each row. */
  | { kind: 'ranked'; title: string; items: { label: string; sub: string; value: string; percent: number }[] }
  /** A single wide number with an optional meter. */
  | { kind: 'stat'; title: string; value: string; unit?: string; note?: string; percent?: number; tone?: Tone }
  /** Record list — recent transfers, lab reports, open issues. */
  | { kind: 'rows'; title: string; meta?: string; items: { label: string; sub: string; value: string; tone?: Tone }[] }
  /** Dated activity rail. */
  | { kind: 'timeline'; title: string; items: { time: string; tag: string; text: string; tone?: Tone }[] }
  /** Upcoming/expected events as a date-led list. */
  | { kind: 'calendar'; title: string; items: { date: string; month: string; label: string; sub: string }[] }

/** Every section may override the page accent with its own chart hue. */
export type Section = SectionVariant & { accent?: string }

export interface DetailPageData {
  /** Hash route segment, e.g. `animals` → `#/animals`. */
  slug: string
  title: string
  /** Single accent hue for the whole page; all series are steps of it. */
  accent: string
  /** Module glyph — sits in the tinted chip, same treatment as the home tiles. */
  icon: LucideIcon
  hero: {
    /** Numeric target for the count-up. */
    value: number
    /** Overrides the counted output when the hero isn't a plain integer. */
    display?: string
    label: string
    sub: string
    status?: string
    tone?: Tone
  }
  sections: Section[]
}
