/**
 * THE PAGE IS ONE PARK, not a hero illustration followed by an empty gradient.
 *
 * The hero artwork is untouched. What this adds is the ground it stands on, continued
 * underneath the whole scroll: tree clusters, bushes, grass, a path, ponds, fences,
 * rocks and small plants, drawn in the same flat-vector idiom and the same sage
 * palette, and held at 5–10% so it is scenery rather than content.
 *
 * FOUR DECISIONS WORTH STATING.
 *
 * It is drawn, not tiled from the hero. Repeating the hero artwork down the page would
 * put the same elephants on screen six times, which reads as a bug. These are new
 * shapes — and deliberately environmental only: no animals appear below the hero, so
 * nothing down here competes with the one illustration meant to be looked at.
 *
 * NOTHING IS FILLED TO THE BAND EDGE, and that is the whole trick. The first attempt
 * drew each band as a ridge with solid ground beneath it and open sky above; stacked,
 * that produced alternating filled and empty horizontal strips — visible rectangles
 * with hard edges behind the cards, the exact opposite of continuous. So there is no
 * ground plane at all now. Every mark is a silhouette floating on the page's own
 * gradient, scattered through the full height of its band, which means a band boundary
 * has nothing to draw and cannot be seen.
 *
 * The layer fades as it descends — a mask from full at the horizon to about half at the
 * foot — so the environment thins out under the densest content instead of ending on an
 * edge. With the 10% base that lands the bottom of a long page at roughly 5%.
 *
 * It is `pointer-events-none`, `aria-hidden` and on its own stacking layer behind
 * everything, so it can never intercept a tap or reach a screen reader.
 */

/* Sage, from the palette already in `index.css` — no new colours are introduced. */
const DEEP = '#1f5148'
const MID = '#356b52'
const SOFT = '#4e8f6b'
const PALE = '#79ab8e'

/** One band is 1200 × 900; at column width W it renders W × 0.75. */
const W = 1200
const H = 900

/* ── parts ───────────────────────────────────────────────────────────────── */

/** A tree: trunk, canopy, and two lighter lobes so it reads as foliage not a blob. */
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-5} y={-56} width={10} height={58} rx={4} fill={MID} />
      <ellipse cx={0} cy={-82} rx={60} ry={43} fill={MID} />
      <ellipse cx={-36} cy={-60} rx={38} ry={29} fill={SOFT} />
      <ellipse cx={38} cy={-64} rx={34} ry={26} fill={SOFT} />
      <ellipse cx={4} cy={-108} rx={30} ry={22} fill={SOFT} />
    </g>
  )
}

/** A far tree — one crown, no detail. Reads as distance at this weight. */
function FarTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-2.5} y={-14} width={5} height={16} rx={2} fill={PALE} />
      <ellipse cx={0} cy={-26} rx={24} ry={18} fill={PALE} />
    </g>
  )
}

function Bush({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={27} ry={18} fill={MID} />
      <ellipse cx={-17} cy={5} rx={18} ry={12} fill={SOFT} />
      <ellipse cx={18} cy={4} rx={16} ry={11} fill={SOFT} />
    </g>
  )
}

/** Three fronds from a point — the small ground plants. */
function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={SOFT} strokeWidth={2.6} fill="none" strokeLinecap="round">
      <path d="M0 0 q -11 -9 -15 -20" />
      <path d="M0 0 q 0 -14 0 -24" />
      <path d="M0 0 q 11 -9 15 -20" />
    </g>
  )
}

function Tuft({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke={MID} strokeWidth={2.4} fill="none" strokeLinecap="round">
      <path d="M0 0 q -3 -10 -1 -18" />
      <path d="M5 0 q 1 -12 4 -20" />
      <path d="M10 0 q 6 -9 10 -15" />
    </g>
  )
}

function Rock({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={19} ry={12} fill={DEEP} opacity={0.5} />
      <ellipse cx={-8} cy={-4} rx={9} ry={6} fill={MID} opacity={0.6} />
    </g>
  )
}

/** A pond — outline, a soft fill and two ripples. Never a filled rectangle. */
function Pond({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={168} ry={40} fill={SOFT} opacity={0.55} />
      <ellipse cx={0} cy={-3} rx={140} ry={29} fill={MID} opacity={0.3} />
      <path d="M-72 4 q 34 -8 68 0" stroke={PALE} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d="M-16 18 q 40 -9 80 0" stroke={PALE} strokeWidth={3} fill="none" strokeLinecap="round" />
      {[-118, -104, -90, 92, 106, 120].map((rx, i) => (
        <path
          key={rx}
          d={`M${rx} -14 q ${i % 2 ? 5 : -5} -22 0 -40`}
          stroke={MID}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}

/** Post-and-rail, drawn as a run of a given width rather than to the band edge. */
function Fence({ x, y, w, s = 1 }: { x: number; y: number; w: number; s?: number }) {
  const posts = Math.max(2, Math.round(w / 82))
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.8}>
      <rect x={0} y={0} width={w} height={3} rx={1.5} fill={DEEP} />
      <rect x={0} y={18} width={w} height={3} rx={1.5} fill={DEEP} />
      {Array.from({ length: posts }, (_, i) => (i * w) / (posts - 1)).map((px) => (
        <rect key={px} x={px} y={-12} width={4.5} height={44} rx={2} fill={DEEP} />
      ))}
    </g>
  )
}

/**
 * A path — two curved edges enclosing a lighter ribbon, never a stroke.
 *
 * Kept narrow and short so it reads as a track through the scene rather than a band
 * across it, which is what would reintroduce the horizontal-strip problem.
 */
function Path({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M0 120 Q 120 62 300 46 T 620 8 L 690 2 L 706 30 Q 500 54 330 84 T 34 148 Z"
        fill={PALE}
        opacity={0.7}
      />
    </g>
  )
}

/* ── the three scenes ────────────────────────────────────────────────────── */
/*
 * Each fills its whole 900 of height rather than concentrating on a horizon line, so
 * stacking them produces even coverage with no seam. The three differ enough that the
 * cycle does not read as a loop, and alternate bands are mirrored on top of that.
 */

function Grove() {
  return (
    <>
      <FarTree x={90} y={120} s={1.1} />
      <FarTree x={230} y={96} s={0.85} />
      <FarTree x={980} y={132} s={1} />
      <FarTree x={1108} y={104} s={0.8} />
      <Tree x={196} y={330} s={1.05} />
      <Tree x={640} y={250} s={0.78} />
      <Tree x={1030} y={392} s={0.92} />
      <Bush x={330} y={392} s={1.1} />
      <Bush x={392} y={404} />
      <Bush x={820} y={318} s={0.9} />
      <Fence x={420} y={520} w={430} />
      <Tuft x={120} y={560} />
      <Tuft x={286} y={598} s={1.15} />
      <Tuft x={922} y={548} />
      <Plant x={520} y={648} />
      <Plant x={1076} y={604} s={1.1} />
      <Rock x={704} y={664} s={1.1} />
      <Rock x={758} y={678} s={0.8} />
      <Tree x={352} y={806} s={1.15} />
      <Bush x={880} y={772} s={1.2} />
      <Tuft x={60} y={846} s={1.2} />
      <Tuft x={1010} y={862} />
      <Plant x={636} y={880} />
    </>
  )
}

function Water() {
  return (
    <>
      <FarTree x={160} y={110} s={0.9} />
      <FarTree x={1040} y={92} s={1.05} />
      <Path x={640} y={150} s={0.9} />
      <Pond x={330} y={318} s={0.92} />
      <Bush x={604} y={286} s={0.95} />
      <Rock x={556} y={392} />
      <Rock x={604} y={406} s={0.75} />
      <Tree x={932} y={352} s={0.88} />
      <Tuft x={188} y={452} s={1.1} />
      <Tuft x={806} y={470} />
      <Plant x={430} y={512} s={1.15} />
      <Bush x={1094} y={528} s={1.05} />
      <Fence x={120} y={636} w={360} s={0.92} />
      <Pond x={880} y={720} s={0.72} />
      <Tuft x={352} y={742} />
      <Plant x={228} y={800} />
      <Rock x={636} y={828} s={1.15} />
      <Tree x={1050} y={880} s={1} />
      <Tuft x={520} y={874} s={1.1} />
    </>
  )
}

function Meadow() {
  return (
    <>
      <FarTree x={70} y={104} s={0.8} />
      <FarTree x={196} y={128} s={1} />
      <FarTree x={330} y={100} s={0.9} />
      <FarTree x={880} y={118} s={0.95} />
      <FarTree x={1010} y={96} s={0.75} />
      <Bush x={480} y={214} s={1.05} />
      <Tree x={790} y={286} s={0.95} />
      <Plant x={150} y={300} s={1.1} />
      <Tuft x={604} y={330} />
      <Tuft x={664} y={352} s={0.9} />
      <Rock x={1090} y={368} />
      <Tree x={262} y={470} s={0.85} />
      <Fence x={700} y={492} w={380} s={0.88} />
      <Plant x={520} y={556} />
      <Tuft x={96} y={604} s={1.15} />
      <Bush x={936} y={640} s={1.1} />
      <Tuft x={430} y={690} />
      <Plant x={820} y={740} s={1.05} />
      <Rock x={196} y={772} s={1.2} />
      <Tree x={604} y={856} s={1.08} />
      <Tuft x={1100} y={824} s={1.1} />
      <Plant x={330} y={880} />
    </>
  )
}

const SCENES = [Grove, Water, Meadow]

/**
 * Leaves, butterflies and the occasional far bird — "occasional", as asked.
 *
 * About six marks a band, kept in the gaps between the larger silhouettes so they add
 * depth without adding density. The bird glyph is the one the header mist already
 * uses, so the two layers agree with each other.
 */
function Drift({ seed }: { seed: number }) {
  const shift = (v: number) => (v + seed * 137) % W
  return (
    <g opacity={0.72}>
      {[
        { x: 210, y: 196, r: -18 },
        { x: 880, y: 452, r: 24 },
        { x: 540, y: 706, r: 8 },
      ].map((l, i) => (
        <path
          key={i}
          transform={`translate(${shift(l.x)} ${l.y}) rotate(${l.r}) scale(1.3)`}
          d="M0 0 q 9 -5 14 -14 q -10 1 -14 14 Z"
          fill={SOFT}
        />
      ))}
      {[
        { x: 392, y: 388 },
        { x: 1044, y: 612 },
      ].map((f, i) => (
        <g key={i} transform={`translate(${shift(f.x)} ${f.y}) scale(1.2)`} fill={MID}>
          <ellipse cx={-4.5} cy={0} rx={4.5} ry={6} transform="rotate(-24 -4.5 0)" />
          <ellipse cx={4.5} cy={0} rx={4.5} ry={6} transform="rotate(24 4.5 0)" />
        </g>
      ))}
      {seed % 2 === 0 &&
        [
          { x: 700, y: 64, s: 1.5 },
          { x: 748, y: 46, s: 1.15 },
        ].map((b, i) => (
          <path
            key={i}
            d="M0,4 C2.5,0.5 4.5,0.5 6,3.2 C7.5,0.5 9.5,0.5 12,4"
            fill="none"
            stroke={MID}
            strokeWidth={1.7}
            strokeLinecap="round"
            transform={`translate(${shift(b.x)} ${b.y}) scale(${b.s})`}
          />
        ))}
    </g>
  )
}

/**
 * The layer.
 *
 * Fourteen bands at 0.75 aspect reaches past the foot of the longest page in the
 * product at phone width; anything beyond the container is clipped rather than laid
 * out, so a short page costs nothing. Alternate bands are mirrored so the three scenes
 * do not read as a three-step loop.
 *
 * TWO PROFILES, AND THE DIFFERENCE IS WHETHER THERE IS A HERO ABOVE IT.
 *
 * `page` is what every module and record page gets and is unchanged: the layer starts at
 * the top of the column, because on those pages there is nothing above it to start after.
 *
 * `home` is shaped around the illustration. It holds at nothing for the height of the
 * hero — the artwork IS the environment there, and a second drawing register underneath it
 * is what put grey canopies immediately below the seam — then comes up through the
 * atmospheric fade at the artwork's foot, so the vector scenery is what the photograph
 * dissolves INTO rather than something that starts after it. From there it thins the whole
 * way down: strongest where the illustration has just left, quiet behind the KPI grid,
 * barely present under the lower dashboard. See `.env-home` in `index.css` for the ramp
 * and for where the hero's foot actually lands at each column width.
 *
 * Both profiles' opacity and mask live in CSS rather than here, because the home ramp is
 * measured in pixels from the top of the content column and those pixels differ per tier —
 * which is a container query, and a container query cannot be written in a style attribute.
 */
export function Landscape({ bands = 14, variant = 'page' }: { bands?: number; variant?: 'page' | 'home' }) {
  return (
    <div
      aria-hidden
      className={`${variant === 'home' ? 'env-home' : 'env-page'} pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none`}
    >
      <div className="flex w-full flex-col">
        {Array.from({ length: bands }, (_, i) => {
          const Scene = SCENES[i % SCENES.length]
          const flip = i % 2 === 1
          return (
            <svg key={i} viewBox={`0 0 ${W} ${H}`} className="w-full shrink-0" focusable="false">
              <g transform={flip ? `translate(${W} 0) scale(-1 1)` : undefined}>
                <Scene />
              </g>
              <Drift seed={i} />
            </svg>
          )
        })}
      </div>
    </div>
  )
}

/*
 * THERE WAS A `LandscapeSeam` HERE. It was a denser copy of this same art in a band
 * immediately under the hero photo, added when the illustration appeared to "stop" into
 * flat gradient. It was answering the wrong question. `Landscape` above already runs
 * behind the whole page on both tiers, so the environment never stopped — what stopped
 * was the photo, and no amount of vector foliage under it makes a photographic edge
 * read as continuous. All the strip actually did was push the first section down by a
 * width-proportional, uncapped amount (93px on a phone, 132px on a desktop column) and
 * put a second, heavier drawing register between the artwork and the cards.
 *
 * The handover is now the photo's own bottom eighth, masked to transparent, so the
 * artwork dissolves into the ground it is standing on. Soften the edge; do not draw a
 * bridge over it.
 */
