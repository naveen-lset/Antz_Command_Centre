import { PawPrint } from 'lucide-react'
import type { DetailPageData } from '../model'

const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']

export const animals: DetailPageData = {
  slug: 'animals',
  title: 'Animals',
  accent: '#2f9e5b',
  icon: PawPrint,
  hero: {
    value: 215432,
    label: 'Total Animals',
    sub: 'Across 6 sites · 428 species',
    status: '+324 this month',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Population Trend',
      unit: 'animals',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [211980, 212410, 212790, 213120, 213460, 213820, 214150, 214420, 214690, 214930, 215108, 215432],
      xLabels: MONTHS,
      note: '+3,452 animals over 12 months — a steady 1.6% growth with no month of net decline.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Sites', value: '6', note: 'All reporting', tone: 'good' },
        { label: 'Species', value: '428', note: '+6 this quarter' },
        { label: 'Enclosures', value: '96', note: '92 occupied' },
        { label: 'Growth', value: '1.6%', note: 'Trailing 12 months', tone: 'good' },
      ],
    },
    {
      kind: 'share',
      title: 'Population Summary',
      note: 'By sex',
      items: [
        { label: 'Female', value: 101760 },
        { label: 'Male', value: 96340 },
        { label: 'Unknown', value: 17332 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Breakdown',
      items: [
        { label: 'Fish', value: 84200, sub: '96 species' },
        { label: 'Invertebrates', value: 52400, sub: '84 species' },
        { label: 'Birds', value: 38600, sub: '112 species' },
        { label: 'Mammals', value: 21900, sub: '68 species' },
        { label: 'Reptiles', value: 12850, sub: '46 species' },
        { label: 'Amphibians', value: 5482, sub: '22 species' },
      ],
    },
    {
      kind: 'compare',
      title: 'Birth vs Mortality',
      cards: [
        { label: 'Births', value: '45', delta: '+12% vs June', tone: 'good', values: [33, 40, 36, 42, 40, 45] },
        { label: 'Mortality', value: '23', delta: '−18% vs June', tone: 'good', values: [29, 26, 29, 25, 26, 23] },
      ],
    },
    {
      kind: 'tabs',
      title: 'Animal Distribution',
      tabs: [
        {
          label: 'Site Wise',
          items: [
            { label: 'Jamnagar Core', value: 78420 },
            { label: 'Wetland Reserve', value: 46900 },
            { label: 'Aviary Complex', value: 31250 },
            { label: 'Marine Zone', value: 24860 },
            { label: 'Reptile House', value: 22180 },
            { label: 'Quarantine & Rescue', value: 11822 },
          ],
        },
        {
          label: 'Zone Wise',
          items: [
            { label: 'Zone A — Core', value: 62300 },
            { label: 'Zone B — Wetland', value: 51480 },
            { label: 'Zone C — Aviary', value: 44220 },
            { label: 'Zone D — Marine', value: 33610 },
            { label: 'Zone E — Support', value: 23822 },
          ],
        },
        {
          label: 'Enclosure Wise',
          items: [
            { label: 'Aquatic Halls', value: 58940, sub: '14 units' },
            { label: 'Insectarium', value: 46880, sub: '8 units' },
            { label: 'Open Aviaries', value: 34210, sub: '11 units' },
            { label: 'Savanna Paddocks', value: 18760, sub: '9 units' },
            { label: 'Herpetarium', value: 14320, sub: '12 units' },
            { label: 'All others', value: 42322, sub: '42 units' },
          ],
        },
      ],
    },
    {
      kind: 'share',
      title: 'Age Distribution',
      items: [
        { label: 'Adult', value: 148930 },
        { label: 'Young', value: 42860 },
        { label: 'Senior', value: 23642 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Conservation Status',
      note: 'IUCN',
      items: [
        { label: 'Least Concern', value: 178240, sub: '82.7%' },
        { label: 'Vulnerable', value: 24180, sub: '11.2%' },
        { label: 'Endangered', value: 9640, sub: '4.5%' },
        { label: 'Critically Endangered', value: 3372, sub: '1.6%' },
      ],
    },
    {
      kind: 'ranked',
      title: 'Top Species',
      items: [
        { label: 'Common Carp', sub: 'Fish · Aquatic Halls', value: '12,400', percent: 100 },
        { label: 'Zebra Finch', sub: 'Bird · Open Aviaries', value: '6,820', percent: 55 },
        { label: 'Nile Tilapia', sub: 'Fish · Aquatic Halls', value: '5,940', percent: 48 },
        { label: 'Indian Peafowl', sub: 'Bird · Aviary Complex', value: '4,310', percent: 35 },
        { label: 'Bengal Fox', sub: 'Mammal · Savanna', value: '1,280', percent: 10 },
      ],
    },
    {
      kind: 'timeline',
      title: 'Recent Animal Activities',
      items: [
        { time: '13:40', tag: 'Birth', text: '2 Blackbuck calves born at Savanna Paddock 3', tone: 'good' },
        { time: '12:05', tag: 'Transfer', text: '6 Indian Peafowl moved to Open Aviary 7' },
        { time: '10:22', tag: 'Registration', text: '18 Zebra Finch hatchlings added to the registry' },
        { time: '09:15', tag: 'Death', text: '1 senior Nile Tilapia — natural causes, Aquatic Hall 2', tone: 'bad' },
        { time: '08:04', tag: 'Transfer', text: '3 Star Tortoise received from Sasan Rescue Centre' },
      ],
    },
  ],
}
