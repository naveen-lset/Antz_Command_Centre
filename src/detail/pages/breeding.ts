import { Baby, Egg } from 'lucide-react'
import type { DetailPageData } from '../model'

const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const LAST6 = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

export const births: DetailPageData = {
  slug: 'births',
  title: 'Birth Analytics',
  accent: '#e8590c',
  icon: Baby,
  hero: {
    value: 45,
    label: 'Births',
    sub: 'This month · July 2026',
    status: '+12% vs June',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Birth Trend',
      unit: 'births',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [28, 31, 26, 34, 29, 37, 33, 40, 36, 42, 40, 45],
      xLabels: MONTHS,
      note: 'Nine of the last twelve months came in above the 34-birth baseline.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Successful Deliveries', value: '42', note: '93% of births', tone: 'good' },
        { label: 'Still Birth', value: '3', note: '−2 vs June', tone: 'good' },
        { label: 'Avg Birth Rate', value: '1.5', note: 'Births per day' },
        { label: 'Expected (30 d)', value: '38', note: '11 species' },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise Birth',
      items: [
        { label: 'Birds', value: 18, sub: '9 species' },
        { label: 'Mammals', value: 11, sub: '6 species' },
        { label: 'Fish', value: 9, sub: '3 species' },
        { label: 'Reptiles', value: 5, sub: '4 species' },
        { label: 'Amphibians', value: 2, sub: '2 species' },
      ],
    },
    {
      kind: 'columns',
      title: 'Monthly Comparison',
      note: '6 months',
      values: [37, 33, 40, 36, 40, 45],
      xLabels: LAST6,
      highlight: 5,
    },
    {
      kind: 'share',
      title: 'Birth Distribution',
      note: 'By site',
      items: [
        { label: 'Jamnagar Core', value: 16 },
        { label: 'Aviary Complex', value: 13 },
        { label: 'Wetland Reserve', value: 9 },
        { label: 'Marine Zone', value: 5 },
        { label: 'Quarantine & Rescue', value: 2 },
      ],
    },
    {
      kind: 'gauges',
      title: 'Delivery Outcome',
      items: [
        { label: 'Delivery success', percent: 93, note: '42 of 45 deliveries' },
        { label: 'Neonatal survival', percent: 88, note: 'First 30 days' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Recent Birth Events',
      items: [
        { time: '13:40', tag: 'Birth', text: '2 Blackbuck calves — Savanna Paddock 3, both healthy', tone: 'good' },
        { time: '11:18', tag: 'Birth', text: '1 Sambar Deer fawn — Zone A, under neonatal watch', tone: 'warn' },
        { time: '09:52', tag: 'Hatch', text: '18 Zebra Finch hatchlings — Open Aviary 4', tone: 'good' },
        { time: 'Yesterday', tag: 'Birth', text: '4 Nilgai calves — Wetland Reserve, all thriving', tone: 'good' },
        { time: '28 Jul', tag: 'Still birth', text: '1 Chital — postmortem completed, no herd risk', tone: 'bad' },
      ],
    },
    {
      kind: 'calendar',
      title: 'Expected Birth Calendar',
      items: [
        { date: '02', month: 'AUG', label: 'Blackbuck — 3 expected', sub: 'Savanna Paddock 1 · Dr. Mehta' },
        { date: '07', month: 'AUG', label: 'Sambar Deer — 2 expected', sub: 'Zone A · neonatal kit prepared' },
        { date: '14', month: 'AUG', label: 'Nilgai — 5 expected', sub: 'Wetland Reserve · Dr. Rao' },
        { date: '21', month: 'AUG', label: 'Bengal Fox — 4 expected', sub: 'Savanna Paddock 6 · den monitored' },
      ],
    },
  ],
}

export const eggs: DetailPageData = {
  slug: 'eggs',
  title: 'Eggs & Incubation',
  accent: '#d97706',
  icon: Egg,
  hero: {
    value: 142,
    label: 'Eggs',
    sub: 'Collected this month',
    status: 'On track',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Collection Trend',
      unit: 'eggs',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [96, 104, 88, 112, 101, 118, 109, 124, 116, 131, 127, 142],
      xLabels: MONTHS,
      note: 'Collection has risen for four consecutive months as the peafowl and francolin seasons overlap.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Collected', value: '142', note: 'This month' },
        { label: 'Incubating', value: '21', note: '6 incubators', tone: 'good' },
        { label: 'Hatched', value: '96', note: '89% success', tone: 'good' },
        { label: 'Discarded', value: '25', note: '18 infertile' },
      ],
    },
    {
      kind: 'share',
      title: 'Batch Status',
      note: 'Of 142 collected',
      items: [
        { label: 'Hatched', value: 96 },
        { label: 'Discarded', value: 25 },
        { label: 'Incubating', value: 21 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise Eggs',
      items: [
        { label: 'Indian Peafowl', value: 48, sub: '11 clutches' },
        { label: 'Zebra Finch', value: 34, sub: '9 clutches' },
        { label: 'Grey Francolin', value: 22, sub: '6 clutches' },
        { label: 'Mallard', value: 18, sub: '4 clutches' },
        { label: 'Emu', value: 12, sub: '3 clutches' },
        { label: 'Others', value: 8, sub: '2 clutches' },
      ],
    },
    {
      kind: 'gauges',
      title: 'Performance',
      items: [
        { label: 'Hatch success', percent: 89, note: '96 of 108 set eggs' },
        { label: 'Fertility rate', percent: 84, note: '+3 pts vs June' },
      ],
    },
    {
      kind: 'stat',
      title: 'Incubator Performance',
      value: '98.2%',
      unit: 'uptime',
      percent: 98,
      note: '6 of 8 incubators active · temperature variance ±0.2 °C',
      tone: 'good',
    },
    {
      kind: 'columns',
      title: 'Monthly Hatch Comparison',
      note: 'Per month',
      values: [78, 71, 84, 80, 88, 96],
      xLabels: LAST6,
      highlight: 5,
    },
    {
      kind: 'timeline',
      title: 'Recent Egg Activities',
      items: [
        { time: '12:35', tag: 'Hatch', text: '9 Indian Peafowl chicks hatched — Incubator 3', tone: 'good' },
        { time: '10:10', tag: 'Collected', text: '6 Grey Francolin eggs collected from Aviary 5' },
        { time: '08:45', tag: 'Candling', text: 'Batch EG-2211 candled — 4 of 22 infertile', tone: 'warn' },
        { time: 'Yesterday', tag: 'Set', text: '14 Zebra Finch eggs set in Incubator 6' },
        { time: '28 Jul', tag: 'Discarded', text: '5 Mallard eggs discarded after day-10 check', tone: 'bad' },
      ],
    },
    {
      kind: 'calendar',
      title: 'Expected Hatch Calendar',
      items: [
        { date: '01', month: 'AUG', label: 'Zebra Finch — 14 eggs', sub: 'Incubator 6 · day 13 of 14' },
        { date: '04', month: 'AUG', label: 'Grey Francolin — 18 eggs', sub: 'Incubator 2 · day 20 of 23' },
        { date: '09', month: 'AUG', label: 'Indian Peafowl — 21 eggs', sub: 'Incubator 3 · day 22 of 28' },
        { date: '18', month: 'AUG', label: 'Emu — 8 eggs', sub: 'Incubator 8 · day 39 of 52' },
      ],
    },
  ],
}
