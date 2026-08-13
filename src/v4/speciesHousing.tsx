/**
 * WHERE THIS SPECIES ACTUALLY LIVES — every site, every enclosure, counted from the register.
 *
 * THIS TAB DOES NOT MOVE WITH THE DATE FILTER, and it says so on screen rather than quietly
 * ignoring it. `animals.bin` is a snapshot of who is housed where on the extract's last day
 * and carries no enclosure-move history, so there is no honest way to answer "which enclosure
 * was this animal in last March". Every other tab on this page is windowed; this one is a
 * position. A tab that silently ignored the pill the header is displaying would be the exact
 * contradiction this product spends its effort avoiding — so it states the reading date.
 *
 * COUNTED, NOT MODELLED. The sex split here is `core/animals.ts`'s span walk over the
 * register, not `population.ts`'s `speciesRows`, whose male/female/unknown come from an
 * authored unsexed-rate table. The two disagree on real data: Umber Langur at Pinecrest is
 * 2,000 / 1,991 / 0 in the register where the rate table would invent a 4% unsexed share.
 *
 * WHAT THE REFERENCE DESIGN SHOWS THAT IS NOT HERE, and why:
 *   PAIRS — no pairing, mate or breeding-unit record exists anywhere in the dump, and the two
 *     plausible derivations disagree by four times on real data (Sable Kestrel at Lakeside:
 *     61 by sum-of-min(M,F), 14 by enclosures-holding-both-sexes). The column that replaces it
 *     counts enclosures holding both sexes, which is a thing that can be counted.
 *   Capacity and occupancy % — the schema stores an enclosure as a name and nothing else.
 *   Section (Site › Section › Enclosure) — read by the ETL only to count distinct sections per
 *     site, never emitted per animal, so an animal cannot be placed in one.
 */

import { useMemo, useState } from 'react'
import { Boxes, MapPin } from 'lucide-react'
import { compositionOf, holdingsByEnclosure, type EnclosureHolding } from '../core/animals'
import { siteOf, speciesByName } from '../core/world'
import { FAINT, Facts, Section, TRACK, fmt } from '../exec/system'
import { TapList, TapRow } from './panels'
import { FindField } from './filters'
import { MoreRows, usePaged } from './perf'
import { useDrill } from './drillNav'

interface SiteHolding {
  siteKey: string
  siteName: string
  siteCode: string
  male: number
  female: number
  undetermined: number
  total: number
  enclosures: number
  bothSexes: number
}

/** One badge, always given a label `compositionOf` produced, so a row and the legend agree. */
function Badge({ label }: { label: string }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-caption font-medium"
      style={{ backgroundColor: TRACK, color: '#55524a' }}
    >
      {label}
    </span>
  )
}

export function SpeciesHousingTab({ name }: { speciesId: string; name: string }) {
  const { drillTo } = useDrill()
  const [view, setView] = useState<'site' | 'enclosure'>('site')
  const [query, setQuery] = useState('')

  /* One walk per population of this name. The largest name in the dump is Umber Langur at
     4,010 animals across two sites, so this is a few thousand integer reads — bounded, and
     cheap enough to do without paging in core. The view pages, not the count. */
  const { sites, enclosures } = useMemo(() => {
    const pops = speciesByName(name).filter((sp) => sp.weight > 0)
    const encs: EnclosureHolding[] = []
    const rows: SiteHolding[] = []

    for (const sp of pops) {
      const held = holdingsByEnclosure(sp.id)
      encs.push(...held)
      const site = siteOf(sp.siteKey)
      rows.push({
        siteKey: sp.siteKey,
        siteName: site?.name ?? sp.siteKey,
        siteCode: site?.code ?? '',
        male: held.reduce((n, h) => n + h.male, 0),
        female: held.reduce((n, h) => n + h.female, 0),
        undetermined: held.reduce((n, h) => n + h.undetermined, 0),
        total: held.reduce((n, h) => n + h.total, 0),
        enclosures: held.length,
        bothSexes: held.filter((h) => h.male > 0 && h.female > 0).length,
      })
    }
    return {
      sites: rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total),
      enclosures: encs.sort((a, b) => b.total - a.total),
    }
  }, [name])

  const q = query.trim().toLowerCase()
  const siteRows = useMemo(
    () => (q ? sites.filter((s) => `${s.siteName} ${s.siteCode}`.toLowerCase().includes(q)) : sites),
    [sites, q],
  )
  const encRows = useMemo(() => {
    const hit = q
      ? enclosures.filter((e) => `${e.enclosureName} ${siteOf(e.siteKey)?.name ?? ''}`.toLowerCase().includes(q))
      : enclosures
    return hit
  }, [enclosures, q])

  /* Paged because the spread is enormous: the median (site, species) occupies two enclosures
     and the ninetieth percentile nine, but Auburn Caramel Peryton at Riverside occupies 807.
     A fixed list either wastes the card or truncates without saying so. */
  const page = usePaged<EnclosureHolding>(
    (offset, limit) => ({ rows: encRows.slice(offset, offset + limit), total: encRows.length }),
    10,
    [encRows],
  )

  if (!sites.length) return null

  const totals = sites.reduce(
    (a, s) => ({
      m: a.m + s.male,
      f: a.f + s.female,
      u: a.u + s.undetermined,
      t: a.t + s.total,
      e: a.e + s.enclosures,
      b: a.b + s.bothSexes,
    }),
    { m: 0, f: 0, u: 0, t: 0, e: 0, b: 0 },
  )

  return (
    <>
      <Section icon={MapPin} label="Where they are held" aside="from the register">
        <Facts
          items={[
            { label: 'Animals', value: fmt(totals.t) },
            { label: 'Sites', value: String(sites.length) },
            { label: 'Enclosures', value: fmt(totals.e) },
            {
              label: 'Enclosures holding both sexes',
              value: fmt(totals.b),
              /* NOT "pairs". See the note at the top of this file — two definitions of a pair
                 disagree by four times on real data, and the dump holds no pairing record. */
              sub: 'at least one male and one female present',
            },
          ]}
        />
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          Counted where every animal is housed on the extract’s last day. This tab is a position
          rather than a period, so it does not move with the date filter.
        </p>
      </Section>

      <Section
        icon={Boxes}
        label={view === 'site' ? 'Site-wise' : 'Enclosure-wise'}
        aside={view === 'site' ? `${sites.length} site${sites.length === 1 ? '' : 's'}` : fmt(enclosures.length)}
      >
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ['site', 'Site-wise'],
              ['enclosure', 'Enclosure-wise'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-caption font-medium transition-colors ${
                view === key ? 'bg-[#123a2c] text-white' : 'bg-[#f4f3ef] text-[#55524a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search where there is something to search. Site-wise tops out at eleven rows for any
            name in the dump, so the field would be furniture; enclosure-wise routinely is not. */}
        {(view === 'enclosure' ? enclosures.length : sites.length) > 12 && (
          <div className="mb-3">
            <FindField
              value={query}
              onChange={setQuery}
              placeholder={view === 'site' ? 'Search sites' : 'Search enclosures'}
            />
          </div>
        )}

        {view === 'site' ? (
          <TapList>
            {siteRows.map((s) => (
              <TapRow
                key={s.siteKey}
                label={s.siteName}
                sub={`${s.siteCode} · ${fmt(s.male)} M · ${fmt(s.female)} F · ${fmt(s.undetermined)} U · ${fmt(s.enclosures)} enclosure${s.enclosures === 1 ? '' : 's'}`}
                value={fmt(s.total)}
                onOpen={() => drillTo({ kind: 'site', id: s.siteKey }, { module: 'animals', label: name })}
              />
            ))}
          </TapList>
        ) : (
          <>
            <TapList>
              {page.rows.map((e) => (
                <TapRow
                  key={e.enclosureId}
                  label={e.enclosureName}
                  /* The site is named on every row, because an enclosure name on its own does
                     not say where it is and 1,456 of 15,959 enclosures hold more than one
                     species — so these counts are THIS species', not the enclosure's total. */
                  sub={`${siteOf(e.siteKey)?.name ?? e.siteKey} · ${fmt(e.male)} M · ${fmt(e.female)} F · ${fmt(e.undetermined)} U`}
                  value={fmt(e.total)}
                  onOpen={() => drillTo({ kind: 'enclosure', id: e.enclosureId }, { module: 'animals', label: name })}
                />
              ))}
            </TapList>
            <MoreRows page={page} noun="enclosures" />
          </>
        )}

        {view === 'enclosure' && encRows.length === 0 && (
          <p className="text-small text-[#6d6860]">No enclosure matches “{query.trim()}”.</p>
        )}
      </Section>

      <Section icon={Boxes} label="Composition" aside="what the register can say">
        {/* GROUPED BY WHAT IS PRESENT, NOT BY WHAT IS POSSIBLE. Every label here is a statement
            about which sexes are in the enclosure — never a claim that the animals in it can
            breed, which needs an age the dump does not carry for 81% of them. */}
        <TapList>
          {Object.entries(
            enclosures.reduce<Record<string, number>>((acc, e) => {
              const k = compositionOf(e)
              acc[k] = (acc[k] ?? 0) + 1
              return acc
            }, {}),
          )
            .sort((a, b) => b[1] - a[1])
            .map(([label, n]) => (
              <TapRow
                key={label}
                label={label}
                value={fmt(n)}
                sub={`${Math.round((n / Math.max(1, enclosures.length)) * 100)}% of enclosures holding this species`}
              />
            ))}
        </TapList>
        <p className="mt-3 text-caption" style={{ color: FAINT }}>
          No pairing record exists in the source, and no enclosure capacity — so there is no
          occupancy percentage and no pair count here, only what is present.
        </p>
      </Section>

      {/* Kept last and quiet: the badge legend, so a reader meeting "Partly unsexed" in a row
          has somewhere to resolve it without leaving the tab. Built from the compositions that
          actually occur for THIS species, not from the full vocabulary — a legend listing
          eight terms where the species only ever shows two is furniture. */}
      {enclosures.length > 0 && (
        <Section icon={Boxes} label="Reading the rows">
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(enclosures.map(compositionOf))].map((c) => (
              <Badge key={c} label={c} />
            ))}
          </div>
        </Section>
      )}
    </>
  )
}
