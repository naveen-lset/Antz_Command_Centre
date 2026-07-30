/**
 * Per-module hero illustrations for the drill-down sheets.
 *
 * Same language as the home screen's `MistBackdrop` birds: one thin stroke, no
 * fills, drawn in the module's accent at low opacity so the hero's white space
 * reads as habitat rather than emptiness. The big number stays the loudest thing
 * on the screen — motifs live in the left and right margins and never cross the
 * centre column.
 *
 * Two pieces of grammar, nothing per-page bespoke:
 *   MOTIF — a shape drawn once inside a 24×24 box.
 *   SCENE — where a module's motifs sit in the 374×208 hero band, and how big.
 */

import type { ReactNode } from 'react'

/** Line motifs, each drawn inside a 24×24 box, y pointing down. */
const MOTIF = {
  /** The home screen's gull, verbatim in spirit — two wing strokes. */
  bird: <path d="M2 8C5.2 3.6 8 3.6 9.8 7.2 11.6 3.6 14.4 3.6 17.6 8" />,

  egg: (
    <path d="M12 2.5C16.4 2.5 19.5 8.6 19.5 13.6 19.5 18.2 16.2 21.5 12 21.5 7.8 21.5 4.5 18.2 4.5 13.6 4.5 8.6 7.6 2.5 12 2.5Z" />
  ),

  /** Hatching: the shell with a zigzag crack straight across it. */
  eggCrack: (
    <>
      <path d="M12 2.5C16.4 2.5 19.5 8.6 19.5 13.6 19.5 18.2 16.2 21.5 12 21.5 7.8 21.5 4.5 18.2 4.5 13.6 4.5 8.6 7.6 2.5 12 2.5Z" />
      <path d="M4.9 14.9 7.7 13.1 10.3 15 13.1 13.1 15.7 15 18.6 13.3" />
    </>
  ),

  chick: (
    <>
      <circle cx="11" cy="15.4" r="5.8" />
      <circle cx="16.4" cy="7.6" r="4" />
      <path d="M20.2 6.9 23 7.9 20.4 9.1" />
      <path d="M8.8 21 7.8 23.2M13.4 21 14.4 23.2" />
    </>
  ),

  paw: (
    <>
      <path d="M12 13.8C15.2 13.8 17.4 15.8 17.4 18 17.4 20 15.6 21 12 21 8.4 21 6.6 20 6.6 18 6.6 15.8 8.8 13.8 12 13.8Z" />
      <ellipse cx="7.4" cy="11.4" rx="1.9" ry="2.4" />
      <ellipse cx="10.6" cy="8.8" rx="1.9" ry="2.5" />
      <ellipse cx="14.2" cy="8.8" rx="1.9" ry="2.5" />
      <ellipse cx="17.2" cy="11.4" rx="1.9" ry="2.4" />
    </>
  ),

  leaf: (
    <>
      <path d="M20 4C20 12.8 13.2 19.6 4.4 19.6 4.4 10.8 11.2 4 20 4Z" />
      <path d="M6.4 17.6 17 7" />
    </>
  ),

  /** Quill: spine, barbs either side, bare shaft at the tip. */
  feather: (
    <>
      <path d="M17.6 4.8C12.6 8.4 9.2 13.4 7.6 19.4" />
      <path d="M7.6 19.4 5.6 21.8" />
      <path d="M16.4 6.6C13.8 5.8 11.6 6.8 10.6 9.2" />
      <path d="M13.8 9.6C11.2 9 9.4 10 8.6 12.4" />
      <path d="M16.9 8.2C17.8 10.6 17 12.8 14.8 14" />
      <path d="M14.4 11.8C15 14 14 15.8 11.8 16.8" />
    </>
  ),

  heart: (
    <path d="M12 20.4C6.2 15.9 3.6 12.9 3.6 9.4 3.6 6.7 5.8 4.6 8.4 4.6 10 4.6 11.3 5.5 12 6.8 12.7 5.5 14 4.6 15.6 4.6 18.2 4.6 20.4 6.7 20.4 9.4 20.4 12.9 17.8 15.9 12 20.4Z" />
  ),

  pulse: <path d="M2 13H7.2L9.6 7.4 12.8 18.2 15.2 13H22" />,

  droplet: <path d="M12 3C12 3 18.6 11 18.6 15.2A6.6 6.6 0 0 1 5.4 15.2C5.4 11 12 3 12 3Z" />,

  shield: <path d="M12 3 19.6 6.2V12.6C19.6 17.2 16 20.2 12 21.6 8 20.2 4.4 17.2 4.4 12.6V6.2Z" />,

  check: <path d="M4.5 13 9.8 18.4 19.6 6.4" />,

  capsule: (
    <>
      <path d="M4.6 12A4.6 4.6 0 0 1 9.2 7.4H14.8A4.6 4.6 0 0 1 14.8 16.6H9.2A4.6 4.6 0 0 1 4.6 12Z" />
      <path d="M12 7.4V16.6" />
    </>
  ),

  flask: (
    <>
      <path d="M9 3.4H15M10.2 3.4V9.4L5 19.2C4.3 20.5 5.2 22 6.7 22H17.3C18.8 22 19.7 20.5 19 19.2L13.8 9.4V3.4" />
      <path d="M7.6 16H16.4" />
    </>
  ),

  tube: (
    <>
      <path d="M9 3H15M10.2 3V17.6A1.8 1.8 0 0 0 13.8 17.6V3" />
      <path d="M10.2 12H13.8" />
    </>
  ),

  molecule: (
    <>
      <circle cx="6" cy="16" r="2.2" />
      <circle cx="12" cy="7" r="2.2" />
      <circle cx="18" cy="15" r="2.2" />
      <path d="M7.6 14.4 10.8 9M13.6 8.4 16.6 13.2M8.1 17 15.8 15.6" />
    </>
  ),

  crate: (
    <>
      <path d="M4.6 7.6H19.4V18.6H4.6Z" />
      <path d="M4.6 11.2H19.4M12 11.2V18.6" />
    </>
  ),

  arrow: (
    <>
      <path d="M3.6 16.4C7.6 8.4 16 8 20.4 11.8" />
      <path d="M20.4 11.8 16.4 12.5M20.4 11.8 19.4 8" />
    </>
  ),

  doc: (
    <>
      <path d="M6.6 3.4H14L18 7.6V20.6H6.6Z" />
      <path d="M13.8 3.6V7.6H17.8" />
      <path d="M9.6 12.4H15M9.6 16H14" />
    </>
  ),

  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.2V12L15.6 14.2" />
    </>
  ),

  person: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.6 20.4C5.6 16 8.6 13.8 12 13.8 15.4 13.8 18.4 16 18.4 20.4" />
    </>
  ),

  bell: (
    <>
      <path d="M6.6 17.6C6.6 12 7.2 6.6 12 6.6 16.8 6.6 17.4 12 17.4 17.6Z" />
      <path d="M10.2 20A1.9 1.9 0 0 0 13.8 20" />
      <path d="M12 4.4V6.6" />
    </>
  ),

  warning: (
    <>
      <path d="M12 4.6 21 20H3Z" />
      <path d="M12 10V14.4" />
      <circle cx="12" cy="17.2" r="0.9" />
    </>
  ),

  fish: (
    <>
      <path d="M3 13C7 8 14 8 18 13 14 18 7 18 3 13Z" />
      <path d="M18 13 21.6 9M18 13 21.6 17" />
      <circle cx="7.4" cy="12" r="0.8" />
    </>
  ),

  /** A woven bowl — rim, belly, one weave stroke. */
  nest: (
    <>
      <path d="M2.6 13.4C2.6 19.6 21.4 19.6 21.4 13.4" />
      <path d="M2.6 13.4C6.2 10.7 17.8 10.7 21.4 13.4" />
      <path d="M6 15.6C9.4 17.4 14.6 17.4 18 15.6" />
    </>
  ),
} satisfies Record<string, ReactNode>

type MotifName = keyof typeof MOTIF

/**
 * A motif pinned to one margin of the hero. Every distance is CSS pixels — each
 * motif is its own little SVG, so nothing depends on the hero's aspect ratio and
 * nothing gets cropped when a module's hero runs taller or shorter.
 */
type Placed = {
  m: MotifName
  /** Which margin the motif hangs off — the centre column stays empty. */
  side: 'left' | 'right'
  /** Inset from that edge, and from the top of the hero. */
  x: number
  y: number
  /** Rendered box, px. */
  size: number
  o?: number
  r?: number
}

/** One scene per module: a big anchor motif each side, then smaller company. */
const SCENE: Record<string, Placed[]> = {
  births: [
    { m: 'eggCrack', side: 'left', x: 6, y: 74, size: 78 },
    { m: 'chick', side: 'right', x: 14, y: 26, size: 70 },
    { m: 'paw', side: 'right', x: 22, y: 132, size: 44, o: 0.24 },
    { m: 'bird', side: 'left', x: 58, y: 18, size: 36, o: 0.26 },
  ],
  eggs: [
    { m: 'egg', side: 'left', x: 8, y: 62, size: 74 },
    { m: 'egg', side: 'left', x: 52, y: 106, size: 46, o: 0.22 },
    { m: 'nest', side: 'right', x: 6, y: 122, size: 78 },
    { m: 'bird', side: 'right', x: 30, y: 26, size: 36, o: 0.26 },
  ],
  health: [
    { m: 'heart', side: 'left', x: 6, y: 70, size: 76 },
    { m: 'pulse', side: 'right', x: 4, y: 78, size: 78 },
    { m: 'leaf', side: 'right', x: 26, y: 20, size: 42, o: 0.22 },
    { m: 'capsule', side: 'left', x: 34, y: 148, size: 44, o: 0.22 },
  ],
  mortality: [
    { m: 'leaf', side: 'left', x: 6, y: 68, size: 76, r: 18 },
    { m: 'feather', side: 'right', x: 6, y: 72, size: 76 },
    { m: 'leaf', side: 'right', x: 30, y: 20, size: 38, o: 0.2 },
    { m: 'bird', side: 'left', x: 52, y: 16, size: 34, o: 0.24 },
  ],
  vaccination: [
    { m: 'droplet', side: 'left', x: 8, y: 70, size: 72 },
    // Check sits inside the shield, so the pair doesn't read as two blobs.
    { m: 'shield', side: 'right', x: 6, y: 68, size: 76 },
    { m: 'check', side: 'right', x: 27, y: 92, size: 34, o: 0.26 },
    { m: 'bird', side: 'right', x: 30, y: 138, size: 34, o: 0.22 },
  ],
  deworming: [
    { m: 'capsule', side: 'left', x: 4, y: 76, size: 78 },
    { m: 'droplet', side: 'right', x: 10, y: 66, size: 66 },
    { m: 'leaf', side: 'right', x: 26, y: 140, size: 44, o: 0.24 },
    { m: 'bird', side: 'left', x: 58, y: 20, size: 34, o: 0.22 },
  ],
  lab: [
    { m: 'flask', side: 'left', x: 6, y: 66, size: 76 },
    { m: 'tube', side: 'right', x: 12, y: 68, size: 68 },
    { m: 'molecule', side: 'right', x: 26, y: 144, size: 48, o: 0.26 },
    { m: 'droplet', side: 'left', x: 46, y: 148, size: 38, o: 0.22 },
  ],
  animals: [
    { m: 'paw', side: 'left', x: 6, y: 86, size: 76 },
    { m: 'fish', side: 'right', x: 14, y: 128, size: 68 },
    { m: 'bird', side: 'right', x: 18, y: 34, size: 46 },
    { m: 'bird', side: 'left', x: 54, y: 16, size: 32, o: 0.24 },
  ],
  transfers: [
    { m: 'crate', side: 'left', x: 6, y: 72, size: 74 },
    { m: 'arrow', side: 'right', x: 4, y: 66, size: 78 },
    { m: 'bird', side: 'right', x: 30, y: 140, size: 40, o: 0.24 },
    { m: 'paw', side: 'left', x: 44, y: 146, size: 38, o: 0.2 },
  ],
  welfare: [
    { m: 'heart', side: 'left', x: 8, y: 70, size: 74 },
    { m: 'leaf', side: 'right', x: 8, y: 68, size: 70 },
    { m: 'paw', side: 'right', x: 26, y: 140, size: 44, o: 0.26 },
    { m: 'bird', side: 'left', x: 56, y: 18, size: 34, o: 0.24 },
  ],
  approvals: [
    { m: 'doc', side: 'left', x: 8, y: 68, size: 74 },
    { m: 'check', side: 'right', x: 6, y: 76, size: 74 },
    { m: 'clock', side: 'right', x: 28, y: 20, size: 42, o: 0.22 },
    { m: 'bird', side: 'left', x: 48, y: 150, size: 34, o: 0.2 },
  ],
  tasks: [
    { m: 'check', side: 'left', x: 6, y: 72, size: 74 },
    { m: 'doc', side: 'right', x: 10, y: 66, size: 70 },
    { m: 'clock', side: 'right', x: 26, y: 140, size: 46, o: 0.24 },
    { m: 'bird', side: 'left', x: 56, y: 18, size: 34, o: 0.22 },
  ],
  // "243 / 312" runs wide, so this scene sits below the number rather than beside it.
  attendance: [
    { m: 'person', side: 'left', x: 8, y: 104, size: 66 },
    { m: 'person', side: 'right', x: 14, y: 98, size: 56 },
    { m: 'clock', side: 'right', x: 28, y: 22, size: 38, o: 0.2 },
    { m: 'bird', side: 'left', x: 58, y: 18, size: 32, o: 0.22 },
  ],
  alerts: [
    { m: 'bell', side: 'left', x: 8, y: 70, size: 74 },
    { m: 'warning', side: 'right', x: 8, y: 72, size: 70 },
    { m: 'bird', side: 'right', x: 30, y: 22, size: 36, o: 0.22 },
    { m: 'feather', side: 'left', x: 44, y: 144, size: 40, o: 0.2 },
  ],
}

/**
 * Faint accent line-art in a sheet hero's margins. Stroke weight is corrected per
 * motif so a 78px shape draws no heavier than a 32px one.
 */
export function HeroIllustration({ slug, accent }: { slug: string; accent: string }) {
  const scene = SCENE[slug]
  if (!scene) return null

  return (
    <div className="animate-veil pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {scene.map((p, i) => (
        <svg
          key={`${p.m}-${i}`}
          viewBox="0 0 24 24"
          width={p.size}
          height={p.size}
          className="absolute"
          style={{
            [p.side]: p.x,
            top: p.y,
            opacity: p.o ?? 0.3,
            transform: p.r ? `rotate(${p.r}deg)` : undefined,
          }}
          fill="none"
          stroke={accent}
          strokeWidth={(1.4 * 24) / p.size}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MOTIF[p.m]}
        </svg>
      ))}
    </div>
  )
}
