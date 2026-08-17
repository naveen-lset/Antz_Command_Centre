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
 * NOTHING HERE IS DERIVED, COMPUTED OR DEFAULTED. Each value is one column of `species`, and a
 * column the extract left empty renders NOTHING rather than an em dash, a zero or "Unknown".
 * The fill rates make that the only honest option: `lifespan_years` is present for 55% of
 * species, `incubation_days` 41%, `gestation_days` 17%, `maturity_age_years` 33%. A bird has
 * an incubation period and a mammal has a gestation, so a page that printed both for every
 * species would be inventing one of them every time. A whole block disappears when it has
 * nothing to say.
 *
 * THE SCORES ARE NOT ALL OUT OF THE SAME NUMBER, and this is the one thing on the page worth
 * checking before changing. Intelligence, activity, social, space, stress, size, need,
 * conservation priority and visitor appeal are 1–5 across all 2,352 species; `budget_score` is
 * 0–20 and 393 species sit above 10. Each score therefore arrives from the ETL as
 * `[value, outOf]` and the meter divides by the denominator it is handed. The design this page
 * was modelled on assumed a common 0–10 track, which drew every welfare bar at half its true
 * height and printed "Budget 11/10" — a stated figure that is wrong, which reads as a fact.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * THE REDESIGN, AND THE TWO PROPERTIES OF THE DATA THAT PAID FOR IT
 *
 * This tab was ten white cards of aligned label/value rows. Every card was the same card, so
 * the layout said nothing about what kind of fact was inside it, and forty attributes read as
 * one undifferentiated column. The rebuild changes NO value, NO unit, NO route and NO query —
 * it changes only which shape each KIND of fact is drawn in.
 *
 * ONE · THE VALUES ALREADY CONTAIN THEIR OWN CAPTION. Sixteen of the twenty-five text columns
 * carry a parenthetical gloss on 100% of the species that have them — `Least Concern (Low
 * Risk)`, `Omnivore (Eats Everything)`, `Solitary (Lives Alone)`, `Low (Hard to Tell Apart)`.
 * The old rows printed that whole string as one flat value, so the strongest typographic
 * opportunity on the page was being discarded on every line. `gloss()` splits it: the head
 * becomes the value, the parenthetical becomes the support line under it. That single change is
 * most of why the page no longer reads as a table — a value with its own subtitle is a BLOCK,
 * and blocks can be laid out. Nine fields have no gloss (`feeding_frequency`,
 * `water_feature_required`, `breeding_category`, `pairing_status` among them) and those degrade
 * to a head with no support line, which is why `gloss()` returns an optional second half rather
 * than assuming one.
 *
 * TWO · `danger_level` IS AN ORDINAL, NOT A WORD. Every value is prefixed with its own rank —
 * `1 — Safe`, `2 — Low Risk`, `3 — Caution`, `4 — Dangerous`, `5 — Lethal`. A five-step scale
 * is therefore something the extract states rather than something a designer invented, so it is
 * drawn as five pips. Nothing else on this page gets a scale it did not arrive with.
 *
 * WHAT IS DELIBERATELY NOT DRAWN AS A RING. The three macronutrients are RANGES — `20-35%`,
 * `10-25%`, `5-15%` — and they do not sum to a hundred at either end of their spans, because
 * the remainder is moisture, ash and carbohydrate that the extract does not carry. A donut or a
 * stacked bar would state a part-to-whole relationship the data does not contain, and would
 * silently normalise three independent ranges into one invented composition. They are drawn as
 * three spans on one shared 0–100% axis instead: the comparison the reader wants (which macro
 * is richest, how wide is the tolerance) survives, and nothing is implied to add up.
 *
 * SIX SURFACES, NOT TEN, and the grouping is the reader's rather than the schema's. Identity —
 * what the animal is — is one surface holding four differently-shaped blocks; care is a second
 * holding three. A hairline sub-head separates blocks inside a surface, so the hierarchy reads
 * surface, then block, then value, and four blocks arrive as one thing instead of as four
 * competing boxes.
 */

import { useMemo } from 'react'
import {
  Activity,
  Droplets,
  Egg,
  Heart,
  Home,
  MapPin,
  Moon,
  Ruler,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Sun,
  Users,
  Waves,
  Wheat,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FAINT, HAIR, INK, INK2, MUTED, RED_LIST, TRACK, VALUE, mix, useAccent } from '../exec/system'
import { TabBody } from './speciesLayout'
import { NativeRangeMap } from './speciesRange'
import type { Score, SpeciesProfile } from '../core/profiles'

/**
 * THE LADDER THE WHOLE PAGE IS SET ON — three rungs, and it was four.
 *
 *   SECTION   16px semibold, near-black, with an accent glyph   — navigation
 *   LABEL     12px semibold UPPERCASE tracked, grey             — the field's name
 *   VALUE     18px semibold near-black (20px where it leads)    — the content
 *
 * WHAT THE RUNGS ARE FOR. The version before this set values at 14px against 12px labels, in
 * three tones of one grey — a two-pixel step and a half-weight change, which is not a hierarchy.
 * Every one of the forty attributes had equal claim on the eye and none of them won. Six pixels of
 * size, a case change and a weight change between label and value is what fixed it; the colour was
 * never the part doing the work.
 *
 * THE VALUE INK IS NEAR-BLACK AND WAS BRIEFLY DEEP GREEN. `MD3.onSurface` (#006d35) reads well and
 * passes contrast, but forty values in the accent hue makes the accent mean nothing — a page where
 * everything is emphasised has no emphasis, which is the same failure as the flat grey by the
 * opposite route. Green is now spent only where it carries meaning: the section glyphs, the pips,
 * the bars, the status chips. `VALUE` is the product's own content ink and this page uses it.
 *
 * THE FOURTH RUNG IS GONE. It held the extract's parenthetical gloss — `Ornamentation (Horns /
 * Crests / Plumage)` printed its head as the value and `Horns / Crests / Plumage` beneath it. That
 * second line is removed everywhere by decision: it doubled the height of every attribute for a
 * restatement, and forty of them made the page a wall of small grey text under larger dark text.
 * `gloss()` therefore survives and is still called — but only ever for `[0]`, to STRIP the
 * parenthetical from the value rather than to render it. Deleting the call instead would print
 * `Ornamentation (Horns / Crests / Plumage)` as one long value and undo the reason the split was
 * introduced.
 *
 * NOTE, SO THE NEXT READER KNOWS: the parenthetical is real data and is no longer shown anywhere on
 * this tab. Nine of the twenty-five columns never had one, so this is not a uniform loss — it is
 * the specifics on the sixteen that did.
 */

/* ── the atom: a value that carries its own caption ──────────────────────── */

/**
 * `Least Concern (Low Risk)` → `['Least Concern', 'Low Risk']`.
 *
 * The trailing parenthetical only. A gloss in the MIDDLE of a value is part of the value —
 * `2 — Low Risk (lucidis Caution)` is the one shape where that matters — so the expression is
 * anchored to the end of the string and takes the last group, never the first.
 */
const gloss = (v: string): [string, string | undefined] => {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(v)
  return m ? [m[1].trim(), m[2].trim()] : [v.trim(), undefined]
}

/** The ordinal `danger_level` states about itself — `3 — Caution (…)` → 3. Absent where unranked. */
const rankOf = (v?: string): number | undefined => {
  const m = /^\s*(\d)\s*[—–-]/.exec(v ?? '')
  const n = m ? Number(m[1]) : NaN
  return Number.isFinite(n) ? n : undefined
}

/** The head of `3 — Caution (…)` without its rank, since the pips already state the number. */
const unranked = (v: string): string => v.replace(/^\s*\d\s*[—–-]\s*/, '')

/**
 * ONE VALUE, AS A BLOCK RATHER THAN A ROW.
 *
 * The unit this whole page is built from. A label above, the value at weight, and the extract's
 * own parenthetical beneath it as a support line — so a reader takes in what the answer IS
 * before reading what it means, which is the opposite of the label/colon/value row it replaces.
 * Returns null on an absent column, which is what keeps the layouts below free of em dashes.
 */
function ValueBlock({
  label,
  value,
  icon: Glyph,
  size = 'md',
}: {
  label: string
  value?: string
  icon?: LucideIcon
  /** `lg` for a block that is the subject of its own zone; `md` inside a group. */
  size?: 'md' | 'lg'
}) {
  const accent = useAccent()
  if (!value) return null
  /* `[0]` only — the gloss is stripped from the value, never printed. See the header note. */
  const head = gloss(value)[0]
  return (
    <div className="min-w-0">
      {/* THE LABEL IS UPPERCASE AND TRACKED, WHICH IS WHAT STOPS IT COMPETING.
          At 12px sentence-case in grey it was the same silhouette as the value two pixels above
          it, so the eye had nothing to lock onto. Uppercase at 12px reads as a FIELD NAME at a
          glance, before any of it is actually read, which is the whole job of a label. */}
      <p
        className="flex items-center gap-1.5 text-overline font-semibold uppercase"
        style={{ color: FAINT }}
      >
        {Glyph && <Glyph size={12} strokeWidth={2} aria-hidden style={{ color: accent }} />}
        {label}
      </p>
      <p
        className={`mt-1 font-semibold ${size === 'lg' ? 'text-h3' : 'text-lead'}`}
        style={{ color: VALUE }}
      >
        {head}
      </p>
    </div>
  )
}

/** Is there anything to draw? Keeps a whole zone from rendering an empty heading. */
const any = (...v: (string | undefined)[]) => v.some(Boolean)

/* ── surfaces and sub-heads ──────────────────────────────────────────────── */

/**
 * A white surface. Plain, because the variety on this page comes from what goes INSIDE the
 * surfaces rather than from decorating them — ten differently-bordered cards would be the same
 * monotony with more noise.
 */
function Surface({ children, pad = 'md' }: { children: React.ReactNode; pad?: 'md' | 'lg' }) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border bg-white ${pad === 'lg' ? 'p-[var(--pad-card)]' : 'p-[var(--pad-card-sm)]'}`}
      style={{ borderColor: HAIR }}
    >
      {children}
    </section>
  )
}

/**
 * A block heading INSIDE a surface, and the reason the page needs one at all.
 *
 * Four blocks in one card need separating without being boxed — a border round each would put
 * the ten cards back inside two. A hairline above and an overline label is the lightest thing
 * that still reads as "a new kind of fact starts here". `first` drops the rule, because a rule
 * under a surface's own top edge is two lines saying one thing.
 */
function Sub({
  label,
  icon: Glyph,
  first,
  aside,
  children,
}: {
  label: string
  icon?: LucideIcon
  first?: boolean
  aside?: string
  children: React.ReactNode
}) {
  const accent = useAccent()
  return (
    /**
     * THE INTER-BLOCK RHYTHM IS 16 + 12, AND IT WAS 20 + 16.
     *
     * Nine blocks means the gap between them is paid eight times, so four pixels either side of a
     * heading is thirty-two pixels of page. Measured: the first draft of this rebuild came out 2px
     * TALLER than the ten-card design it replaced once its new Conservation block is discounted —
     * fewer surfaces, same height, because the padding saved on card edges had been spent again on
     * generous block spacing. A hairline is already a complete separator; it does not need 36px of
     * air to be seen.
     */
    <div className={first ? '' : 'mt-7 border-t pt-5'} style={first ? undefined : { borderColor: HAIR }}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        {/* THE SECTION HEADING WAS THE SAME SIZE AS THE FIELD LABELS UNDER IT — both 12px
            uppercase — so a block's name and the names of the things inside it were one
            indistinguishable tier. It is 16px sentence-case now: a different SIZE and a different
            CASE from the labels, so the heading reads as structure and the labels read as fields.
            The values are deliberately larger still; on a reference page the content should be the
            loudest thing on the surface and the heading only has to be findable. */}
        <h3 className="flex items-center gap-2 text-body font-semibold" style={{ color: INK }}>
          {Glyph && <Glyph size={16} strokeWidth={1.75} aria-hidden style={{ color: accent }} />}
          {label}
        </h3>
        {aside && (
          <span className="shrink-0 text-caption tabular-nums" style={{ color: FAINT }}>
            {aside}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/** The one divider on the page, between what the animal is and what it needs from us. */
function GroupRule({ label }: { label: string }) {
  return (
    <div className="mt-1 flex items-center gap-3">
      <span className="text-overline font-semibold tracking-[0.1em] uppercase" style={{ color: MUTED }}>
        {label}
      </span>
      <span className="h-px flex-1" style={{ backgroundColor: HAIR }} />
    </div>
  )
}

/* ── 1 · vital signs, as a measured strip ────────────────────────────────── */

/**
 * THE ONE SECTION THAT IS NOT ON WHITE, and that is what makes it the page's opening statement.
 *
 * A very light accent wash with hairline separators between the figures: four numbers on one
 * baseline, read across in a single pass. It is the only zone here drawn as a strip, so the eye
 * has a fixed point to come back to — every other section is a different shape by design, and a
 * page of nothing but different shapes has no anchor.
 *
 * `divide-x` rather than a border per cell, so the separators fall BETWEEN figures and never
 * outside the first or last one.
 */
function VitalStrip({ items }: { items: { label: string; value: string; sub?: string }[] }) {
  const accent = useAccent()
  if (!items.length) return null
  return (
    <section
      className="rounded-[var(--radius-card)] border p-[var(--pad-card-sm)]"
      style={{ borderColor: HAIR, backgroundColor: '#ffffff' }}
    >
      <p
        className="mb-2.5 flex items-center gap-1.5 text-caption font-semibold tracking-[0.06em] uppercase"
        style={{ color: INK }}
      >
        <Sparkles size={13} strokeWidth={2} aria-hidden style={{ color: accent }} />
        Vital signs
      </p>
      <div className="grid grid-cols-2 gap-y-5 @[560px]:flex @[560px]:divide-x" style={{ borderColor: mix(accent, 0.2) }}>
        {items.map((m, i) => (
          <div key={m.label} className={`min-w-0 @[560px]:flex-1 ${i > 0 ? '@[560px]:pl-5' : ''} @[560px]:pr-1`}>
            <p className="text-overline font-semibold uppercase" style={{ color: MUTED }}>
              {m.label}
            </p>
            <p
              className="mt-1 font-display text-[26px] leading-[1.1] font-bold tabular-nums"
              style={{ color: VALUE }}
            >
              {m.value}
            </p>
            {m.sub && (
              <p className="mt-px text-caption" style={{ color: FAINT }}>
                {m.sub}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── 3 · behaviour: traits, then safety ──────────────────────────────────── */

/**
 * DANGER AS FIVE PIPS, because the column is an ordinal and says so.
 *
 * Filled to the stated rank, and the fill only turns warm past the midpoint — a two-of-five
 * drawn in the alarm colour would make 780 harmless species look like a hazard. The rank is not
 * reprinted beside the pips: the word is already the value, and "3 Caution 3/5" says three
 * things twice.
 */
function DangerPips({ rank, of = 5 }: { rank: number; of?: number }) {
  /* Read unconditionally, then chosen between — a hook behind a ternary runs on some renders and
     not others, which React forbids outright. */
  const accent = useAccent()
  const hot = rank >= 4 ? '#d4553a' : rank === 3 ? '#b45309' : accent
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className="h-[6px] w-[14px] rounded-full"
          style={{ backgroundColor: i < rank ? hot : TRACK }}
        />
      ))}
    </span>
  )
}

/**
 * A yes/no husbandry requirement, as a state rather than a sentence.
 *
 * The columns are worded `No (Aquatic Species)` and `Full aquatic habitat` — some are a verdict
 * with a reason, some are only a description — so the mark reads the LEADING word and leaves the
 * rest as the caption. Anything that does not open with yes or no gets the neutral treatment and
 * keeps its full text, which is why a substrate note never comes out looking like a refusal.
 */
function StateRow({ label, value, icon: Glyph }: { label: string; value?: string; icon: LucideIcon }) {
  const accent = useAccent()
  if (!value) return null
  const head = gloss(value)[0]
  const yes = /^yes\b/i.test(head)
  const no = /^no\b/i.test(head)
  const tint = yes ? mix(accent, 0.12) : no ? '#f2f1ee' : mix(accent, 0.07)
  const ink = yes ? accent : no ? FAINT : INK2
  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="mt-px grid size-6 shrink-0 place-items-center rounded-[7px]" style={{ backgroundColor: tint }}>
        <Glyph size={13} strokeWidth={2} aria-hidden style={{ color: ink }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-overline font-semibold uppercase" style={{ color: FAINT }}>
          {label}
        </span>
        <span className="block text-lead font-semibold" style={{ color: VALUE }}>
          {head}
        </span>
      </span>
    </li>
  )
}

/* ── 4 · reproduction, as a lifecycle ────────────────────────────────────── */

/**
 * THE LIFECYCLE IS TWO PHASES WITH BIRTH BETWEEN THEM, AND THAT IS NOT A FLOURISH.
 *
 * Gestation and incubation are measured up TO birth or hatching; weaning and independence are
 * measured FROM it. Laying all four on one axis — which is what a single left-to-right run of
 * durations would do — puts a 60-day gestation and a 60-day weaning at the same point on a
 * timeline they do not share, and states that one follows the other when in truth they are on
 * opposite sides of the event. So the sequence is drawn as pre-birth, then a marked node, then
 * post-birth.
 *
 * THE NODE IS NAMED BY WHICHEVER COLUMN THE SPECIES HAS. `gestation_days` means the animal is
 * born and `incubation_days` means it hatches — the same either/or the file header describes,
 * and the same one the old rows relied on by printing only the column that existed.
 *
 * THE POST-BIRTH STEPS ARE ORDERED BY THEIR OWN DAY COUNTS rather than by a fixed list, so the
 * arrow never points from a larger number to a smaller one. Weaning usually precedes
 * independence and in this extract sometimes does not; sorting means the drawing cannot claim a
 * sequence the figures contradict.
 */
function Lifecycle({
  origin,
  pre,
  node,
  post,
}: {
  origin?: string
  pre?: { label: string; value: string }
  node: string
  post: { label: string; value: string; days: number }[]
}) {
  const accent = useAccent()
  const steps = [
    ...(pre ? [{ ...pre, kind: 'pre' as const }] : []),
    { label: node, value: '', kind: 'node' as const },
    ...post.map((s) => ({ label: s.label, value: s.value, kind: 'post' as const })),
  ]
  if (steps.length < 2) return null

  return (
    <div>
      {origin && (
        <p className="mb-4 text-lead font-semibold" style={{ color: VALUE }}>
          {gloss(origin)[0]}
        </p>
      )}
      {/* The connector is ONE line behind the whole run rather than a segment per gap, so it
          cannot fall out of step with the nodes when the row wraps. */}
      <ol className="relative flex flex-wrap gap-y-4">
        <span
          className="absolute top-[7px] right-2 left-2 hidden h-px @[520px]:block"
          style={{ backgroundColor: mix(accent, 0.28) }}
          aria-hidden
        />
        {steps.map((s) => (
          <li key={s.label} className="relative min-w-0 flex-1 basis-[46%] @[520px]:basis-0">
            <span
              className="block size-[15px] rounded-full border-[3px] bg-white"
              style={{ borderColor: s.kind === 'node' ? accent : mix(accent, 0.45) }}
              aria-hidden
            />
            <p
              className="mt-2 pr-3 text-overline font-semibold uppercase"
              style={{ color: s.kind === 'node' ? accent : FAINT, fontWeight: s.kind === 'node' ? 600 : 400 }}
            >
              {s.label}
            </p>
            {/* THE EVENT NODE HAS NO DURATION, AND ITS SLOT IS HELD OPEN RATHER THAN FILLED.
                Birth is an instant, so there is no figure to print under it — but the slot has to
                keep its height or the labels either side of it sit on two different baselines and
                the row stops reading as one timeline. It was briefly a middot, which rendered as a
                stray dot under the word and looked like a typo. An empty line of the same size is
                the fix: `aria-hidden` because a screen reader should not be handed a blank. */}
            <p
              className="font-display text-h3 leading-tight font-semibold tabular-nums"
              style={{ color: VALUE }}
              aria-hidden={s.value ? undefined : true}
            >
              {s.value || ' '}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── 6a · diet: three ranges on one axis ─────────────────────────────────── */

/**
 * ONE MACRONUTRIENT'S RANGE, drawn as the span it is.
 *
 * `20-35%` is not a value with an error bar and not a share of anything — it is a husbandry
 * tolerance, and the honest mark for a tolerance is a bar that STARTS where the range starts.
 * A bar from zero to 35 would state a quantity; this states an interval. The axis is 0–100%
 * across every macro so the three can be compared, and the percentages are printed because a
 * span read off an unlabelled axis is a guess.
 *
 * Anything that does not parse as `low-high%` is printed as text and given no bar. Better a
 * plain value than a bar drawn from a number the parser invented.
 */
function RangeBar({ label, value }: { label: string; value?: string }) {
  const accent = useAccent()
  if (!value) return null
  const m = /(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/.exec(value)
  const lo = m ? Number(m[1]) : undefined
  const hi = m ? Number(m[2]) : undefined
  const ok = lo !== undefined && hi !== undefined && hi > lo && hi <= 100

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small" style={{ color: INK }}>
          {label}
        </span>
        <span className="shrink-0 text-body font-semibold tabular-nums" style={{ color: VALUE }}>
          {value}
        </span>
      </div>
      {ok && (
        <span className="mt-1.5 block h-[6px] w-full rounded-full" style={{ backgroundColor: TRACK }} aria-hidden>
          <span
            className="block h-full rounded-full"
            style={{ marginLeft: `${lo}%`, width: `${hi - lo}%`, backgroundColor: accent }}
          />
        </span>
      )}
    </li>
  )
}

/* ── 6c · scores ─────────────────────────────────────────────────────────── */

/**
 * A SCORE AGAINST ITS OWN DENOMINATOR, and the mark changes with the denominator.
 *
 * A 1–5 husbandry judgement is drawn as five SEGMENTS, because it has five possible answers and
 * a continuous bar implies it could have landed anywhere between them. `budget_score` is 0–20
 * and gets a continuous track, because twenty segments is a dotted line. The figure is printed
 * as "4 / 5" rather than "80%" throughout: these are ordinal judgements, not proportions, and a
 * species does not have 80% of a stress risk.
 */
function ScoreRow({ label, score }: { label: string; score: Score }) {
  const accent = useAccent()
  const [value, outOf] = score
  const segmented = outOf <= 6
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, outOf)) * 100))
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="min-w-0 flex-1 truncate text-small" style={{ color: INK }}>
        {label}
      </span>
      {segmented ? (
        <span className="flex shrink-0 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: outOf }, (_, i) => (
            <span
              key={i}
              className="h-[7px] w-[13px] rounded-full"
              style={{ backgroundColor: i < value ? accent : TRACK }}
            />
          ))}
        </span>
      ) : (
        <span className="h-[7px] w-[84px] shrink-0 overflow-hidden rounded-full" style={{ backgroundColor: TRACK }} aria-hidden>
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
        </span>
      )}
      <span className="w-[46px] shrink-0 text-right text-body font-semibold tabular-nums" style={{ color: VALUE }}>
        {value}
        <span className="text-caption" style={{ color: FAINT }}>
          {' / '}
          {outOf}
        </span>
      </span>
    </li>
  )
}

function ScoreGroup({ heading, items }: { heading: string; items: { label: string; score?: Score }[] }) {
  const present = items.filter((i): i is { label: string; score: Score } => !!i.score)
  if (!present.length) return null
  return (
    <div className="min-w-0">
      <p className="mb-2 text-overline font-semibold uppercase" style={{ color: FAINT }}>
        {heading}
      </p>
      <ul className="flex flex-col">
        {present.map((i) => (
          <ScoreRow key={i.label} label={i.label} score={i.score} />
        ))}
      </ul>
    </div>
  )
}

/* ── 8 · standing ────────────────────────────────────────────────────────── */

/**
 * IUCN, ITS TREND AND CITES, AS A STATUS STRIP.
 *
 * The Red List code and its published colour are looked up by NAME, because that is what the
 * column holds: `iucn_status` is `Least Concern (Low Risk)` and `Least Concern` is the standard's
 * own wording for LC. A status that does not match the standard's list gets no chip and no
 * colour rather than a guessed one — the same rule the species header follows.
 *
 * THE DOT CARRIES THE COLOUR AND THE TYPE DOES NOT. Four of the ten published fills fail contrast
 * against white at type size — the Vulnerable yellow measures 1.9:1 — so the swatch states the
 * category and the words stay legible, which is the treatment `RedList` in the design system
 * already uses.
 */
function StandingStrip({ status, trend, cites }: { status?: string; trend?: string; cites?: string }) {
  const accent = useAccent()
  if (!any(status, trend, cites)) return null
  const head = status ? gloss(status)[0] : undefined
  const entry = head ? RED_LIST.find((c) => c.name.toLowerCase() === head.toLowerCase()) : undefined

  /* Only `Not Evaluated` carries an outline — its published fill is white, so without one the
     swatch would be invisible on a white surface. `RED_LIST` is const-asserted, so the property
     exists on exactly one member of the union and has to be narrowed rather than reached for. */
  const outline = entry && 'outline' in entry ? (entry.outline as string) : undefined

  const items = [
    status && {
      key: 'iucn',
      label: 'IUCN Red List',
      value: status,
      swatch: entry?.fill,
      outline,
      code: entry?.code,
    },
    trend && { key: 'trend', label: 'Population trend', value: trend },
    cites && { key: 'cites', label: 'CITES', value: cites },
  ].filter(Boolean) as {
    key: string
    label: string
    value: string
    swatch?: string
    outline?: string
    code?: string
  }[]

  return (
    <Surface>
      <Sub label="Conservation standing" icon={ShieldAlert} first>
        <div className="grid gap-x-6 gap-y-6 @[560px]:grid-cols-3">
          {items.map((it) => {
            const h = gloss(it.value)[0]
            return (
              <div key={it.key} className="min-w-0">
                <p className="text-overline font-semibold uppercase" style={{ color: FAINT }}>
                  {it.label}
                </p>
                <p className="mt-1 flex items-center gap-2">
                  {it.swatch !== undefined && (
                    <span
                      className="size-[11px] shrink-0 rounded-full"
                      style={{
                        backgroundColor: it.swatch,
                        boxShadow: it.outline ? `inset 0 0 0 1px ${it.outline}` : undefined,
                      }}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 text-h3 font-semibold" style={{ color: VALUE }}>
                    {h}
                  </span>
                  {it.code && (
                    <span
                      className="shrink-0 rounded-full px-1.5 text-caption font-semibold"
                      style={{ backgroundColor: mix(accent, 0.1), color: accent }}
                    >
                      {it.code}
                    </span>
                  )}
                </p>
              </div>
            )
          })}
        </div>
      </Sub>
    </Surface>
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
  /* Read at the top and unconditionally — the early return for a species with no profile is
     below, and a hook after a `return` is a hook that runs on some renders and not others. */
  const accent = useAccent()

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
        <Surface>
          <Sub label="Profile" icon={Sparkles} first>
            <p className="text-small" style={{ color: MUTED }}>
              No reference biology is recorded for this species in the extract.
            </p>
          </Sub>
        </Surface>
      </TabBody>
    )
  }

  /* THE FOUR VITAL SIGNS ARE WHICHEVER FOUR THIS SPECIES HAS. Weight and lifespan are near
     universal; birth weight and clutch are not, and gestation-versus-incubation is decided by
     the animal. Building the row from what is present keeps four figures on the strip for a
     bird and for a mammal without either of them borrowing the other's biology. */
  const vitals = [
    { label: 'Weight', value: mass(p.avg_weight_g), sub: 'avg · adult' },
    { label: 'Lifespan', value: years(p.lifespan_years), sub: 'avg · adult' },
    { label: 'Birth weight', value: mass(p.birth_egg_weight_g), sub: 'avg · neonate' },
    { label: 'Clutch / litter', value: decimal(p.clutch_litter_size), sub: 'avg' },
    { label: 'Maturity', value: years(p.maturity_age_years), sub: 'avg' },
  ]
    .filter((v): v is { label: string; value: string; sub: string } => Boolean(v.value))
    .slice(0, 4)

  /* The lifecycle's post-birth steps, ordered by their own day counts — see `Lifecycle`. */
  const post = [
    { label: 'Weaning', raw: p.weaning_age_days },
    { label: 'Independence', raw: p.independence_days },
  ]
    .map((s) => ({ label: s.label, value: days(s.raw), days: num(s.raw) }))
    .filter((s): s is { label: string; value: string; days: number } => Boolean(s.value) && s.days !== undefined)
    .sort((a, b) => a.days - b.days)

  const pre = p.gestation_days
    ? { label: 'Gestation', value: days(p.gestation_days)! }
    : p.incubation_days
      ? { label: 'Incubation', value: days(p.incubation_days)! }
      : undefined
  const node = p.incubation_days && !p.gestation_days ? 'Hatch' : 'Birth'

  const danger = rankOf(p.danger_level)

  return (
    <TabBody>
      {/* 1 · THE OPENING STATEMENT — the only zone not on white. */}
      <VitalStrip items={vitals} />

      {/* 2–5 · WHAT THIS ANIMAL IS. One surface, four differently-shaped blocks. */}
      <Surface pad="lg">
        {any(p.sexual_dimorphism, p.sex_id_method, p.recommended_id_method) && (
          <Sub label="Physical &amp; identification" icon={Ruler} first>
            <div className="grid gap-x-8 gap-y-6 @[520px]:grid-cols-3">
              <ValueBlock label="Sexual dimorphism" value={p.sexual_dimorphism} size="lg" />
              <ValueBlock label="Sex ID method" value={p.sex_id_method} size="lg" />
              <ValueBlock label="Recommended ID" value={p.recommended_id_method} size="lg" />
            </div>
          </Sub>
        )}

        {/* 3 · BEHAVIOUR — traits as a grid of blocks, safety as states. Two shapes in one
            block, because "how it lives" and "how close you may get" are read by different
            people at different moments. */}
        {any(
          p.activity_pattern,
          p.social_structure,
          p.habitat_zone,
          p.communication_type,
          p.migration_pattern,
          p.danger_level,
          p.can_be_handled,
          p.venomous_poisonous,
        ) && (
          <Sub
            label="Behaviour"
            icon={Moon}
            first={!any(p.sexual_dimorphism, p.sex_id_method, p.recommended_id_method)}
          >
            <div className="grid gap-x-8 gap-y-6 @[420px]:grid-cols-2 @[760px]:grid-cols-3">
              <ValueBlock label="Activity pattern" value={p.activity_pattern} icon={Moon} />
              <ValueBlock label="Social structure" value={p.social_structure} icon={Users} />
              <ValueBlock label="Habitat zone" value={p.habitat_zone} icon={MapPin} />
              <ValueBlock label="Communication" value={p.communication_type} icon={Waves} />
              <ValueBlock label="Migration" value={p.migration_pattern} icon={Activity} />
            </div>

            {any(p.danger_level, p.can_be_handled, p.venomous_poisonous) && (
              <div
                className="mt-5 rounded-[12px] p-4"
                style={{ backgroundColor: '#faf9f7', border: `1px solid ${HAIR}` }}
              >
                {p.danger_level && (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pb-1">
                    <span className="text-overline font-semibold uppercase" style={{ color: FAINT }}>
                      Danger level
                    </span>
                    <span className="flex items-center gap-2.5">
                      <span className="text-lead font-semibold" style={{ color: VALUE }}>
                        {gloss(unranked(p.danger_level))[0]}
                      </span>
                      {danger !== undefined && <DangerPips rank={danger} />}
                    </span>
                  </div>
                )}
                <ul className="flex flex-col @[520px]:flex-row @[520px]:gap-8">
                  <StateRow label="Handling" value={p.can_be_handled} icon={Heart} />
                  <StateRow label="Venom / poison" value={p.venomous_poisonous} icon={ShieldAlert} />
                </ul>
              </div>
            )}
          </Sub>
        )}

        {/* 4 · REPRODUCTION — a lifecycle, then its secondary facts. */}
        {any(
          p.reproduction_type,
          p.gestation_days,
          p.incubation_days,
          p.weaning_age_days,
          p.independence_days,
          p.mating_system,
          p.parental_care,
          p.litters_per_year,
        ) && (
          <Sub label="Reproductive biology" icon={Egg}>
            <Lifecycle origin={p.reproduction_type} pre={pre} node={node} post={post} />
            {any(p.mating_system, p.parental_care, decimal(p.litters_per_year)) && (
              <div className="mt-5 grid gap-x-8 gap-y-6 border-t pt-4 @[520px]:grid-cols-3" style={{ borderColor: HAIR }}>
                <ValueBlock label="Mating system" value={p.mating_system} />
                <ValueBlock label="Parental care" value={p.parental_care} />
                <ValueBlock label="Litters per year" value={decimal(p.litters_per_year)} />
              </div>
            )}
          </Sub>
        )}

        {/* 5 · BREEDING STANDING — the source's classification, as a status line. */}
        {/* GATED ON WHAT IS DRAWN, NOT ON WHAT THE COLUMN SET HOLDS. `breed_group` and `breed_sub`
            used to print as a meta line under the chips and no longer print at all, so leaving them
            in this condition would open the block for a species that has only those two and then
            show a heading with nothing beneath it. No species in the current extract is in that
            position — checked, it is zero of 2,339 — but the condition has to match the render or
            the next extract makes it a live bug. */}
        {any(p.breeding_category, p.breeding_feasibility, p.pairing_status) && (
          <Sub label="Breeding standing" icon={Sparkles}>
            <div className="flex flex-wrap items-center gap-2">
              {([p.breeding_category, p.pairing_status].filter(Boolean) as string[]).map((v) => (
                <span
                  key={v}
                  className="rounded-full px-3 py-1.5 text-body font-semibold"
                  style={{ backgroundColor: mix(accent, 0.1), color: accent }}
                >
                  {gloss(v)[0]}
                </span>
              ))}
              {p.breeding_feasibility && (
                <span className="text-caption" style={{ color: MUTED }}>
                  {gloss(p.breeding_feasibility)[0]}
                </span>
              )}
            </div>
          </Sub>
        )}
      </Surface>

      {/* 6 · CARE REQUIREMENTS. */}
      <GroupRule label="Care requirements" />

      <Surface pad="lg">
        {any(
          p.diet_category,
          p.feeding_frequency,
          p.daily_kcal_estimate,
          p.protein_pct_range,
          p.fat_pct_range,
          p.fiber_pct_range,
          p.ca_p_ratio,
          p.foraging_mode,
        ) && (
          <Sub label="Dietary requirements" icon={Wheat} first>
            <div className="flex flex-col gap-6 @[600px]:flex-row @[600px]:gap-10">
              <div className="grid min-w-0 flex-1 gap-x-6 gap-y-6 @[420px]:grid-cols-2">
                <ValueBlock label="Diet" value={p.diet_category} size="lg" />
                <ValueBlock label="Feeding frequency" value={p.feeding_frequency} size="lg" />
                <ValueBlock label="Foraging mode" value={p.foraging_mode} />
                <ValueBlock
                  label="Daily energy"
                  value={p.daily_kcal_estimate ? `${p.daily_kcal_estimate} kcal` : undefined}
                />
              </div>
              {/* The macro spans, on one shared axis — see `RangeBar`. */}
              {any(p.protein_pct_range, p.fat_pct_range, p.fiber_pct_range, p.ca_p_ratio) && (
                <div className="min-w-0 @[600px]:w-[46%]">
                  <p className="mb-2 text-overline font-semibold uppercase" style={{ color: FAINT }}>
                    Composition · share of diet
                  </p>
                  <ul className="flex flex-col">
                    <RangeBar label="Protein" value={p.protein_pct_range} />
                    <RangeBar label="Fat" value={p.fat_pct_range} />
                    <RangeBar label="Fibre" value={p.fiber_pct_range} />
                  </ul>
                  {p.ca_p_ratio && (
                    <p className="mt-2 flex items-baseline justify-between gap-3 border-t pt-2" style={{ borderColor: HAIR }}>
                      <span className="text-small" style={{ color: INK }}>
                        Ca : P ratio
                      </span>
                      <span className="text-body font-semibold tabular-nums" style={{ color: VALUE }}>
                        {p.ca_p_ratio}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </Sub>
        )}

        {/* HABITAT — requirements as states, which is a different shape from the diet's spans. */}
        {any(p.enclosure_type_required, p.substrate_type, p.uv_light_required, p.water_feature_required, p.habitat_type) && (
          <Sub label="Habitat &amp; enclosure" icon={Home}>
            <div className="flex flex-col gap-6 @[600px]:flex-row @[600px]:gap-10">
              <div className="grid min-w-0 flex-1 gap-x-6 gap-y-6 @[420px]:grid-cols-2">
                <ValueBlock label="Enclosure type" value={p.enclosure_type_required} size="lg" />
                <ValueBlock label="Habitat type" value={p.habitat_type} size="lg" />
                <ValueBlock label="Substrate" value={p.substrate_type} />
              </div>
              <ul className="min-w-0 @[600px]:w-[46%]">
                <StateRow label="UV light" value={p.uv_light_required} icon={Sun} />
                <StateRow label="Water feature" value={p.water_feature_required} icon={Droplets} />
              </ul>
            </div>
          </Sub>
        )}

        {/* TWO SCORE GROUPS SIDE BY SIDE AND THEY DO NOT SHARE A SCALE. Welfare needs describe
            the animal's requirement; captive-care scores describe our position on meeting it.
            They sit under one heading because they are read together, and each row divides by its
            OWN denominator — see `ScoreRow`. */}
        <Sub label="Scores" icon={Activity} aside="welfare out of 5 · budget out of 20">
          <div className="grid gap-x-10 gap-y-6 @[560px]:grid-cols-2">
            <ScoreGroup
              heading="Welfare needs"
              items={[
                { label: 'Intelligence', score: p.intelligence_score },
                { label: 'Activity', score: p.activity_needs_score },
                { label: 'Social', score: p.social_needs_score },
                { label: 'Space', score: p.space_needs_score },
                { label: 'Stress risk', score: p.stress_risk_score },
              ]}
            />
            <ScoreGroup
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
        </Sub>
      </Surface>

      {/* 7 · NATIVE RANGE — the map leads, and `NativeRangeMap` already carries the list beside
          it. See `speciesRange.tsx` for the resolution and framing rules. */}
      {range.length > 0 && (
        <Surface pad="lg">
          <Sub label="Native range" icon={MapPin} first aside={`${range.length} places`}>
            <NativeRangeMap places={range} />
          </Sub>
        </Surface>
      )}

      {/* 8 · CONSERVATION STANDING. */}
      <StandingStrip status={p.iucn_status} trend={p.iucn_trend} cites={p.cites_appendix} />

      {any(p.species_description, p.fun_fact, p.iconic_trait, p.uniqueness) && (
        <Surface pad="lg">
          <Sub label="About this species" icon={ScrollText} first>
            {p.species_description && (
              <p className="text-small leading-relaxed" style={{ color: INK2 }}>
                {p.species_description}
              </p>
            )}
            {any(p.group_name, p.baby_name, p.sound_description) && (
              <div className="mt-5 grid gap-x-8 gap-y-6 @[520px]:grid-cols-3">
                <ValueBlock label="A group is called" value={p.group_name} />
                <ValueBlock label="A young one is" value={p.baby_name} />
                <ValueBlock label="Sound" value={p.sound_description} />
              </div>
            )}
            {any(p.iconic_trait, p.fun_fact, p.uniqueness, p.cultural_significance, p.visitor_tip) && (
              <div className="mt-5 flex flex-col gap-3 border-t pt-4" style={{ borderColor: HAIR }}>
                {(
                  [
                    ['Iconic trait', p.iconic_trait],
                    ['Fun fact', p.fun_fact],
                    ['Uniqueness', p.uniqueness],
                    ['Cultural significance', p.cultural_significance],
                    ['Visitor tip', p.visitor_tip],
                  ] as [string, string | undefined][]
                )
                  .filter((x): x is [string, string] => typeof x[1] === 'string')
                  .map(([label, text]) => (
                    <p key={label} className="text-small leading-relaxed" style={{ color: INK2 }}>
                      <span className="font-medium" style={{ color: INK }}>
                        {label}.{' '}
                      </span>
                      {text}
                    </p>
                  ))}
              </div>
            )}
          </Sub>
        </Surface>
      )}
    </TabBody>
  )
}
