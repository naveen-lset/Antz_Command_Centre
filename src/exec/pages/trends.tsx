/**
 * 30-DAY TRENDS — the three series that move, on one window.
 *
 * The point of collecting them here is comparability. Each module carries its own
 * trend, but read one at a time nobody notices that the new-case rise in week two
 * and the mortality rise in week three are the same aquatic event eight days apart.
 * Same window, same buckets, same axis treatment on all three.
 *
 * Under each trend sits the ranked breakdown that explains it, then the link down
 * to the animals behind it — shape, then cause, then names.
 */

import { Activity, Baby, Stethoscope } from 'lucide-react'
import { report } from '../report'
import { Bars, Donut, Hero, Ladder, More, Rule, Section, Stack, Stamp, Trend } from '../system'

const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

export default function Trends() {
  return (
    <>
      <Hero
        icon={Activity}
        value="30"
        unit="d"
        label="Trend window"
        status="02 Jul – 01 Aug"
        stats={[
          { value: '45', label: 'Births' },
          { value: '23', label: 'Deaths' },
          { value: '50', label: 'New cases' },
        ]}
      />
      <Stack>
        <Section icon={Baby} label="Natality" aside={<More href="#/births/records" />}>
          <Trend
            values={[2, 2, 3, 3, 4, 4, 3, 3, 3, 4, 3, 3, 3, 3, 2]}
            labels={WEEKS}
            unit="45 births · 2-day buckets"
          />
          <Rule label="Top species" />
          <Ladder
            leader={{ label: 'Zebra Finch', sub: 'Open Aviary 4 · 2 clutches', value: '18' }}
            rest={[
              { label: 'Blackbuck', sub: 'Savanna Paddocks · 4 dams', value: '7' },
              { label: 'Nilgai', sub: 'Wetland Reserve', value: '6' },
              { label: 'Indian Peafowl', sub: 'Aviary Complex', value: '5' },
              { label: 'Others', sub: '20 species', value: '9' },
            ]}
          />
        </Section>

        <Section icon={Activity} label="Mortality" aside={<More href="#/mortality/records" />}>
          <Trend
            tone="bad"
            values={[1, 1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 4, 3, 1]}
            labels={WEEKS}
            unit="23 deaths · 2-day buckets"
          />
          <Rule label="Causes" />
          <Donut
            label="Deaths"
            items={[
              { label: 'Natural causes', value: 9 },
              { label: 'Disease', value: 5 },
              { label: 'Injury', value: 3 },
              { label: 'Trauma', value: 2, tone: 'bad' },
              { label: 'Undetermined', value: 2 },
              { label: 'Other · 3 causes', value: 2 },
            ]}
          />
        </Section>

        <Section icon={Stethoscope} label="New cases" aside={<More href="#/health/records" />}>
          {/* Rises through week 3 and falls in week 4 — the aviary respiratory
              outbreak, which Disease & Outbreak dates to 21 July. */}
          <Trend
            values={[2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 6, 5, 4, 2, 1]}
            labels={WEEKS}
            unit="50 cases · 2-day buckets"
          />
          <Rule label="Top complaints" />
          <Bars
            showShare
            items={[
              { label: 'Laboured breathing', value: 11, sub: 'Aviary' },
              { label: 'Reduced appetite', value: 9 },
              { label: 'Lameness · limping', value: 8 },
              { label: 'Open wound', value: 7 },
              { label: 'Skin redness', value: 6 },
              { label: 'Fungal patches', value: 5, sub: 'Aquatic' },
              { label: 'Other · 6 complaints', value: 4 },
            ]}
          />
        </Section>
      </Stack>
      <Stamp asOf={report.asOf} source={report.source} />
    </>
  )
}
