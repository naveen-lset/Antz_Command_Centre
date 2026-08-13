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
import type { LucideIcon } from 'lucide-react'
import { longDate } from '../core/calendar'
import type { Of, Reading, SpeciesProfile, Tally } from '../core/profiles'
import { FAINT, INK, Section, TRACK, VALUE, fmt, useAccent } from '../exec/system'

/* ── primitives ──────────────────────────────────────────────────────────── */

/**
 * "97 of 1,045 · 9%" — the numerator, its own denominator, and the share of the two.
 *
 * The percentage is computed from the pair on the same line, which is the whole point: a
 * reader can check it, and no third number can contradict it.
 */
function Coverage({ label, of, sub }: { label: string; of: Of; sub?: string }) {
  const accent = useAccent()
  const [value, outOf] = of
  const pct = outOf > 0 ? (value / outOf) * 100 : 0
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-small" style={{ color: INK }}>
          {label}
        </span>
        <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
          {fmt(value)}
          <span className="text-caption" style={{ color: FAINT }}>
            {' of '}
            {fmt(outOf)} · {pct < 1 && pct > 0 ? pct.toFixed(1) : Math.round(pct)}%
          </span>
        </span>
      </div>
      <span className="mt-2 block h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
      </span>
      {sub && (
        <p className="mt-1.5 text-caption" style={{ color: FAINT }}>
          {sub}
        </p>
      )}
    </li>
  )
}

/** A vocabulary, commonest first, with its tail counted rather than dropped. */
function TallyList({ items, unit, max = 8 }: { items: Tally; unit: string; max?: number }) {
  const shown = items.slice(0, max)
  const rest = items.slice(max)
  const restValue = rest.reduce((n, [, v]) => n + v, 0)
  const top = Math.max(...items.map(([, v]) => v), 1)
  const accent = useAccent()
  return (
    <>
      <ul className="flex flex-col">
        {shown.map(([label, v]) => (
          <li key={label} className="py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-small" style={{ color: INK }}>
                {label}
              </span>
              <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
                {fmt(v)}
              </span>
            </div>
            <span className="mt-1.5 block h-[5px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
              <span className="block h-full rounded-full" style={{ width: `${(v / top) * 100}%`, backgroundColor: accent }} />
            </span>
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <p className="mt-2 text-caption" style={{ color: FAINT }}>
          <span className="tabular-nums">{rest.length}</span> more · <span className="tabular-nums">{fmt(restValue)}</span> {unit}
        </p>
      )}
    </>
  )
}

/** A card that does not render when it has nothing to put in it. */
function Card({ icon, label, aside, children, when }: { icon: LucideIcon; label: string; aside?: string; children: React.ReactNode; when: boolean }) {
  if (!when) return null
  return (
    <Section icon={icon} label={label} aside={aside}>
      {children}
    </Section>
  )
}

/* ── identification ──────────────────────────────────────────────────────── */

/**
 * How much of this species' holding can be told apart from the rest of it.
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
      <Section icon={Fingerprint} label="Identification">
        <p className="text-small text-[#6d6860]">No identification is recorded against this species in the register.</p>
      </Section>
    )
  }

  return (
    <>
      <Section icon={Fingerprint} label="Coverage" aside={`${fmt(id.of)} animals`}>
        <ul className="flex flex-col divide-y" style={{ borderColor: '#f0efec' }}>
          {id.chip && <Coverage label="Microchipped" of={id.chip} />}
          {id.ring && <Coverage label="Ringed" of={id.ring} />}
          {id.identType && <Coverage label="Carries an identifier type" of={id.identType} />}
          {id.none && (
            <Coverage
              label="Nothing to tell them apart by"
              of={id.none}
              sub="no chip, no ring and no identifier type"
            />
          )}
        </ul>
        {/* THE CAVEATS ARE FIGURES, NOT PROSE, because each of them changes what the bar above
            means. A chip two animals share identifies neither, and a chip column holding "No"
            is a recorded refusal rather than a number — both are stated beside the coverage and
            neither is subtracted from it, because filled and usable are two different facts. */}
        {(id.chipShared || id.chipVoid || id.ringShared) && (
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            {[
              id.chipShared ? `${fmt(id.chipShared)} share a chip number with another animal` : null,
              id.chipVoid ? `${fmt(id.chipVoid)} carry a recorded refusal rather than a number` : null,
              id.ringShared ? `${fmt(id.ringShared)} share a ring number with another animal` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            . Counted, not subtracted — filled and usable are two facts.
          </p>
        )}
      </Section>

      <Card icon={Layers} label="By identifier type" aside={String(id.types?.length ?? 0)} when={!!id.types?.length}>
        <TallyList items={id.types ?? []} unit="animals" />
      </Card>
    </>
  )
}

/* ── breeds ──────────────────────────────────────────────────────────────── */

/** What stock and colour form this species is held as, where the register records one. */
export function SpeciesBreedsTab({ profile }: { profile?: SpeciesProfile }) {
  const b = profile?.breeds
  if (!b || (!b.withBreed && !b.withMorph)) {
    return (
      <Section icon={Sparkles} label="Breeds & morphs">
        <p className="text-small text-[#6d6860]">
          No breed or morph is recorded for this species. The register carries one for 225 of its
          2,411 held species — it is the exception rather than the rule.
        </p>
      </Section>
    )
  }
  return (
    <>
      <Section icon={Sparkles} label="Recorded" aside={`${fmt(b.of)} animals`}>
        <ul className="flex flex-col divide-y" style={{ borderColor: '#f0efec' }}>
          {b.withBreed && <Coverage label="Carries a breed" of={b.withBreed} />}
          {b.withMorph && <Coverage label="Carries a morph" of={b.withMorph} />}
        </ul>
      </Section>
      <Card icon={Layers} label="By breed" aside={String(b.byBreed?.length ?? 0)} when={!!b.byBreed?.length}>
        <TallyList items={b.byBreed ?? []} unit="animals" />
      </Card>
      <Card icon={Layers} label="By morph" aside={String(b.byMorph?.length ?? 0)} when={!!b.byMorph?.length}>
        <TallyList items={b.byMorph ?? []} unit="animals" />
      </Card>
    </>
  )
}

/* ── assessments ─────────────────────────────────────────────────────────── */

/**
 * One measured reading — its range, its mean, and the unit it was taken in.
 *
 * NEVER POOLED ACROSS UNITS. Weight is recorded in kilograms on 49,502 assessment rows and in
 * grams on 34,584, in one column. A mean over both averages a 940 g animal with a 3.1 kg one
 * and reports about 470, which is a number with no referent — so a species weighed in both
 * gets a row per unit and the unit is on the row.
 *
 * A SCALE IS QUOTED AS A FLOOR, NOT AS A SCALE. The schema declares no maximum for Body
 * Condition Score or any other graded observation, so `outOf` is the highest value seen
 * ANYWHERE in the dump for that type. That makes it a lower bound on the true scale, which is
 * why this says "recorded up to" and never "out of".
 */
function ReadingRow({ r }: { r: Reading }) {
  const scaled = Array.isArray(r.mean)
  const mean = scaled ? (r.mean as Of)[0] : (r.mean as number)
  const outOf = scaled ? (r.mean as Of)[1] : undefined
  const unit = r.uom ? ` ${r.uom}` : ''
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-small" style={{ color: INK }}>
          {r.type}
          {r.uom && (
            <span className="ml-1.5 text-caption" style={{ color: FAINT }}>
              {r.uom}
            </span>
          )}
        </span>
        <span className="shrink-0 text-small font-medium tabular-nums" style={{ color: VALUE }}>
          {mean % 1 === 0 ? mean : mean.toFixed(1)}
          {outOf !== undefined && (
            <span className="text-caption" style={{ color: FAINT }}>
              {' '}
              recorded up to {outOf}
            </span>
          )}
        </span>
      </div>
      <p className="mt-1 text-caption" style={{ color: FAINT }}>
        {fmt(r.n)} reading{r.n === 1 ? '' : 's'} · {r.lo % 1 === 0 ? r.lo : r.lo.toFixed(1)} to{' '}
        {r.hi % 1 === 0 ? r.hi : r.hi.toFixed(1)}
        {unit}
      </p>
    </li>
  )
}

/** What has actually been measured of this species, and when. */
export function SpeciesAssessmentsTab({ profile }: { profile?: SpeciesProfile }) {
  const a = profile?.assessments
  if (!a || !a.n) {
    return (
      <Section icon={Ruler} label="Assessments">
        <p className="text-small text-[#6d6860]">No assessment has been recorded against this species.</p>
      </Section>
    )
  }

  return (
    <>
      <Section icon={Ruler} label="Recorded" aside={`${fmt(a.n)} assessment${a.n === 1 ? '' : 's'}`}>
        <ul className="flex flex-col divide-y" style={{ borderColor: '#f0efec' }}>
          {a.assessed && (
            <Coverage
              label="Animals assessed at least once"
              of={a.assessed}
              /* Counted over the same set as its own denominator, so it cannot exceed one —
                 the property the reference design's chipped figure did not have. */
              sub={`first ${longDate(a.first)} · last ${longDate(a.last)}`}
            />
          )}
        </ul>
      </Section>

      <Card icon={Ruler} label="What was found" aside={String(a.readings?.length ?? 0)} when={!!a.readings?.length}>
        <ul className="flex flex-col divide-y" style={{ borderColor: '#f0efec' }}>
          {(a.readings ?? []).map((r) => (
            <ReadingRow key={`${r.type}-${r.uom ?? ''}`} r={r} />
          ))}
        </ul>
      </Card>

      <Card icon={Layers} label="By type" aside={String(a.types?.length ?? 0)} when={!!a.types?.length}>
        <TallyList items={a.types ?? []} unit="assessments" />
      </Card>

      <Card icon={Layers} label="By category" aside={String(a.categories?.length ?? 0)} when={!!a.categories?.length}>
        <TallyList items={a.categories ?? []} unit="assessments" />
      </Card>

      {/* Life stage is stated last and with its own caveat, because it is the one tally here
          that does NOT sum to the total: `life_stage` is null on 47,183 rows dump-wide and the
          ETL drops nulls rather than bucketing them into a category nobody recorded. */}
      <Card icon={Layers} label="By life stage" aside={String(a.stages?.length ?? 0)} when={!!a.stages?.length}>
        <TallyList items={a.stages ?? []} unit="assessments" />
        <p className="mt-2 text-caption" style={{ color: FAINT }}>
          Life stage is unrecorded on most rows, so these do not sum to {fmt(a.n)}.
        </p>
      </Card>
    </>
  )
}
