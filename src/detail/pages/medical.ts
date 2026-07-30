import { Cross, FlaskConical, Pill, Stethoscope, Syringe } from 'lucide-react'
import type { DetailPageData } from '../model'

const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const LAST6 = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const DAYS = ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']

export const health: DetailPageData = {
  slug: 'health',
  title: 'Health & Medical',
  accent: '#e93353',
  icon: Stethoscope,
  hero: {
    value: 124,
    label: 'Hospitalised Animals',
    sub: 'Under active veterinary care',
    status: 'Herd status: Healthy',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Weekly Medical Trend',
      unit: 'under care',
      ranges: [{ label: '2W', points: 14 }, { label: '1W', points: 7 }, { label: '5D', points: 5 }],
      values: [138, 136, 139, 135, 134, 132, 133, 131, 129, 127, 130, 126, 125, 124],
      xLabels: DAYS,
      xSuffix: 'Jul',
      note: 'Case load has fallen for six of the last seven days — discharges are outpacing admissions.',
    },
    {
      kind: 'summary',
      items: [
        { label: "Today's Admissions", value: '9', note: '2 critical', tone: 'warn' },
        { label: "Today's Discharge", value: '14', note: 'All cleared', tone: 'good' },
        { label: 'Vaccination Due', value: '23', note: 'Next 7 days' },
        { label: 'Lab Pending', value: '7', note: '2 high priority', tone: 'warn' },
      ],
    },
    {
      kind: 'share',
      title: 'Case Mix',
      note: 'Of 124 under care',
      items: [
        { label: 'Recovery', value: 48 },
        { label: 'Observation', value: 46 },
        { label: 'Isolation', value: 19 },
        { label: 'Critical', value: 11 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Disease Breakdown',
      items: [
        { label: 'Respiratory', value: 31, sub: '25%' },
        { label: 'Gastrointestinal', value: 26, sub: '21%' },
        { label: 'Parasitic', value: 22, sub: '18%' },
        { label: 'Dermatological', value: 18, sub: '15%' },
        { label: 'Trauma / Injury', value: 15, sub: '12%' },
        { label: 'Other', value: 12, sub: '10%' },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise Health',
      items: [
        { label: 'Mammals', value: 39, sub: '0.18% of group' },
        { label: 'Birds', value: 34, sub: '0.09% of group' },
        { label: 'Fish', value: 28, sub: '0.03% of group' },
        { label: 'Reptiles', value: 15, sub: '0.12% of group' },
        { label: 'Amphibians', value: 5, sub: '0.09% of group' },
        { label: 'Invertebrates', value: 3, sub: '0.01% of group' },
      ],
    },
    {
      kind: 'gauges',
      title: 'Treatment Success Rate',
      items: [
        { label: 'Treatment success', percent: 94, note: '1,284 closed cases YTD' },
        { label: 'Discharge under 7 d', percent: 78, note: '+5 pts vs June' },
      ],
    },
    {
      kind: 'stat',
      title: 'Medication',
      value: '268',
      unit: 'active courses',
      note: '42 doses due before 18:00 · 3 courses ending today',
      tone: 'neutral',
    },
    {
      kind: 'rows',
      title: 'Recent Treatments',
      meta: 'Last 24 h',
      items: [
        { label: 'Bengal Fox · ANM-40218', sub: 'Respiratory infection · Dr. Mehta', value: '13:20', tone: 'warn' },
        { label: 'Indian Peafowl · ANM-31877', sub: 'Wound dressing, day 3 · Dr. Rao', value: '11:45', tone: 'good' },
        { label: 'Sambar Deer · ANM-22904', sub: 'Deworming follow-up · Dr. Iyer', value: '10:30', tone: 'good' },
        { label: 'Star Tortoise · ANM-50133', sub: 'Shell lesion review · Dr. Mehta', value: '09:15', tone: 'neutral' },
        { label: 'Nile Tilapia batch · AQ-118', sub: 'Fungal treatment, tank-wide · Dr. Shah', value: '08:05', tone: 'warn' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Recent Medical Timeline',
      items: [
        { time: '13:20', tag: 'Admission', text: 'Bengal Fox admitted to Isolation 2 — respiratory distress', tone: 'warn' },
        { time: '12:10', tag: 'Discharge', text: '6 animals discharged from Observation Ward B', tone: 'good' },
        { time: '10:55', tag: 'Lab', text: 'Blood panel returned for ANM-22904 — within range', tone: 'good' },
        { time: '09:40', tag: 'Critical', text: 'ANM-40218 escalated to critical watch, 4-hourly checks', tone: 'bad' },
        { time: '08:00', tag: 'Round', text: 'Morning vet round completed across all 6 wards' },
      ],
    },
  ],
}

export const mortality: DetailPageData = {
  slug: 'mortality',
  title: 'Mortality',
  accent: '#9d174d',
  icon: Cross,
  hero: {
    value: 8,
    label: 'Mortality',
    sub: "Today · 30 July 2026",
    status: 'Below 7-day average',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Mortality Trend',
      unit: 'deaths',
      ranges: [{ label: '2W', points: 14 }, { label: '1W', points: 7 }, { label: '5D', points: 5 }],
      values: [13, 11, 14, 12, 10, 13, 11, 12, 9, 11, 10, 9, 7, 8],
      xLabels: DAYS,
      xSuffix: 'Jul',
      note: '7-day average is 9.4, down from 11.2 the week before.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'This Month', value: '23', note: '−18% vs June', tone: 'good' },
        { label: '7-Day Avg', value: '9.4', note: 'Was 11.2', tone: 'good' },
        { label: 'Mortality Rate', value: '0.011%', note: 'Benchmark 0.018%', tone: 'good' },
        { label: 'Postmortem Pending', value: '4', note: '1 over 48 h', tone: 'warn' },
      ],
    },
    {
      kind: 'share',
      title: 'Cause of Death',
      note: 'This month',
      items: [
        { label: 'Natural', value: 9 },
        { label: 'Old Age', value: 6 },
        { label: 'Disease', value: 5 },
        { label: 'Accident', value: 3 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise',
      items: [
        { label: 'Fish', value: 8, sub: '0.01% of group' },
        { label: 'Invertebrates', value: 6, sub: '0.01% of group' },
        { label: 'Birds', value: 4, sub: '0.01% of group' },
        { label: 'Mammals', value: 3, sub: '0.01% of group' },
        { label: 'Reptiles', value: 2, sub: '0.02% of group' },
      ],
    },
    {
      kind: 'columns',
      title: 'Monthly Trend',
      note: 'Per month',
      values: [30, 27, 26, 29, 25, 23],
      xLabels: LAST6,
      highlight: 5,
    },
    {
      kind: 'breakdown',
      title: 'Location Wise',
      items: [
        { label: 'Aquatic Halls', value: 9 },
        { label: 'Insectarium', value: 5 },
        { label: 'Open Aviaries', value: 4 },
        { label: 'Savanna Paddocks', value: 3 },
        { label: 'Herpetarium', value: 2 },
      ],
    },
    {
      kind: 'stat',
      title: 'Mortality Rate',
      value: '0.011%',
      note: '23 of 215,432 animals this month · industry benchmark 0.018%',
      tone: 'good',
    },
    {
      kind: 'rows',
      title: 'Recent Death Records',
      meta: 'Last 48 h',
      items: [
        { label: 'Nile Tilapia · AQ-118-07', sub: 'Natural · senior, Aquatic Hall 2', value: '09:15', tone: 'neutral' },
        { label: 'Chital · ANM-19042', sub: 'Accident · fence injury, Zone A', value: '07:40', tone: 'bad' },
        { label: 'Zebra Finch · ANM-33810', sub: 'Disease · respiratory, Aviary 4', value: 'Yesterday', tone: 'warn' },
        { label: 'Star Tortoise · ANM-50021', sub: 'Old age · 62 years, Herpetarium', value: 'Yesterday', tone: 'neutral' },
        { label: 'Giant Prawn batch · AQ-204', sub: 'Disease · water quality, Tank 9', value: '28 Jul', tone: 'warn' },
      ],
    },
    {
      kind: 'rows',
      title: 'Postmortem Pending',
      meta: '4 cases',
      items: [
        { label: 'Chital · ANM-19042', sub: 'Awaiting Dr. Mehta · raised 07:40', value: 'Today', tone: 'warn' },
        { label: 'Zebra Finch · ANM-33810', sub: 'Sample sent to lab · day 2', value: '1 day', tone: 'warn' },
        { label: 'Giant Prawn batch · AQ-204', sub: 'Water panel pending · day 3', value: '2 days', tone: 'bad' },
        { label: 'Mallard · ANM-30119', sub: 'Report drafting · day 1', value: '1 day', tone: 'neutral' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Case History',
      items: [
        { time: '09:15', tag: 'Death', text: 'Nile Tilapia AQ-118-07 recorded — natural, senior cohort', tone: 'neutral' },
        { time: '08:30', tag: 'Postmortem', text: 'Zebra Finch ANM-33810 samples dispatched to lab' },
        { time: '07:40', tag: 'Death', text: 'Chital ANM-19042 — fence injury, Zone A perimeter flagged', tone: 'bad' },
        { time: 'Yesterday', tag: 'Report', text: 'Postmortem closed for Star Tortoise ANM-50021 — old age', tone: 'good' },
        { time: '28 Jul', tag: 'Action', text: 'Tank 9 water quality corrected after prawn losses', tone: 'good' },
      ],
    },
  ],
}

export const vaccination: DetailPageData = {
  slug: 'vaccination',
  title: 'Vaccination',
  accent: '#6d28d9',
  icon: Syringe,
  hero: {
    value: 76,
    label: 'Vaccinations',
    sub: 'Administered this month',
    status: '92% herd coverage',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Monthly Progress',
      unit: 'doses',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [52, 58, 49, 63, 57, 66, 61, 70, 64, 72, 69, 76],
      xLabels: MONTHS,
      note: 'Twelve-month run rate is 63 doses per month; July is the highest on record.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Completed', value: '76', note: 'This month', tone: 'good' },
        { label: 'Pending', value: '18', note: 'Next 7 days' },
        { label: 'Overdue', value: '5', note: 'Escalated', tone: 'warn' },
        { label: 'Coverage', value: '92%', note: 'Target 95%', tone: 'good' },
      ],
    },
    {
      kind: 'gauges',
      title: 'Coverage',
      items: [
        { label: 'Herd coverage', percent: 92, note: 'Target 95% by September' },
        { label: 'Schedule adherence', percent: 87, note: '5 of 99 overdue' },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise',
      items: [
        { label: 'Mammals', value: 28, sub: '96% covered' },
        { label: 'Birds', value: 24, sub: '93% covered' },
        { label: 'Reptiles', value: 12, sub: '89% covered' },
        { label: 'Fish', value: 8, sub: '84% covered' },
        { label: 'Amphibians', value: 4, sub: '90% covered' },
      ],
    },
    {
      kind: 'ranked',
      title: 'Top Vaccinated Species',
      items: [
        { label: 'Blackbuck', sub: 'FMD booster', value: '18', percent: 100 },
        { label: 'Indian Peafowl', sub: 'Newcastle disease', value: '14', percent: 78 },
        { label: 'Sambar Deer', sub: 'FMD booster', value: '11', percent: 61 },
        { label: 'Bengal Fox', sub: 'Rabies', value: '9', percent: 50 },
        { label: 'Star Tortoise', sub: 'Herpesvirus', value: '6', percent: 33 },
      ],
    },
    {
      kind: 'calendar',
      title: 'Upcoming Vaccinations',
      items: [
        { date: '01', month: 'AUG', label: 'FMD booster — 12 Blackbuck', sub: 'Savanna Paddock 1 · Dr. Iyer' },
        { date: '03', month: 'AUG', label: 'Newcastle — 20 Peafowl', sub: 'Aviary Complex · Dr. Rao' },
        { date: '08', month: 'AUG', label: 'Rabies — 6 Bengal Fox', sub: 'Savanna Paddock 6 · Dr. Mehta' },
        { date: '15', month: 'AUG', label: 'Herpesvirus — 9 Tortoise', sub: 'Herpetarium · Dr. Mehta' },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Vaccinations',
      meta: 'Last 48 h',
      items: [
        { label: 'Blackbuck · 6 animals', sub: 'FMD booster · Dr. Iyer', value: '12:40', tone: 'good' },
        { label: 'Indian Peafowl · 8 animals', sub: 'Newcastle disease · Dr. Rao', value: '11:05', tone: 'good' },
        { label: 'Bengal Fox · 2 animals', sub: 'Rabies · Dr. Mehta', value: '09:30', tone: 'good' },
        { label: 'Sambar Deer · 4 animals', sub: 'FMD booster · Dr. Iyer', value: 'Yesterday', tone: 'good' },
        { label: 'Star Tortoise · 3 animals', sub: 'Herpesvirus · deferred once', value: 'Yesterday', tone: 'warn' },
      ],
    },
  ],
}

export const deworming: DetailPageData = {
  slug: 'deworming',
  title: 'Deworming',
  accent: '#0d9488',
  icon: Pill,
  hero: {
    value: 63,
    label: 'Deworming',
    sub: 'Treatments this month',
    status: '94% compliance',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Monthly Trend',
      unit: 'treatments',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [44, 48, 41, 52, 46, 55, 50, 58, 53, 60, 56, 63],
      xLabels: MONTHS,
      note: 'Treatment volume has grown 43% over twelve months as the rotation schedule matured.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Completed', value: '63', note: 'This month', tone: 'good' },
        { label: 'Pending', value: '14', note: 'Next 10 days' },
        { label: 'Overdue', value: '4', note: '2 escalated', tone: 'warn' },
      ],
    },
    {
      kind: 'stat',
      title: 'Treatment Coverage',
      value: '89%',
      percent: 89,
      note: '63 of 71 scheduled animals treated this cycle',
      tone: 'good',
    },
    {
      kind: 'breakdown',
      title: 'Species Wise',
      items: [
        { label: 'Mammals', value: 24, sub: '92% covered' },
        { label: 'Birds', value: 18, sub: '90% covered' },
        { label: 'Reptiles', value: 11, sub: '86% covered' },
        { label: 'Fish', value: 7, sub: '81% covered' },
        { label: 'Amphibians', value: 3, sub: '88% covered' },
      ],
    },
    {
      kind: 'columns',
      title: 'Cycle Comparison',
      note: 'Per month',
      values: [50, 58, 53, 60, 56, 63],
      xLabels: LAST6,
      highlight: 5,
    },
    {
      kind: 'calendar',
      title: 'Upcoming Schedule',
      items: [
        { date: '02', month: 'AUG', label: 'Rotation A — 14 mammals', sub: 'Savanna Paddocks · Dr. Iyer' },
        { date: '06', month: 'AUG', label: 'Rotation B — 11 birds', sub: 'Open Aviaries · Dr. Rao' },
        { date: '12', month: 'AUG', label: 'Rotation C — 8 reptiles', sub: 'Herpetarium · Dr. Mehta' },
        { date: '19', month: 'AUG', label: 'Faecal recheck — 20 animals', sub: 'Lab-linked · Dr. Shah' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Recent Activities',
      items: [
        { time: '12:15', tag: 'Treated', text: '9 Blackbuck dewormed — Rotation A, Savanna Paddock 1', tone: 'good' },
        { time: '10:40', tag: 'Treated', text: '6 Indian Peafowl dewormed — Open Aviary 4', tone: 'good' },
        { time: '09:20', tag: 'Recheck', text: 'Faecal egg count cleared for 12 Sambar Deer', tone: 'good' },
        { time: 'Yesterday', tag: 'Overdue', text: '4 Herpetarium animals missed the 28 Jul slot', tone: 'warn' },
        { time: '28 Jul', tag: 'Treated', text: '7 Nile Tilapia batches treated — Aquatic Hall 2', tone: 'good' },
      ],
    },
  ],
}

export const lab: DetailPageData = {
  slug: 'lab',
  title: 'Lab Requests',
  accent: '#0284c7',
  icon: FlaskConical,
  hero: {
    value: 31,
    label: 'Lab Requests',
    sub: 'Open this month',
    status: 'Avg 6.2 h turnaround',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Request Volume',
      unit: 'requests',
      ranges: [{ label: '2W', points: 14 }, { label: '1W', points: 7 }, { label: '5D', points: 5 }],
      values: [6, 8, 5, 3, 7, 9, 6, 7, 5, 4, 9, 8, 6, 5],
      xLabels: DAYS,
      xSuffix: 'Jul',
      note: 'Monday remains the peak intake day, driven by weekend sample backlogs.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Pending', value: '9', note: '2 over SLA', tone: 'warn' },
        { label: 'Completed', value: '19', note: 'This month', tone: 'good' },
        { label: 'Rejected', value: '3', note: 'Sample quality', tone: 'bad' },
        { label: 'High Priority', value: '6', note: '4 in progress' },
      ],
    },
    {
      kind: 'share',
      title: 'Request Status',
      note: 'Of 31 requests',
      items: [
        { label: 'Completed', value: 19 },
        { label: 'Pending', value: 9 },
        { label: 'Rejected', value: 3 },
      ],
    },
    {
      kind: 'stat',
      title: 'Samples Collected',
      value: '27',
      unit: 'of 31',
      percent: 87,
      note: '4 awaiting collection · 2 scheduled for this evening',
      tone: 'good',
    },
    {
      kind: 'stat',
      title: 'Turnaround Time',
      value: '6.2',
      unit: 'hours avg',
      note: '−38% vs June (10.0 h) · SLA is 12 h',
      tone: 'good',
    },
    {
      kind: 'breakdown',
      title: 'Sample Status',
      items: [
        { label: 'Reported', value: 19 },
        { label: 'In analysis', value: 6 },
        { label: 'Received', value: 2 },
        { label: 'Awaiting collection', value: 4 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise',
      items: [
        { label: 'Mammals', value: 11 },
        { label: 'Birds', value: 8 },
        { label: 'Fish', value: 6 },
        { label: 'Reptiles', value: 4 },
        { label: 'Amphibians', value: 2 },
      ],
    },
    {
      kind: 'gauges',
      title: 'Lab Performance',
      items: [
        { label: 'Within SLA', percent: 96, note: '18 of 19 reports' },
        { label: 'Sample validity', percent: 90, note: '3 rejections this month' },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Reports',
      meta: 'Last 48 h',
      items: [
        { label: 'LAB-2291 · Blood panel', sub: 'Sambar Deer ANM-22904 · normal', value: '10:55', tone: 'good' },
        { label: 'LAB-2288 · Faecal egg count', sub: 'Blackbuck herd · low burden', value: '09:10', tone: 'good' },
        { label: 'LAB-2286 · Water quality', sub: 'Tank 9 · ammonia elevated', value: 'Yesterday', tone: 'warn' },
        { label: 'LAB-2284 · Histopathology', sub: 'Zebra Finch ANM-33810 · pending', value: 'Yesterday', tone: 'neutral' },
        { label: 'LAB-2280 · Swab culture', sub: 'Bengal Fox ANM-40218 · rejected', value: '28 Jul', tone: 'bad' },
      ],
    },
  ],
}
