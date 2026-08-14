/**
 * THE SPECIES PROFILE — what the animal IS, beside what we hold of it.
 *
 * Every other tab on a species page counts our own records: how many are held, how many were
 * born, which ones are alive. This one reads the species itself — its biology, its husbandry
 * requirement, its standing — and none of it moves when the window or the site changes. That
 * is why the tab carries no scope note and no window pill: a scoped figure beside an unscoped
 * one, with nothing saying which is which, is the contradiction the rest of this product
 * spends its effort avoiding.
 *
 * NOTHING HERE IS DERIVED, COMPUTED OR DEFAULTED. Each row is one column of `species`, and a
 * column the extract left empty renders NO ROW rather than an em dash, a zero or "Unknown".
 * The fill rates make that the only honest option: `lifespan_years` is present for 55% of
 * species, `incubation_days` 41%, `gestation_days` 17%, `maturity_age_years` 33%. A bird has
 * an incubation period and a mammal has a gestation, so a page that printed both for every
 * species would be inventing one of them every time. A whole card disappears when it has
 * nothing to say, which is why `Card` takes rows and returns null on an empty set.
 *
 * THE SCORES ARE NOT ALL OUT OF THE SAME NUMBER, and this is the one thing on the page worth
 * checking before changing. Intelligence, activity, social, space, stress, size, need,
 * conservation priority and visitor appeal are 1–5 across all 2,352 species; `budget_score` is
 * 0–20 and 393 species sit above 10. Each score therefore arrives from the ETL as
 * `[value, outOf]` and `Meter` divides by the denominator it is handed. The design this page
 * was modelled on assumed a common 0–10 track, which drew every welfare bar at half its true
 * height and printed "Budget 11/10" — a stated figure that is wrong, which reads as a fact.
 */

import { useMemo } from 'react'
import { Activity, Heart, Home, MapPin, Moon, Ruler, ScrollText, Sparkles, Wheat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FAINT, INK, TRACK, VALUE, useAccent } from '../exec/system'
import { Band, DefinitionList, MetricStrip, TabBody } from './speciesLayout'
import { NativeRangeMap } from './speciesRange'
import type { Score, SpeciesProfile } from '../core/profiles'

/* ── the two primitives ──────────────────────────────────────────────────── */

interface Row {
  label: string
  value: string
  sub?: string
  icon?: LucideIcon
}

/** A row only if the extract has one. `undefined` in, nothing out. */
const row = (label: string, value: string | undefined, sub?: string): Row[] =>
  value ? [{ label, value, sub }] : []

/**
 * One score against its OWN denominator, which arrives with it.
 *
 * The figure is printed as "4 / 5" rather than "80%" because these are ordinal husbandry
 * judgements, not proportions of anything — a species does not have 80% of a stress risk.
 */
function Meter({ label, score }: { label: string; score: Score }) {
  const accent = useAccent()
  const [value, outOf] = score
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, outOf)) * 100))
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1 truncate text-small" style={{ color: INK }}>
        {label}
      </span>
      <span className="h-[6px] w-[42%] shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
      </span>
      <span className="w-[46px] shrink-0 text-right text-small font-medium tabular-nums" style={{ color: VALUE }}>
        {value}
        <span className="text-caption" style={{ color: FAINT }}>
          {' / '}
          {outOf}
        </span>
      </span>
    </li>
  )
}

function Scores({
  heading,
  items,
}: {
  heading: string
  items: { label: string; score?: Score }[]
}) {
  const present = items.filter((i): i is { label: string; score: Score } => !!i.score)
  if (!present.length) return null
  return (
    <div>
      <p className="mb-1 text-caption font-semibold" style={{ color: FAINT }}>
        {heading}
      </p>
      <ul className="flex flex-col">{present.map((i) => <Meter key={i.label} label={i.label} score={i.score} />)}</ul>
    </div>
  )
}

/* ── formatting, which is units and nothing else ─────────────────────────── */

const num = (v?: string): number | undefined => {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Grams under a kilo, kilograms above it. 70 g and 11 kg, never 0.07 kg or 11000 g. */
const mass = (v?: string): string | undefined => {
  const n = num(v)
  if (n === undefined) return undefined
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} kg` : `${n < 10 ? n.toFixed(2).replace(/0$/, '') : Math.round(n)} g`
}

const years = (v?: string): string | undefined => {
  const n = num(v)
  return n === undefined ? undefined : `${n % 1 === 0 ? n : n.toFixed(1)} yrs`
}

const days = (v?: string): string | undefined => {
  const n = num(v)
  return n === undefined ? undefined : `${Math.round(n)} day${Math.round(n) === 1 ? '' : 's'}`
}

const decimal = (v?: string): string | undefined => {
  const n = num(v)
  return n === undefined ? undefined : String(n % 1 === 0 ? n : Number(n.toFixed(1)))
}

/* ── the tab ─────────────────────────────────────────────────────────────── */

export function SpeciesProfileTab({ p }: { p: SpeciesProfile | undefined }) {
  /* Native range is a comma-joined list in one column. Split here rather than in the ETL
     because the ETL's rule is to read columns across untouched, and this is presentation. */
  const range = useMemo(
    () =>
      (p?.native_countries ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [p?.native_countries],
  )

  if (!p) {
    return (
      <TabBody>
        <Band title="Profile" icon={Sparkles}>
          <p className="text-small" style={{ color: '#5c574f' }}>
            No reference biology is recorded for this species in the extract.
          </p>
        </Band>
      </TabBody>
    )
  }

  /* THE FOUR VITAL SIGNS ARE WHICHEVER FOUR THIS SPECIES HAS. Weight and lifespan are near
     universal; birth weight and clutch are not, and gestation-versus-incubation is decided by
     the animal. Building the row from what is present keeps four figures on the card for a
     bird and for a mammal without either of them borrowing the other's biology. */
  const vitals = [
    ...row('Weight', mass(p.avg_weight_g), 'avg · healthy adult'),
    ...row('Lifespan', years(p.lifespan_years), 'avg · healthy adult'),
    ...row('Birth weight', mass(p.birth_egg_weight_g), 'avg · healthy neonate'),
    ...row('Clutch / litter', decimal(p.clutch_litter_size), 'avg'),
    ...row('Maturity', years(p.maturity_age_years), 'avg'),
  ].slice(0, 4)

  /* THE DOCUMENT, NOT A DASHBOARD.
     This tab is forty-odd facts about an animal, and it used to be eight white cards in a 2×2
     grid — the same shape the Housing tab, the Pairing tab and every other tab wore. A reader
     had to re-orient inside each box, and the layout said nothing about what kind of thing they
     were reading. Reference information is a DOCUMENT: bands under sub-headings, aligned
     label/value rows, a rule between groups, and an eye that can run straight down it.

     THE TWO GROUPS ARE THE READER'S TWO QUESTIONS. "What is this animal" and "what does it
     need from us" are asked at different moments by different people — a curator planning an
     enclosure is not the person reading a dimorphism note — so characteristics and care are
     separated by a group heading rather than interleaved as eight equal boxes. */
  return (
    <TabBody>

      <Band title="Vital signs" aside="species reference" icon={Sparkles}>
        <MetricStrip items={vitals.map((v) => ({ label: v.label, value: v.value, sub: v.sub }))} />
      </Band>

      <Band title="Physical &amp; identification" icon={Ruler}>
        <DefinitionList
          items={[
            ...row('Sexual dimorphism', p.sexual_dimorphism),
            ...row('Sex ID method', p.sex_id_method),
            ...row('Recommended ID', p.recommended_id_method),
          ]}
        />
      </Band>

      <Band title="Behaviour" icon={Moon}>
        <DefinitionList
          items={[
            ...row('Activity pattern', p.activity_pattern),
            ...row('Social structure', p.social_structure),
            ...row('Habitat zone', p.habitat_zone),
            ...row('Communication', p.communication_type),
            ...row('Migration', p.migration_pattern),
            ...row('Danger level', p.danger_level),
            ...row('Handling', p.can_be_handled),
            ...row('Venom / poison', p.venomous_poisonous),
          ]}
        />
      </Band>

      <Band title="Reproductive biology" icon={Heart}>
        <DefinitionList
          items={[
            ...row('Reproduction', p.reproduction_type),
            ...row('Mating system', p.mating_system),
            ...row('Parental care', p.parental_care),
            ...row('Gestation', days(p.gestation_days)),
            ...row('Incubation', days(p.incubation_days)),
            ...row('Independence', days(p.independence_days)),
            ...row('Weaning', days(p.weaning_age_days)),
            ...row('Litters per year', decimal(p.litters_per_year)),
          ]}
        />
      </Band>

      {(p.breeding_category || p.breeding_feasibility || p.pairing_status || p.breed_group) && (
        <Band title="Breeding standing" icon={Sparkles} note="as the source classifies it, not as the register counts it">
          <DefinitionList
            items={[
              ...row('Category', p.breeding_category),
              ...row('Feasibility', p.breeding_feasibility),
              ...row('Pairing status', p.pairing_status),
              ...row('Breeding group', p.breed_group),
              ...row('Group detail', p.breed_sub),
            ]}
          />
        </Band>
      )}

      <p className="mt-2 text-caption font-semibold tracking-[0.06em] uppercase" style={{ color: FAINT }}>
        Care requirements
      </p>

      <Band title="Dietary requirements" icon={Wheat}>
        <DefinitionList
          items={[
            ...row('Diet', p.diet_category),
            ...row('Feeding frequency', p.feeding_frequency),
            ...row('Daily energy', p.daily_kcal_estimate ? `${p.daily_kcal_estimate} kcal` : undefined),
            ...row('Protein', p.protein_pct_range),
            ...row('Fat', p.fat_pct_range),
            ...row('Fibre', p.fiber_pct_range),
            ...row('Ca : P ratio', p.ca_p_ratio),
            ...row('Foraging mode', p.foraging_mode),
          ]}
        />
      </Band>

      <Band title="Habitat &amp; enclosure" icon={Home}>
        <DefinitionList
          items={[
            ...row('Enclosure type', p.enclosure_type_required),
            ...row('Substrate', p.substrate_type),
            ...row('UV light', p.uv_light_required),
            ...row('Water feature', p.water_feature_required),
            ...row('Habitat type', p.habitat_type),
          ]}
        />
      </Band>

      {/* TWO SCORE GROUPS SIDE BY SIDE AND THEY DO NOT SHARE A SCALE. Welfare needs describe the
          animal's requirement; captive-care scores describe our position on meeting it. They sit
          in one band under one heading because they are read together, and each meter divides by
          its OWN denominator — the welfare scores are 1–5 and budget is 0–20, so a common track
          would draw every welfare bar at half height and print "Budget 11/20" as if it were the
          same measurement. */}
      <Band title="Scores" icon={Activity} note="each against its own scale — welfare is out of 5, budget out of 20">
        <div className="grid gap-x-10 gap-y-6 @[560px]:grid-cols-2">
          <Scores
            heading="Welfare needs"
            items={[
              { label: 'Intelligence', score: p.intelligence_score },
              { label: 'Activity', score: p.activity_needs_score },
              { label: 'Social', score: p.social_needs_score },
              { label: 'Space', score: p.space_needs_score },
              { label: 'Stress risk', score: p.stress_risk_score },
            ]}
          />
          <Scores
            heading="Captive-care"
            items={[
              { label: 'Size', score: p.size_score },
              { label: 'Need', score: p.need_score },
              { label: 'Conservation priority', score: p.conservation_priority },
              { label: 'Visitor appeal', score: p.visitor_appeal },
              { label: 'Budget', score: p.budget_score },
            ]}
          />
        </div>
      </Band>

      {/* THE PILLS BECAME A LIST AND A MAP (2026-08-14, variant 4 of the range studies).
          Forty pills wrapped into a paragraph nobody could scan; the numbered list carries
          every entry in one aligned column, and the map beside it frames the range itself —
          see `speciesRange.tsx` for the resolution and framing rules. */}
      {range.length > 0 && (
        <Band title="Native range" aside={`${range.length}`} icon={MapPin}>
          <NativeRangeMap places={range} />
        </Band>
      )}

      {(p.species_description || p.fun_fact || p.iconic_trait || p.uniqueness) && (
        <Band title="About this species" icon={ScrollText}>
          {p.species_description && (
            <p className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
              {p.species_description}
            </p>
          )}
          {(p.group_name || p.baby_name || p.sound_description) && (
            <div className="mt-4">
              <DefinitionList
                items={[
                  ...row('A group is called', p.group_name),
                  ...row('A young one is', p.baby_name),
                  ...row('Sound', p.sound_description),
                ]}
              />
            </div>
          )}
          {(p.iconic_trait || p.fun_fact || p.uniqueness || p.cultural_significance || p.visitor_tip) && (
            <div className="mt-4 flex flex-col gap-3">
              {[
                ['Iconic trait', p.iconic_trait],
                ['Fun fact', p.fun_fact],
                ['Uniqueness', p.uniqueness],
                ['Cultural significance', p.cultural_significance],
                ['Visitor tip', p.visitor_tip],
              ]
                .filter((x): x is [string, string] => typeof x[1] === 'string')
                .map(([label, text]) => (
                  <p key={label} className="text-small leading-relaxed" style={{ color: '#3d3a34' }}>
                    <span className="font-medium" style={{ color: INK }}>
                      {label}.{' '}
                    </span>
                    {text}
                  </p>
                ))}
            </div>
          )}
        </Band>
      )}
    </TabBody>
  )
}
