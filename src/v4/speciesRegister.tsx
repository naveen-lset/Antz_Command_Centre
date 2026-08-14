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

import { Fingerprint, Layers, Sparkles } from 'lucide-react'
import type { SpeciesProfile } from '../core/profiles'
import { fmt } from '../exec/system'
import { Band, CoverageMeter, DefinitionList, MetricStrip, NotePanel, RankedBars, TabBody } from './speciesLayout'

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
        <Band title="Identification" icon={Fingerprint}>
          <p className="text-small" style={{ color: '#5c574f' }}>
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
      <Band title="Coverage" aside={`${fmt(id.of)} animals`} icon={Fingerprint}>
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
        <Band title="Breeds &amp; morphs" icon={Sparkles}>
          <p className="text-small" style={{ color: '#5c574f' }}>
            No breed or morph is recorded for this species. The register carries one for 225 of
            its 2,411 held species — it is the exception rather than the rule.
          </p>
        </Band>
      </TabBody>
    )
  }

  return (
    <TabBody>
      <Band title="Recorded" aside={`${fmt(b.of)} animals`} icon={Sparkles}>
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

/* ── assessments ─────────────────────────────────────────────────────────── */

/**
 * REBUILT AS ITS OWN FILE, RE-EXPORTED HERE so `entity.tsx`'s import stands. The tab is no
 * longer the rollup summary this file used to draw — it is the four-section operational view
 * (Population / Physical Health / Endoscopy / Alerts) in `speciesAssess.tsx`, fed by the same
 * `profile.assessments` rollup through `speciesAssessData.ts`.
 */
export { SpeciesAssessmentsTab } from './speciesAssess'
