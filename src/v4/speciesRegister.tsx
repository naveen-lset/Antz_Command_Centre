/**
 * WHAT TELLS THESE ANIMALS APART, WHAT STOCK THEY ARE, AND WHAT HAS BEEN MEASURED OF THEM.
 *
 * Three tabs from one file because all three answer questions about the REGISTER rather than
 * about the species — how well it is identified, what breeds and morphs it carries, and what
 * has actually been recorded against it. They share every primitive below, and splitting them
 * across three files would be three copies of `Coverage`.
 *
 * EVERY FIGURE HERE ARRIVES AS `[value, outOf]` AND IS NEVER GIVEN A DENOMINATOR HERE. A
 * coverage percentage has a different denominator for every species — 1,045 Ochre Warblers,
 * 3 Tense Kirin — so a renderer that supplied one, or drew a bar against a fixed 100, would be
 * wrong on almost all of them. That is the defect behind the reference design's "110% CHIPPED":
 * a coverage figure taken from a different pair than the one printed beside it. Here the pair
 * IS the figure, so it cannot exceed itself.
 *
 * ABSENT IS NOT ZERO AND IS NOT DRAWN. The ETL drops a key entirely where the count is zero,
 * so a species with no ringed animals renders no ring row rather than "0 of 1,045" — which
 * reads as a finding when it is only a silence.
 */

import { Fingerprint, Layers, Ruler, Sparkles } from 'lucide-react'
import { longDate } from '../core/calendar'
import type { Of, Reading, SpeciesProfile } from '../core/profiles'
import { FAINT, fmt } from '../exec/system'
import { Band, CoverageMeter, DataTable, DefinitionList, MetricStrip, NotePanel, RankedBars, TabBody } from './speciesLayout'

/* ── identification · coverage → type → records ──────────────────────────── */

/**
 * How much of this species' holding can be told apart from the rest of it.
 *
 * THE SHAPE IS THE STORY: coverage, then type, then what is left over. One wide meter answers
 * "how much of this population is identifiable at all" in a glance, which two stacked cards of
 * numbers never did — a reader had to divide 97 by 1,045 themselves to learn that the answer
 * was "almost none of it".
 *
 * TWO COUNTS OF THE SAME THING ARE BOTH REPORTED AND NEITHER IS ADJUSTED. `micro_chip` is
 * filled on 36,530 housing rows while `identifier_type` says 'Micro chip' on 31,084 — a strict
 * subset. Reconciling them silently would pick a winner the source never nominated; stating
 * both lets the gap be seen, which is the useful thing about it.
 */
export function SpeciesIdentificationTab({ profile }: { profile?: SpeciesProfile }) {
  const id = profile?.identification
  if (!id) {
    return (
      <TabBody>
        <Band title="Identification" icon={Fingerprint} first>
          <p className="text-small" style={{ color: '#6d6860' }}>
            No identification is recorded against this species in the register.
          </p>
        </Band>
      </TabBody>
    )
  }

  /* THE THREE SEGMENTS ARE DISJOINT, WHICH IS WHY THEY CAN SHARE ONE TRACK. `none` is the
     register's own count of animals with no chip, no ring and no identifier type, so the
     identified remainder is the total less that — computed from the pair the ETL supplied
     rather than by adding chip and ring, which would double-count an animal carrying both. */
  const none = id.none?.[0] ?? 0
  const identified = Math.max(0, id.of - none)

  return (
    <TabBody>
      <Band title="Coverage" aside={`${fmt(id.of)} animals`} icon={Fingerprint} first>
        <CoverageMeter
          total={id.of}
          segments={[
            { label: 'Carries an identifier', value: identified, fill: '#37bd69' },
            { label: 'Nothing to tell them apart by', value: none, fill: '#cfd8d2' },
          ]}
        />
        <div className="mt-6">
          <DefinitionList
            columns={2}
            items={[
              ...(id.chip ? [{ label: 'Microchipped', value: `${fmt(id.chip[0])} of ${fmt(id.chip[1])}` }] : []),
              ...(id.ring ? [{ label: 'Ringed', value: `${fmt(id.ring[0])} of ${fmt(id.ring[1])}` }] : []),
              ...(id.identType
                ? [{ label: 'Carries an identifier type', value: `${fmt(id.identType[0])} of ${fmt(id.identType[1])}` }]
                : []),
            ]}
          />
        </div>
        {(id.chipShared || id.chipVoid || id.ringShared) && (
          <div className="mt-5">
            {/* THE CAVEATS ARE FIGURES, NOT PROSE, because each changes what the meter above
                means. A chip two animals share identifies neither, and a chip column holding
                "No" is a recorded refusal rather than a number — both are stated beside the
                coverage and neither is subtracted from it, because filled and usable are two
                different facts. */}
            <NotePanel title="Counted, not subtracted">
              {[
                id.chipShared ? `${fmt(id.chipShared)} share a chip number with another animal` : null,
                id.chipVoid ? `${fmt(id.chipVoid)} carry a recorded refusal rather than a number` : null,
                id.ringShared ? `${fmt(id.ringShared)} share a ring number with another animal` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              . Filled and usable are two facts, so neither is taken off the coverage above.
            </NotePanel>
          </div>
        )}
      </Band>

      {!!id.types?.length && (
        <Band title="By identifier type" aside={String(id.types.length)} icon={Layers}>
          <RankedBars items={id.types} unit="animals" total={id.of} />
        </Band>
      )}
    </TabBody>
  )
}

/* ── breeds · a classification list ──────────────────────────────────────── */

/** What stock and colour form this species is held as, where the register records one. */
export function SpeciesBreedsTab({ profile }: { profile?: SpeciesProfile }) {
  const b = profile?.breeds
  if (!b || (!b.withBreed && !b.withMorph)) {
    return (
      <TabBody>
        <Band title="Breeds &amp; morphs" icon={Sparkles} first>
          <p className="text-small" style={{ color: '#6d6860' }}>
            No breed or morph is recorded for this species. The register carries one for 225 of
            its 2,411 held species — it is the exception rather than the rule.
          </p>
        </Band>
      </TabBody>
    )
  }

  return (
    <TabBody>
      <Band title="Recorded" aside={`${fmt(b.of)} animals`} icon={Sparkles} first>
        <MetricStrip
          items={[
            ...(b.withBreed ? [{ label: 'Carries a breed', value: fmt(b.withBreed[0]), sub: `of ${fmt(b.withBreed[1])}` }] : []),
            ...(b.withMorph ? [{ label: 'Carries a morph', value: fmt(b.withMorph[0]), sub: `of ${fmt(b.withMorph[1])}` }] : []),
            ...(b.byBreed?.length ? [{ label: 'Distinct breeds', value: String(b.byBreed.length) }] : []),
            ...(b.byMorph?.length ? [{ label: 'Distinct morphs', value: String(b.byMorph.length) }] : []),
          ]}
        />
      </Band>

      {!!b.byBreed?.length && (
        <Band title="By breed" aside={String(b.byBreed.length)} icon={Layers}>
          <RankedBars items={b.byBreed} unit="animals" total={b.withBreed?.[0]} />
        </Band>
      )}
      {!!b.byMorph?.length && (
        <Band title="By morph" aside={String(b.byMorph.length)} icon={Layers}>
          <RankedBars items={b.byMorph} unit="animals" total={b.withMorph?.[0]} />
        </Band>
      )}
    </TabBody>
  )
}

/* ── assessments · an analytics page ─────────────────────────────────────── */

/**
 * One measured reading — its range, its mean, and the unit it was taken in.
 *
 * NEVER POOLED ACROSS UNITS. Weight is recorded in kilograms on 49,502 assessment rows and in
 * grams on 34,584, in one column. A mean over both averages a 940 g animal with a 3.1 kg one
 * and reports about 470, which is a number with no referent — so a species weighed in both gets
 * a row per unit and the unit is on the row.
 *
 * A SCALE IS QUOTED AS A FLOOR, NOT AS A SCALE. The schema declares no maximum for Body
 * Condition Score or any other graded observation, so `outOf` is the highest value seen
 * ANYWHERE in the dump for that type. That makes it a lower bound on the true scale, which is
 * why this says "recorded up to" and never "out of".
 */
function readingRow(r: Reading) {
  const scaled = Array.isArray(r.mean)
  const mean = scaled ? (r.mean as Of)[0] : (r.mean as number)
  const outOf = scaled ? (r.mean as Of)[1] : undefined
  const unit = r.uom ? ` ${r.uom}` : ''
  const n = (v: number) => (v % 1 === 0 ? String(v) : v.toFixed(1))
  return {
    type: r.type + (r.uom ? ` · ${r.uom}` : ''),
    mean: outOf === undefined ? n(mean) : `${n(mean)} (recorded up to ${outOf})`,
    range: `${n(r.lo)} to ${n(r.hi)}${unit}`,
    n: fmt(r.n),
  }
}

/** What has actually been measured of this species, and when. */
export function SpeciesAssessmentsTab({ profile }: { profile?: SpeciesProfile }) {
  const a = profile?.assessments
  if (!a || !a.n) {
    return (
      <TabBody>
        <Band title="Assessments" icon={Ruler} first>
          <p className="text-small" style={{ color: '#6d6860' }}>
            No assessment has been recorded against this species.
          </p>
        </Band>
      </TabBody>
    )
  }

  const months = Object.entries(a.months ?? {}).sort(([x], [y]) => x.localeCompare(y))
  const peak = Math.max(...months.map(([, v]) => v), 1)
  const readings = (a.readings ?? []).map(readingRow)

  return (
    <TabBody>
      <Band title="Recorded" aside={`${fmt(a.n)} assessment${a.n === 1 ? '' : 's'}`} icon={Ruler} first>
        <MetricStrip
          items={[
            { label: 'Assessments', value: fmt(a.n) },
            ...(a.assessed
              ? [
                  {
                    label: 'Animals assessed',
                    value: fmt(a.assessed[0]),
                    /* Counted over the same set as its own denominator, so it cannot exceed
                       one — the property the reference design's chipped figure did not have. */
                    sub: `of ${fmt(a.assessed[1])}`,
                  },
                ]
              : []),
            ...(a.types?.length ? [{ label: 'Types', value: String(a.types.length) }] : []),
            { label: 'First recorded', value: longDate(a.first) },
            { label: 'Last recorded', value: longDate(a.last) },
          ]}
        />
      </Band>

      {months.length > 1 && (
        <Band title="When they were taken" aside={`${months.length} months`} icon={Layers}>
          {/* A BAR PER MONTH THE SOURCE RECORDED, and no bar for a month it did not. Filling the
              gaps with zeros would draw a flat line through periods nobody assessed in and read
              as "we checked and found nothing", which is a different claim from "nobody
              checked". */}
          <div className="flex items-end gap-1.5" style={{ height: 96 }}>
            {months.map(([m, v]) => (
              <div key={m} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-caption tabular-nums" style={{ color: FAINT }}>
                  {v}
                </span>
                <span
                  className="w-full rounded-t-[3px]"
                  style={{ height: `${Math.max(3, (v / peak) * 64)}px`, backgroundColor: '#37bd69' }}
                  title={`${m} · ${v}`}
                />
                <span className="truncate text-[10px]" style={{ color: FAINT }}>
                  {m.slice(2).replace('-', '/')}
                </span>
              </div>
            ))}
          </div>
        </Band>
      )}

      {readings.length > 0 && (
        <Band title="What was found" aside={String(readings.length)} icon={Ruler}>
          <DataTable
            rows={readings}
            keyOf={(r) => r.type}
            columns={[
              { key: 'type', head: 'Assessment', cell: (r) => r.type, priority: 3 },
              { key: 'mean', head: 'Mean', cell: (r) => r.mean, align: 'right', priority: 2 },
              { key: 'range', head: 'Range', cell: (r) => r.range, align: 'right', priority: 1 },
              { key: 'n', head: 'Readings', cell: (r) => r.n, align: 'right', priority: 2 },
            ]}
          />
        </Band>
      )}

      {!!a.types?.length && (
        <Band title="By type" aside={String(a.types.length)} icon={Layers}>
          <RankedBars items={a.types} unit="assessments" total={a.n} />
        </Band>
      )}
      {!!a.categories?.length && (
        <Band title="By category" aside={String(a.categories.length)} icon={Layers}>
          <RankedBars items={a.categories} unit="assessments" total={a.n} />
        </Band>
      )}
      {!!a.stages?.length && (
        <Band title="By life stage" aside={String(a.stages.length)} icon={Layers}>
          <RankedBars items={a.stages} unit="assessments" />
          <p className="mt-2 text-caption" style={{ color: FAINT }}>
            Life stage is unrecorded on most rows, so these do not sum to {fmt(a.n)}.
          </p>
        </Band>
      )}
    </TabBody>
  )
}
