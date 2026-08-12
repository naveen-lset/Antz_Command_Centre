/**
 * One icon per scientific class.
 *
 * Six of the nine come from Lucide. The other three — cartilaginous fish,
 * amphibians and arachnids — have no Lucide equivalent, so they are drawn here in
 * the same idiom: 24×24 box, stroke only, no fill, 1.75 default weight, round caps.
 * Mixing a real icon set with visual puns (a plain `Fish` doing duty for a shark, a
 * `Bug` for a spider) reads as a mistake, and two of those puns would have collided
 * with the classes that own those icons properly.
 */

import { Bird, Bug, Fish, Rabbit, Shrimp, Turtle } from 'lucide-react'
import type { ComponentType } from 'react'

type IconProps = {
  size?: number | string
  strokeWidth?: number
  className?: string
  style?: object
}

export type ClassIcon = ComponentType<IconProps>

/** Shared frame, so a drawn glyph sits on the same grid as a Lucide one. */
function Glyph({
  size = 24,
  strokeWidth = 1.75,
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  )
}

/** Chondrichthyes — pointed snout, dorsal fin, forked tail. */
export function Shark(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4.5 13c3-3.6 8.5-5 14-2.2.7.4.7 1.6 0 2C13 15.8 7.5 16 4.5 13Z" />
      <path d="M11 9.4 12.6 5.6 14.8 9.6" />
      <path d="M4.5 13 2 10.2M4.5 13 2 16" />
      <path d="M16.4 10.8 15.4 13.4" />
    </Glyph>
  )
}

/**
 * Amphibia — wide low body, two eyes set high, a mouth line, splayed hind legs.
 *
 * A first pass drew a narrow rounded body with two dots inside it and read as a face,
 * not a frog. What identifies a frog at 16px is the SILHOUETTE: much wider than tall,
 * eyes proud of the outline, legs kicked out to the sides.
 */
export function Frog(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.6 13.8C3.6 10.2 7.4 8 12 8s8.4 2.2 8.4 5.8c0 2.3-1.9 3.6-8.4 3.6s-8.4-1.3-8.4-3.6Z" />
      <circle cx="8.8" cy="9.6" r="1.15" />
      <circle cx="15.2" cy="9.6" r="1.15" />
      <path d="M8.9 13.6c1.9 1.1 4.3 1.1 6.2 0" />
      <path d="M4.4 15.4C2.4 16.6 2.4 18.6 4.6 19.6M19.6 15.4c2 1.2 2 3.2-.2 4.2" />
    </Glyph>
  )
}

/** Euchelicerata — two body segments, eight legs. */
export function Arachnid(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="9.6" r="2.1" />
      <ellipse cx="12" cy="14.4" rx="2.7" ry="3.1" />
      <path d="M9.9 8.6 5.8 6.2M9.5 11 5 10.2M9.4 13.4 5.2 14.6M10 16.2 6.6 18.8" />
      <path d="M14.1 8.6l4.1-2.4M14.5 11l4.5-.8M14.6 13.4l4.2 1.2M14 16.2l3.4 2.6" />
    </Glyph>
  )
}

/**
 * The nine classes, in the order the page counts them. Scientific name is the key
 * because that is what the page prints — the common name is the sub-label.
 */
export const CLASS_ICONS: Record<string, ClassIcon> = {
  /* THE KEYS ARE THE NAMES THE EXTRACT USES, which is not the same list this map was written
     against. `dims.json` reports Aves, Mammalia, Reptilia, Teleostei, Arachnida, Amphibia,
     Malacostraca, Chilopoda, Chondrichthyes, Holostei, Cladistei, Dipnoi and Unknown — so
     `Actinopterygii`, `Insecta` and `Euchelicerata` matched nothing and seven of the thirteen
     classes fell through to the default glyph. The four fish classes share the fish, because
     Teleostei, Holostei, Cladistei and Dipnoi are all ray-finned or lobe-finned fish and a
     reader scanning a class list needs to know "this is a fish" rather than which infraclass. */
  Aves: Bird,
  Mammalia: Rabbit,
  Reptilia: Turtle,
  Amphibia: Frog,
  Teleostei: Fish,
  Holostei: Fish,
  Cladistei: Fish,
  Dipnoi: Fish,
  Chondrichthyes: Shark,
  Malacostraca: Shrimp,
  Arachnida: Arachnid,
  Chilopoda: Bug,
}
