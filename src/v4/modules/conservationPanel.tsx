/**
 * One Red List category, as its species.
 *
 * The answer to the only question a count of 388 raises. The badge is the published
 * one, at hero size for once — this is the sheet the badge opened, so here it IS the
 * subject rather than an identifier in a list.
 *
 * The card closes with a stated invariant: the species listed sum to the figure the
 * Conservation card showed, or the sheet says so on its face. That check is cheap and
 * it is the difference between a drill-down and a second, quieter set of numbers.
 */

import { Layers, MapPin, ShieldAlert } from 'lucide-react'
import {
  Bars,
  FAINT,
  Figure,
  fmt,
  HERO_INK,
  RED_LIST,
  Section,
  Snapshot,
  Stack,
  Table,
  TONE,
  type RedListCode,
} from '../../exec/system'
import { RED_LIST_COUNTS, RED_LIST_SPECIES, listedTotal, speciesCount } from './conservation'

export function ConservationPanel({ code }: { code: RedListCode }) {
  const cat = RED_LIST.find((c) => c.code === code)
  const rows = RED_LIST_SPECIES[code] ?? []
  const stated = RED_LIST_COUNTS[code as keyof typeof RED_LIST_COUNTS] ?? 0
  const listed = listedTotal(code)
  const species = speciesCount(code)
  if (!cat) return null

  /* Sorted biggest first, but a residual row always closes the list wherever its count
     would otherwise place it — "305 further species" reads as a footnote, not as an
     entry that happens to be large. */
  const named = rows.filter((r) => !r.residualOf || r.residualOf === 1)
  const residual = rows.filter((r) => r.residualOf && r.residualOf > 1)
  const ordered = [...named.sort((a, b) => b.count - a.count), ...residual]

  const byClass = new Map<string, number>()
  for (const r of rows) byClass.set(r.cls, (byClass.get(r.cls) ?? 0) + r.count)
  const bySite = new Map<string, number>()
  for (const r of rows) bySite.set(r.site, (bySite.get(r.site) ?? 0) + r.count)

  return (
    <>
      <div className="w-full px-[var(--gutter-lg)] pb-3">
        <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
          <div className="flex items-center gap-3">
            {/* 40px here, against 22 in the list. The badge is the subject of this
                sheet, and the published fill is exact — only the code on top of it is
                chosen for legibility, because the official artwork sets white on
                yellow at about 1.9:1. */}
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full rounded-tr-[6px] font-display text-small font-bold"
              style={{
                backgroundColor: cat.fill,
                color: cat.ink,
                boxShadow: 'outline' in cat && cat.outline ? `inset 0 0 0 1.5px ${cat.outline}` : undefined,
              }}
              aria-hidden
            >
              {cat.code}
            </span>
            <div className="min-w-0">
              <Figure value={fmt(stated)} size={40} color={HERO_INK} />
              <p className="mt-0.5 text-small text-[#3d3a34]">animals</p>
            </div>
          </div>
          <p className="mt-3 text-body text-[#1c1a16]">{cat.name}</p>
          <p className="mt-1 text-caption" style={{ color: FAINT }}>
            {species} species · {((stated / 215432) * 100).toFixed(stated / 215432 >= 0.01 ? 1 : 2)}% of the collection
          </p>
        </section>
      </div>

      <Stack>
        {rows.length === 0 ? (
          <Section icon={ShieldAlert} label={cat.name}>
            {/* An empty category is a statement about the collection, not a dead end —
                that the zoo holds no Extinct animals is worth being able to read. */}
            <p className="text-small text-[#6d6860]">
              The collection holds no animals in this category.
            </p>
          </Section>
        ) : (
          <>
            <Section icon={ShieldAlert} label="Species" aside={`${species} · by count`}>
              <Table
                head={['Species', 'Class', 'Animals']}
                rows={ordered.map((r) => ({
                  label: r.name,
                  sub: r.site,
                  cells: [r.cls, fmt(r.count)],
                }))}
              />
              {/* The invariant, checked rather than asserted. If the listed species stop
                  summing to the figure the Conservation card showed, the sheet says so
                  instead of presenting a quieter second total. */}
              {listed !== stated ? (
                <p className="mt-3 text-caption" style={{ color: TONE.bad }}>
                  Listed species sum to {fmt(listed)}, not {fmt(stated)} — this breakdown does not
                  reconcile.
                </p>
              ) : (
                <p className="mt-3 text-caption" style={{ color: FAINT }}>
                  Sums to {fmt(stated)} — the figure on the Conservation card.
                </p>
              )}
            </Section>
            <Section icon={Layers} label="By class" aside={`${byClass.size}`}>
              <Bars
                items={[...byClass.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, value]) => ({ label, value }))}
                unit="animals"
                showShare
              />
            </Section>
            <Section icon={MapPin} label="Where they are" aside={`${bySite.size} locations`}>
              <Bars
                items={[...bySite.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, value]) => ({ label, value }))}
                unit="animals"
                showShare
              />
            </Section>
            <Section icon={ShieldAlert} label="At a glance">
              <Snapshot
                cols={3}
                items={[
                  { label: 'Animals', value: fmt(stated) },
                  { label: 'Species', value: String(species) },
                  { label: 'Largest holding', value: fmt(ordered[0]?.count ?? 0), note: ordered[0]?.name },
                ]}
              />
            </Section>
          </>
        )}
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-caption text-[#9b958b]">
        IUCN Red List · {cat.name}
      </p>
    </>
  )
}
