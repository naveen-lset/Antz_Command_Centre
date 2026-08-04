/**
 * THE RECORD LAYER — tier three.
 *
 * A module page answers "how many" and "where did it concentrate". Neither can
 * answer "which animal", and that is the question every one of these pages exists
 * for: the named row, the site it happened at, and the one column of context that
 * makes the row actionable — the reason, the drug, the origin, the severity.
 *
 * Unlike the module pages, these DO share a structure, and deliberately so. The
 * printed report repeats one table anatomy across all twelve of its detail pages,
 * and a director scanning six of them in a row should not have to relearn where
 * the columns are. So the shape is data here, not composition: a stat strip, then
 * rows grouped by site.
 *
 * `--` is a real value in these tables, not a gap in the data — an egg that never
 * hatched has no animal id, and saying so is the point.
 */

import type { ComponentType } from 'react'
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Baby,
  Bug,
  Egg,
  EggOff,
  Pill,
  Rabbit,
  Stethoscope,
  Syringe,
} from 'lucide-react'
import { Roster, Section, Stack, Stamp, Tray, type RosterGroup, type Tone } from './system'
import { report } from './report'

type Icon = ComponentType<{ size?: number | string; strokeWidth?: number; style?: object }>

export interface RecordPage {
  /** Sheet title. Names the record set, not the module — "Mortality Records". */
  title: string
  icon: Icon
  /** Module slug this page hangs under, for the back affordance. */
  parent: string
  parentTitle: string
  /** The report's four-chip summary strip. */
  stats: { value: string; label: string; tone?: Tone }[]
  /** Column heads. `''` is the sex column, which has no head in the report. */
  head: string[]
  /** What the groups are — "5 sites", "3 diseases". */
  groupsLabel: string
  groups: RosterGroup[]
}

/* ── life events ─────────────────────────────────────────────────────────── */

const mortality: RecordPage = {
  title: 'Mortality Records',
  icon: Activity,
  parent: 'mortality',
  parentTitle: 'Mortality',
  stats: [
    { value: '23', label: 'Animals' },
    { value: '9', label: 'Species' },
    { value: '5', label: 'Sites' },
    { value: '6', label: 'Reasons' },
  ],
  head: ['Animal', '', 'Reason', 'Age'],
  groupsLabel: '5 sites',
  groups: [
    {
      group: 'Aquatic Halls',
      count: '11 Animals',
      rows: [
        { id: '#AQ-20411', name: 'Giant Prawn', sex: 'U', cells: ['Water quality', '1.2 y'] },
        { id: '#AQ-20412', name: 'Giant Prawn', sex: 'U', cells: ['Water quality', '1.1 y'] },
        { id: '#AQ-20415', name: 'Giant Prawn', sex: 'U', cells: ['Water quality', '0.9 y'] },
        { id: '#ANM-30119', name: 'Nile Tilapia', sex: 'F', cells: ['Disease · fungal', '2.4 y'] },
        { id: '#ANM-30204', name: 'Silver Barb', sex: 'U', cells: ['Undetermined', '1.8 y'] },
      ],
    },
    {
      group: 'Savanna Paddocks',
      count: '4 Animals',
      rows: [
        { id: '#ANM-19042', name: 'Chital', sex: 'M', cells: ['Trauma · fence', '4.1 y'] },
        { id: '#ANM-19088', name: 'Blackbuck', sex: 'F', cells: ['Natural causes', '11.6 y'] },
        { id: '#ANM-11726', name: 'Blackbuck', sex: 'M', cells: ['Natural causes', '13.2 y'] },
        { id: '#ANM-19120', name: 'Nilgai', sex: 'F', cells: ['Injury · enclosure', '6.8 y'] },
      ],
    },
    {
      group: 'Zone A',
      count: '3 Animals',
      rows: [
        { id: '#ANM-22904', name: 'Sambar Deer', sex: 'M', cells: ['Post-surgical', '9.4 y'] },
        { id: '#ANM-22911', name: 'Chital', sex: 'F', cells: ['Natural causes', '12.1 y'] },
        { id: '#ANM-22940', name: 'Chital', sex: 'U', cells: ['Undetermined', '0.4 y'] },
      ],
    },
    {
      group: 'Aviary Complex',
      count: '3 Animals',
      rows: [
        { id: '#ANM-33810', name: 'Zebra Finch', sex: 'M', cells: ['Disease · respiratory', '2.9 y'] },
        { id: '#ANM-33844', name: 'Zebra Finch', sex: 'F', cells: ['Disease · respiratory', '3.2 y'] },
        { id: '#ANM-33902', name: 'Grey Francolin', sex: 'M', cells: ['Natural causes', '5.6 y'] },
      ],
    },
  ],
}

const natality: RecordPage = {
  title: 'Natality Records',
  icon: Baby,
  parent: 'births',
  parentTitle: 'Birth Analytics',
  stats: [
    { value: '45', label: 'Animals' },
    { value: '24', label: 'Species' },
    { value: '6', label: 'Sites' },
    { value: '4', label: 'Hand-reared' },
  ],
  head: ['Animal', '', 'Dam', 'Age'],
  groupsLabel: '6 sites',
  groups: [
    {
      group: 'Open Aviary 4',
      count: '18 Animals',
      rows: [
        { id: '#ANM-51204', name: 'Zebra Finch', sex: 'U', cells: ['Clutch 2', '3 d'] },
        { id: '#ANM-51205', name: 'Zebra Finch', sex: 'U', cells: ['Clutch 2', '3 d'] },
        { id: '#ANM-51206', name: 'Zebra Finch', sex: 'U', cells: ['Clutch 2', '3 d'] },
        { id: '#ANM-51188', name: 'Zebra Finch', sex: 'U', cells: ['Clutch 1', '11 d'] },
        { id: '#ANM-51189', name: 'Zebra Finch', sex: 'U', cells: ['Clutch 1', '11 d'] },
      ],
    },
    {
      group: 'Savanna Paddock 1',
      count: '11 Animals',
      rows: [
        { id: '#ANM-51302', name: 'Blackbuck', sex: 'M', cells: ['Ambika', '6 d'] },
        { id: '#ANM-51303', name: 'Blackbuck', sex: 'F', cells: ['Ambika', '6 d'] },
        { id: '#ANM-51311', name: 'Blackbuck', sex: 'M', cells: ['Vasudha', '14 d'] },
        { id: '#ANM-51318', name: 'Bengal Fox', sex: 'F', cells: ['Kavi', '2 d'] },
      ],
    },
    {
      group: 'Wetland Reserve',
      count: '7 Animals',
      rows: [
        { id: '#ANM-51402', name: 'Nilgai', sex: 'M', cells: ['Meera', '9 d'] },
        { id: '#ANM-51403', name: 'Nilgai', sex: 'F', cells: ['Meera', '9 d'] },
        { id: '#ANM-51420', name: 'Painted Stork', sex: 'U', cells: ['--', '4 d'] },
      ],
    },
  ],
}

const accession: RecordPage = {
  title: 'Accession Records',
  icon: Rabbit,
  parent: 'accession',
  parentTitle: 'Accession',
  stats: [
    { value: '18', label: 'Animals' },
    { value: '12', label: 'Species' },
    { value: '4', label: 'Types' },
    { value: '6', label: 'Sources' },
  ],
  head: ['Animal', '', 'Collection', 'Organization'],
  groupsLabel: '3 sites',
  groups: [
    {
      group: 'Quarantine',
      count: '9 Animals',
      rows: [
        { id: '#ANM-60112', name: 'Fishing Cat', sex: 'M', cells: ['Rescue', 'Sasan Gir Rescue'] },
        { id: '#ANM-60113', name: 'Fishing Cat', sex: 'F', cells: ['Rescue', 'Sasan Gir Rescue'] },
        { id: '#ANM-60120', name: 'Indian Skimmer', sex: 'U', cells: ['Rehab', 'Wildlife SOS'] },
        { id: '#ANM-60121', name: 'Sangai Deer', sex: 'F', cells: ['Breeding loan', 'Junagadh Zoo'] },
        { id: '#ANM-60128', name: 'Malabar Pit Viper', sex: 'U', cells: ['Rescue', 'Gujarat Forest Dept'] },
      ],
    },
    {
      group: 'Sasan Rescue',
      count: '6 Animals',
      rows: [
        { id: '#ANM-60204', name: 'Bengal Fox', sex: 'M', cells: ['Rescue', 'Gujarat Forest Dept'] },
        { id: '#ANM-60205', name: 'Bengal Fox', sex: 'F', cells: ['Rescue', 'Gujarat Forest Dept'] },
        { id: '#ANM-60218', name: 'Grey Junglefowl', sex: 'M', cells: ['Wild observation', 'CZA'] },
        { id: '#ANM-60219', name: 'Painted Stork', sex: 'U', cells: ['Rehab', 'WWF-India'] },
      ],
    },
    {
      group: 'Aviary Complex',
      count: '3 Animals',
      rows: [
        { id: '#ANM-60302', name: 'Indian Peafowl', sex: 'M', cells: ['Rehab', 'Wildlife SOS'] },
        { id: '#ANM-60310', name: 'Rock Pigeon', sex: 'U', cells: ['Wild observation', 'CZA'] },
        { id: '#ANM-60311', name: 'Rock Pigeon', sex: 'U', cells: ['Wild observation', 'CZA'] },
      ],
    },
  ],
}

const hatched: RecordPage = {
  title: 'Eggs Hatched',
  icon: Egg,
  parent: 'eggs',
  parentTitle: 'Eggs & Incubation',
  stats: [
    { value: '96', label: 'Eggs' },
    { value: '6', label: 'Species' },
    { value: '4', label: 'Units' },
    { value: '89', label: 'Hatch %' },
  ],
  head: ['Species', 'Egg id', 'Animal id', 'Day'],
  groupsLabel: '3 incubators',
  groups: [
    {
      group: 'INC-3 · Indian Peafowl',
      count: '21 Eggs',
      rows: [
        { name: 'Indian Peafowl', cells: ['#EG-2208-01', '#ANM-51501', '28'] },
        { name: 'Indian Peafowl', cells: ['#EG-2208-02', '#ANM-51502', '28'] },
        { name: 'Indian Peafowl', cells: ['#EG-2208-03', '--', '28'] },
        { name: 'Indian Peafowl', cells: ['#EG-2208-04', '#ANM-51504', '29'] },
      ],
    },
    {
      group: 'INC-2 · Grey Francolin',
      count: '18 Eggs',
      rows: [
        { name: 'Grey Francolin', cells: ['#EG-2211-01', '#ANM-51520', '23'] },
        { name: 'Grey Francolin', cells: ['#EG-2211-02', '#ANM-51521', '23'] },
        { name: 'Grey Francolin', cells: ['#EG-2211-06', '--', '24'] },
      ],
    },
    {
      group: 'INC-6 · Zebra Finch',
      count: '14 Eggs',
      rows: [
        { name: 'Zebra Finch', cells: ['#EG-2201-01', '#ANM-51188', '14'] },
        { name: 'Zebra Finch', cells: ['#EG-2201-02', '#ANM-51189', '14'] },
        { name: 'Zebra Finch', cells: ['#EG-2201-03', '#ANM-51190', '14'] },
      ],
    },
  ],
}

const discarded: RecordPage = {
  title: 'Eggs Discarded',
  icon: EggOff,
  parent: 'discarded',
  parentTitle: 'Eggs Discarded',
  stats: [
    { value: '13', label: 'Eggs' },
    { value: '5', label: 'Species' },
    { value: '3', label: 'Units' },
    { value: '4', label: 'Reasons' },
  ],
  head: ['Species', 'Egg id', 'Reason', 'Day'],
  groupsLabel: '3 incubators',
  groups: [
    {
      group: 'INC-4 · Mallard',
      count: '5 Eggs',
      rows: [
        { name: 'Mallard', cells: ['#EG-2204-03', 'Rotten', '10'] },
        { name: 'Mallard', cells: ['#EG-2204-07', 'Thin shelled', '10'] },
        { name: 'Mallard', cells: ['#EG-2204-08', 'Red ring', '10'] },
        { name: 'Mallard', cells: ['#EG-2204-11', 'Infertile', '10'] },
      ],
    },
    {
      group: 'INC-2 · Grey Francolin',
      count: '4 Eggs',
      rows: [
        { name: 'Grey Francolin', cells: ['#EG-2211-14', 'Infertile', '7'] },
        { name: 'Grey Francolin', cells: ['#EG-2211-15', 'Infertile', '7'] },
        { name: 'Grey Francolin', cells: ['#EG-2211-19', 'Thin shelled', '7'] },
      ],
    },
    {
      group: 'INC-8 · Emu',
      count: '4 Eggs',
      rows: [
        { name: 'Emu', cells: ['#EG-2216-02', 'Red ring', '18'] },
        { name: 'Emu', cells: ['#EG-2216-05', 'Rotten', '18'] },
        { name: 'Emu', cells: ['#EG-2216-06', 'Undetermined', '21'] },
      ],
    },
  ],
}

const fetal: RecordPage = {
  title: 'Fetal Death Records',
  icon: Baby,
  parent: 'fetal',
  parentTitle: 'Fetal Death',
  stats: [
    { value: '5', label: 'Fetus' },
    { value: '4', label: 'Species' },
    { value: '3', label: 'Sites' },
    { value: '2', label: 'Causes' },
  ],
  head: ['Species', 'Fetal id', 'Cause', 'Dam'],
  groupsLabel: '3 sites',
  groups: [
    {
      group: 'Zone A',
      count: '2 Fetus',
      rows: [
        { name: 'Sambar Deer', cells: ['#FT-1104', 'Still birth', 'Sundari'] },
        { name: 'Chital', cells: ['#FT-1107', 'Abortion', 'Roshni'] },
      ],
    },
    {
      group: 'Wetland Reserve',
      count: '2 Fetus',
      rows: [
        { name: 'Nilgai', cells: ['#FT-1112', 'Still birth', 'Meera'] },
        { name: 'Nilgai', cells: ['#FT-1113', 'Still birth', 'Meera'] },
      ],
    },
    {
      group: 'Savanna Paddock 1',
      count: '1 Fetus',
      rows: [{ name: 'Blackbuck', cells: ['#FT-1120', 'Abortion', 'Vasudha'] }],
    },
  ],
}

/* ── veterinary ──────────────────────────────────────────────────────────── */

const cases: RecordPage = {
  title: 'New Cases',
  icon: Stethoscope,
  parent: 'health',
  parentTitle: 'Health & Medical',
  stats: [
    { value: '50', label: 'Cases' },
    { value: '18', label: 'Species' },
    { value: '5', label: 'Sites' },
    { value: '62', label: 'Rx' },
  ],
  head: ['Animal', '', 'Complaint', 'Rx'],
  groupsLabel: '4 sites',
  groups: [
    {
      group: 'Aviary Complex',
      count: '16 Cases',
      rows: [
        {
          id: '#ANM-33810',
          name: 'Zebra Finch',
          sex: 'M',
          cells: ['Laboured breathing', 'Enrofloxacin 5 mg\nMeloxicam 0.5 mg'],
        },
        { id: '#ANM-33844', name: 'Zebra Finch', sex: 'F', cells: ['Laboured breathing', 'Enrofloxacin 5 mg'] },
        { id: '#ANM-33902', name: 'Grey Francolin', sex: 'M', cells: ['Limping', 'Meloxicam 0.5 mg'] },
        { id: '#ANM-33918', name: 'Indian Peafowl', sex: 'M', cells: ['Feather loss', 'Ivermectin 0.2 mg'] },
      ],
    },
    {
      group: 'Savanna Paddocks',
      count: '14 Cases',
      rows: [
        { id: '#ANM-40218', name: 'Bengal Fox', sex: 'M', cells: ['Nasal discharge', 'Doxycycline 10 mg'] },
        { id: '#ANM-19042', name: 'Chital', sex: 'M', cells: ['Open wound', 'Ceftriaxone 20 mg'] },
        { id: '#ANM-19120', name: 'Nilgai', sex: 'F', cells: ['Lameness', 'Meloxicam 0.5 mg'] },
        { id: '#ANM-11726', name: 'Blackbuck', sex: 'M', cells: ['Reduced appetite', '--'] },
      ],
    },
    {
      group: 'Herpetarium',
      count: '11 Cases',
      rows: [
        { id: '#ANM-50133', name: 'Star Tortoise', sex: 'F', cells: ['Shell lesion', 'Ceftazidime 20 mg'] },
        { id: '#ANM-50140', name: 'Star Tortoise', sex: 'M', cells: ['Reduced appetite', '--'] },
        { id: '#ANM-50166', name: 'Flapshell Turtle', sex: 'U', cells: ['Skin redness', 'Silver sulfadiazine'] },
      ],
    },
    {
      group: 'Aquatic Halls',
      count: '9 Cases',
      rows: [
        { id: '#AQ-118', name: 'Nile Tilapia', sex: 'U', cells: ['Fungal patches', 'Malachite green · bath'] },
        { id: '#AQ-204', name: 'Giant Prawn', sex: 'U', cells: ['Mass lethargy', 'Water exchange'] },
      ],
    },
  ],
}

const disease: RecordPage = {
  title: 'Flagged Animals',
  icon: Bug,
  parent: 'disease',
  parentTitle: 'Disease & Outbreak',
  stats: [
    { value: '112', label: 'Cases' },
    { value: '9', label: 'Diseases' },
    { value: '6', label: 'Sites' },
    { value: '2', label: 'Outbreaks', tone: 'bad' },
  ],
  head: ['Animal', '', 'Site', 'Severity'],
  groupsLabel: '3 diseases',
  groups: [
    {
      group: 'Avian respiratory complex',
      count: '31 Animals',
      rows: [
        { id: '#ANM-33810', name: 'Zebra Finch', sex: 'M', cells: ['Open Aviary 4', 'High'] },
        { id: '#ANM-33844', name: 'Zebra Finch', sex: 'F', cells: ['Open Aviary 4', 'High'] },
        { id: '#ANM-33871', name: 'Zebra Finch', sex: 'U', cells: ['Open Aviary 4', 'Medium'] },
        { id: '#ANM-33902', name: 'Grey Francolin', sex: 'M', cells: ['Aviary Complex', 'Low'] },
      ],
    },
    {
      group: 'Gastrointestinal parasitism',
      count: '26 Animals',
      rows: [
        { id: '#ANM-22911', name: 'Chital', sex: 'F', cells: ['Zone A', 'Medium'] },
        { id: '#ANM-22940', name: 'Chital', sex: 'U', cells: ['Zone A', 'Medium'] },
        { id: '#ANM-19088', name: 'Blackbuck', sex: 'F', cells: ['Savanna Paddock 1', 'Low'] },
      ],
    },
    {
      group: 'Aquatic fungal infection',
      count: '22 Animals',
      rows: [
        { id: '#AQ-118', name: 'Nile Tilapia', sex: 'U', cells: ['Aquatic Hall 2', 'High'] },
        { id: '#AQ-204', name: 'Giant Prawn', sex: 'U', cells: ['Aquatic Hall 2', 'High'] },
        { id: '#AQ-231', name: 'Silver Barb', sex: 'U', cells: ['Aquatic Hall 3', 'Undetermined'] },
      ],
    },
  ],
}

/* ── preventive ──────────────────────────────────────────────────────────── */

const vaccination: RecordPage = {
  title: 'Vaccination Records',
  icon: Syringe,
  parent: 'vaccination',
  parentTitle: 'Vaccination',
  stats: [
    { value: '76', label: 'Doses' },
    { value: '14', label: 'Species' },
    { value: '5', label: 'Sites' },
    { value: '9', label: 'Vaccines' },
  ],
  head: ['Animal', '', 'Vaccine', 'Qty'],
  groupsLabel: '3 sites',
  groups: [
    {
      group: 'Savanna Paddock 1',
      count: '24 Doses',
      rows: [
        { id: '#ANM-19088', name: 'Blackbuck', sex: 'F', cells: ['FMD trivalent', '2 ml'] },
        { id: '#ANM-11726', name: 'Blackbuck', sex: 'M', cells: ['FMD trivalent', '2 ml'] },
        { id: '#ANM-19042', name: 'Chital', sex: 'M', cells: ['FMD trivalent', '2 ml'] },
        { id: '#ANM-51318', name: 'Bengal Fox', sex: 'F', cells: ['Rabies', '1 ml'] },
      ],
    },
    {
      group: 'Aviary Complex',
      count: '20 Doses',
      rows: [
        { id: '#ANM-33918', name: 'Indian Peafowl', sex: 'M', cells: ['Newcastle LaSota', '0.5 ml'] },
        { id: '#ANM-33921', name: 'Indian Peafowl', sex: 'F', cells: ['Newcastle LaSota', '0.5 ml'] },
        { id: '#ANM-33902', name: 'Grey Francolin', sex: 'M', cells: ['Newcastle LaSota', '0.5 ml'] },
      ],
    },
    {
      group: 'Herpetarium',
      count: '9 Doses',
      rows: [
        { id: '#ANM-50133', name: 'Star Tortoise', sex: 'F', cells: ['Herpesvirus', '0.3 ml'] },
        { id: '#ANM-50140', name: 'Star Tortoise', sex: 'M', cells: ['Herpesvirus', '0.3 ml'] },
        { id: '#ANM-50166', name: 'Flapshell Turtle', sex: 'U', cells: ['Herpesvirus', '0.3 ml'] },
      ],
    },
  ],
}

const deworming: RecordPage = {
  title: 'Deworming Records',
  icon: Pill,
  parent: 'deworming',
  parentTitle: 'Deworming',
  stats: [
    { value: '63', label: 'Treatments' },
    { value: '11', label: 'Species' },
    { value: '6', label: 'Sites' },
    { value: '3', label: 'Medicines' },
  ],
  head: ['Animal', '', 'Medicine', 'Qty'],
  groupsLabel: '3 sites',
  groups: [
    {
      group: 'Savanna Paddock 1 · Rotation A',
      count: '14 Treatments',
      rows: [
        { id: '#ANM-19088', name: 'Blackbuck', sex: 'F', cells: ['Ivermectin 1%', '1.4 ml'] },
        { id: '#ANM-11726', name: 'Blackbuck', sex: 'M', cells: ['Ivermectin 1%', '1.6 ml'] },
        { id: '#ANM-19042', name: 'Chital', sex: 'M', cells: ['Ivermectin 1%', '1.1 ml'] },
        { id: '#ANM-19120', name: 'Nilgai', sex: 'F', cells: ['Ivermectin 1%', '2.4 ml'] },
      ],
    },
    {
      group: 'Open Aviary 7 · Rotation B',
      count: '11 Treatments',
      rows: [
        { id: '#ANM-33902', name: 'Grey Francolin', sex: 'M', cells: ['Fenbendazole', '0.4 ml'] },
        { id: '#ANM-33918', name: 'Indian Peafowl', sex: 'M', cells: ['Fenbendazole', '0.8 ml'] },
        { id: '#ANM-51188', name: 'Zebra Finch', sex: 'U', cells: ['Fenbendazole', '0.1 ml'] },
      ],
    },
    {
      group: 'Herpetarium · Rotation C',
      count: '8 Treatments',
      rows: [
        { id: '#ANM-50133', name: 'Star Tortoise', sex: 'F', cells: ['Praziquantel', '0.5 ml'] },
        { id: '#ANM-50140', name: 'Star Tortoise', sex: 'M', cells: ['Praziquantel', '0.5 ml'] },
        { id: '#ANM-50166', name: 'Flapshell Turtle', sex: 'U', cells: ['Praziquantel', '0.4 ml'] },
      ],
    },
  ],
}

/* ── movement ────────────────────────────────────────────────────────────── */

const transferIn: RecordPage = {
  title: 'Transfer In',
  icon: ArrowDownLeft,
  parent: 'transfers',
  parentTitle: 'Transfers',
  stats: [
    { value: '12', label: 'Animals' },
    { value: '7', label: 'Species' },
    { value: '4', label: 'Sources' },
    { value: '6', label: 'Rescue' },
  ],
  head: ['Animal', '', 'From', 'Remarks'],
  groupsLabel: '2 sites',
  groups: [
    {
      group: 'Quarantine',
      count: '8 Animals',
      rows: [
        { id: '#ANM-60112', name: 'Fishing Cat', sex: 'M', cells: ['Sasan Gir', 'Rescue · road injury'] },
        { id: '#ANM-60113', name: 'Fishing Cat', sex: 'F', cells: ['Sasan Gir', 'Rescue · road injury'] },
        { id: '#ANM-60121', name: 'Sangai Deer', sex: 'F', cells: ['Junagadh Zoo', 'Breeding loan · 24 mo'] },
        { id: '#ANM-60128', name: 'Malabar Pit Viper', sex: 'U', cells: ['Forest Dept', 'Rescue · village capture'] },
      ],
    },
    {
      group: 'Aviary Complex',
      count: '4 Animals',
      rows: [
        { id: '#ANM-60302', name: 'Indian Peafowl', sex: 'M', cells: ['Wildlife SOS', 'Rehab complete'] },
        { id: '#ANM-60219', name: 'Painted Stork', sex: 'U', cells: ['WWF-India', 'Rehab complete'] },
      ],
    },
  ],
}

const transferOut: RecordPage = {
  title: 'Transfer Out',
  icon: ArrowUpRight,
  parent: 'transfers',
  parentTitle: 'Transfers',
  stats: [
    { value: '9', label: 'Animals' },
    { value: '5', label: 'Species' },
    { value: '4', label: 'Destinations' },
    { value: '1', label: 'Blocked', tone: 'bad' },
  ],
  head: ['Animal', '', 'To', 'Remarks'],
  groupsLabel: '2 sites',
  groups: [
    {
      group: 'Jamnagar Core',
      count: '6 Animals',
      rows: [
        { id: '#ANM-40218', name: 'Bengal Fox', sex: 'M', cells: ['Junagadh Zoo', 'CZA clearance pending'] },
        { id: '#ANM-40219', name: 'Bengal Fox', sex: 'F', cells: ['Junagadh Zoo', 'CZA clearance pending'] },
        { id: '#ANM-19120', name: 'Nilgai', sex: 'F', cells: ['Wetland Reserve', 'Herd rebalance'] },
        { id: '#ANM-19088', name: 'Blackbuck', sex: 'F', cells: ['Wetland Reserve', 'Herd rebalance'] },
      ],
    },
    {
      group: 'Aquatic Halls',
      count: '3 Animals',
      rows: [
        { id: '#AQ-231', name: 'Silver Barb', sex: 'U', cells: ['Aquatic Hall 3', 'Tank temperature hold'] },
        { id: '#AQ-118', name: 'Nile Tilapia', sex: 'U', cells: ['Marine Zone', 'Batch of 240'] },
      ],
    },
  ],
}

/**
 * Keyed by full route path, so a module can own more than one record set —
 * transfers has two, because "12 came in" and "9 went out" are different lists
 * and merging them would need a direction column to undo the merge.
 */
export const recordPages: Record<string, RecordPage> = {
  'mortality/records': mortality,
  'births/records': natality,
  'accession/records': accession,
  'eggs/records': hatched,
  'discarded/records': discarded,
  'fetal/records': fetal,
  'health/records': cases,
  'disease/records': disease,
  'vaccination/records': vaccination,
  'deworming/records': deworming,
  'transfers/in': transferIn,
  'transfers/out': transferOut,
}

export const findRecordPage = (slug: string) => recordPages[slug]

/** One renderer for all twelve — see the note at the top of this file. */
export function RecordsView({ page }: { page: RecordPage }) {
  const rows = page.groups.reduce((n, g) => n + g.rows.length, 0)
  return (
    <>
      <Stack>
        <Section>
          <Tray cols={4} cells={page.stats} />
        </Section>
        <Section icon={page.icon} label="Records" aside={page.groupsLabel}>
          <Roster head={page.head} groups={page.groups} />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={`${rows} of ${page.stats[0].value} rows shown`} />
    </>
  )
}
