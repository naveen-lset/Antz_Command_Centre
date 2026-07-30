import type { LucideIcon } from 'lucide-react'

export type Range = 'today' | 'week' | 'month'

export type StatusTone = 'good' | 'warn' | 'critical' | 'neutral'

export interface Status {
  tone: StatusTone
  text: string
}

export interface Delta {
  text: string
  direction: 'up' | 'down' | 'flat'
  /** Whether the direction is good news (colors the delta). */
  positive: boolean
}

export interface Stat {
  label: string
  value: string
  accent?: boolean
}

export interface BreakdownItem {
  label: string
  value: string
  /** Share of the max item, 0–1, drives the proportion bar. */
  share: number
}

export interface ActivityItem {
  time: string
  text: string
}

export interface SplitSegment {
  label: string
  value: string
  share: number
  color: string
}

export interface HeroMetric {
  value: number
  format?: 'plain' | 'compact' | 'percent' | 'degrees' | 'score'
  label: string
  delta?: Delta
  trend?: number[]
}

export interface ModuleSection {
  id: string
  title: string
  icon: LucideIcon
  accent: string
  status: Status
  hero: HeroMetric
  /** Range-specific hero overrides (Today / This Week / This Month chips). */
  byRange?: Partial<Record<Range, Partial<HeroMetric>>>
  split?: { title: string; segments: SplitSegment[] }
  stats?: { title: string; items: Stat[] }
  breakdown?: { title: string; items: BreakdownItem[] }
  meter?: { label: string; value: string; fraction: number }
  activity?: { title: string; items: ActivityItem[] }
  actions?: string[]
  /** Shown on the sticky chip rail. */
  chip?: string
}

export const formatMetric = (v: number, format: HeroMetric['format']): string => {
  switch (format) {
    case 'percent':
      return `${Math.round(v)}%`
    case 'degrees':
      return `${Math.round(v)}°`
    case 'score':
      return v.toFixed(1)
    default:
      return Math.round(v).toLocaleString('en-US')
  }
}
