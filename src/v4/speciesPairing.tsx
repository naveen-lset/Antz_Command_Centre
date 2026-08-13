/**
 * WHAT THE ENCLOSURES PERMIT — the pairing question, answered only as far as the dump allows.
 *
 * THE REFERENCE DESIGN CALLS THIS "ENCLOSURE READINESS" AND SORTS INTO "READY TO BREED",
 * "NEEDS SEXING" AND "SINGLE SEX". Two of those three are supportable and one is not.
 *
 * "Needs sexing" is real: an enclosure holding undetermined animals is a lab request waiting
 * to be raised, and the register knows exactly which ones. "Single sex" is real: an enclosure
 * of four males will not produce anything, and that is the same fact from the other side.
 *
 * "READY TO BREED" IS NOT, and this file will not print it. Readiness is a claim about
 * maturity, and maturity needs an age: `born` is absent on 89,579 of 110,005 animals — 81% —
 * and `maturity_age_years` exists for 775 of 2,339 species. What the register can establish is
 * that both sexes are present in the enclosure, which is a precondition for breeding and not a
 * finding about it. So the band is called BOTH SEXES PRESENT and the rows under it say what
 * they counted. A curator reading that knows what it does and does not mean; one reading
 * "Breeding Ready · 103 encl." has been handed a number nothing established.
 *
 * There is no pair count for the same reason there is none on the Housing tab: no pairing,
 * mate or breeding-unit record exists anywhere in the dump, and the two obvious derivations
 * disagree by four times on real data.
 */

import { useMemo } from 'react'
import { HeartHandshake, Layers } from 'lucide-react'
import { compositionOf, holdingsByEnclosure, type Composition, type EnclosureHolding } from '../core/animals'
import { siteOf, speciesByName } from '../core/world'
import { FAINT, Section, TRACK, fmt, useAccent } from '../exec/system'
import { TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useSheet } from './sheet'
import { useDrill } from './drillNav'

/**
 * The three bands, and which compositions fall in each.
 *
 * Declared once, as data, so a composition cannot appear in two bands or in none — the defect
 * a chain of if-statements across three render blocks invites. Every value of `Composition` is
 * present exactly once below; a new one added to the type and not to this table shows up as a
 * band that does not sum, which is visible, rather than as a row that silently disappears.
 */
const BANDS: { key: string; label: string; note: string; of: Composition[] }[] = [
  {
    key: 'both',
    label: 'Both sexes present',
    note: 'a precondition for breeding, not a finding about it',
    of: ['Both sexes'],
  },
  {
    key: 'unsexed',
    label: 'Needs sexing',
    note: 'holds animals of undetermined sex',
    of: ['All unsexed', 'Lone unsexed', 'Partly unsexed'],
  },
  {
    key: 'single',
    label: 'Single sex',
    note: 'no opposite sex present',
    of: ['All male', 'All female', 'Lone male', 'Lone female'],
  },
]

/** The enclosure list behind one row, opened as the popup every other drill on this page uses. */
function EnclosureList({ rows, name }: { rows: EnclosureHolding[]; name: string }) {
  const { drillTo } = useDrill()
  const page = usePaged<EnclosureHolding>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    10,
    [rows],
  )
  return (
    <Section icon={Layers} label="Enclosures" aside={fmt(rows.length)}>
      <TapList>
        {page.rows.map((e) => (
          <TapRow
            key={e.enclosureId}
            label={e.enclosureName}
            sub={`${siteOf(e.siteKey)?.name ?? e.siteKey} · ${fmt(e.male)} M · ${fmt(e.female)} F · ${fmt(e.undetermined)} U`}
            value={fmt(e.total)}
            onOpen={() => drillTo({ kind: 'enclosure', id: e.enclosureId }, { module: 'animals', label: name })}
          />
        ))}
      </TapList>
      <MoreRows page={page} noun="enclosures" />
    </Section>
  )
}

export function SpeciesPairingTab({ name }: { speciesId: string; name: string }) {
  const accent = useAccent()
  const { open } = useSheet()

  const enclosures = useMemo(
    () =>
      speciesByName(name)
        .filter((sp) => sp.weight > 0)
        .flatMap((sp) => holdingsByEnclosure(sp.id)),
    [name],
  )

  const grouped = useMemo(() => {
    const byComp = new Map<Composition, EnclosureHolding[]>()
    for (const e of enclosures) {
      const c = compositionOf(e)
      const list = byComp.get(c)
      if (list) list.push(e)
      else byComp.set(c, [e])
    }
    return BANDS.map((b) => {
      const rows = b.of.flatMap((c) => byComp.get(c) ?? [])
      return {
        ...b,
        rows,
        total: rows.length,
        breakdown: b.of
          .map((c) => ({ composition: c, rows: byComp.get(c) ?? [] }))
          .filter((x) => x.rows.length > 0)
          .sort((x, y) => y.rows.length - x.rows.length),
      }
    }).filter((b) => b.total > 0)
  }, [enclosures])

  if (!enclosures.length) return null

  const max = Math.max(...grouped.flatMap((b) => b.breakdown.map((x) => x.rows.length)), 1)

  return (
    <>
      {grouped.map((band) => (
        <Section key={band.key} icon={HeartHandshake} label={band.label} aside={`${fmt(band.total)} encl.`}>
          <p className="mb-3 text-caption" style={{ color: FAINT }}>
            {band.note}
          </p>
          <ul className="flex flex-col">
            {band.breakdown.map((x) => (
              <li key={x.composition} className="border-b border-[#f0efec] last:border-0">
                <button
                  type="button"
                  onClick={() =>
                    open({
                      title: x.composition,
                      eyebrow: `${name} · ${band.label}`,
                      body: <EnclosureList rows={x.rows} name={name} />,
                    })
                  }
                  className="card-press -mx-2 block w-full rounded-[10px] px-2 py-3 text-left"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-small text-[#1c1a16]">{x.composition}</span>
                    <span className="shrink-0 text-small font-medium tabular-nums text-[#2f2424]">
                      {fmt(x.rows.length)}
                      <span className="ml-1 text-caption" style={{ color: FAINT }}>
                        encl.
                      </span>
                    </span>
                  </span>
                  {/* The bar is scaled to the largest row across ALL bands, not within each
                      one, so a band of three enclosures cannot draw a full-width bar and read
                      as the estate's biggest group. */}
                  <span className="mt-2 block h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: TRACK }}>
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(x.rows.length / max) * 100}%`, backgroundColor: accent }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <Section icon={Layers} label="What this can and cannot say">
        <p className="text-small leading-relaxed text-[#3d3a34]">
          These bands are counted from the register: which sexes are present in each enclosure
          holding this species, on the extract’s last day. They are not a readiness assessment.
          Maturity needs an age, and a date of birth is absent for 81% of the animals in the
          register — so no enclosure here is described as ready to breed, and no pair count is
          given, because the source holds no pairing record at all.
        </p>
      </Section>
    </>
  )
}
