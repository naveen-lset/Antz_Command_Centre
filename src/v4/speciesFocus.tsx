/**
 * WHAT IS BEHIND ONE MARK — the species dashboard's drill-down sheets.
 *
 * The Overview tab's charts answered "how many" and stopped there. A hover said 306 deaths in
 * 2025 and the only way to see WHICH 306 was to leave the tab, change the window and search a
 * table. Every mark on that tab is now a door: tap a column, a slice or a legend row and the
 * records behind exactly that figure open in the product's own sheet — a centred popup on
 * desktop, a bottom sheet on the phone, both from `sheet.tsx` and neither invented here.
 *
 * FOUR KINDS OF THING SIT BEHIND THE FOUR KINDS OF MARK, and they are genuinely different
 * lists rather than one list filtered four ways:
 *
 *   A YEAR COLUMN  → the birth or death RECORDS dated to that year. Event rows.
 *   A CAUSE SLICE  → the death records carrying that manner. Event rows, all time.
 *   A SEX SLICE    → the ANIMALS the register records with that sex. Register rows.
 *   A READINESS SLICE → the ENCLOSURES whose composition falls in that bucket, and one level
 *                       below, the animals each of them holds.
 *
 * Two of those are the event ledger and two are the animal register, and the sheets say which
 * they are rather than presenting both as "animals". That distinction is the whole reason the
 * numbers on the tab differ: a species can record 430 deaths all time and hold 4,010 animals
 * today, and a reader who drills both should not be handed the same-looking list twice.
 *
 * NOTHING NEW IS DRAWN. Every surface below is `Section` and `Figure` from `exec/system.tsx`
 * and `TapRow`/`TapList` from `panels.tsx`, on the sheet's own sage ground. The deepest level
 * is `AnimalPanel`, which the drill already owned — so an animal reached from a chart is the
 * same record as an animal reached from a KPI, not a second rendering of one.
 *
 * ONE FIGURE AND ONE LIST. NOTHING ELSE.
 *
 * Each sheet used to open with a composition card between the headline and the records — three
 * cells breaking down the sex and the sites of whatever had been tapped. It was accurate and it
 * was in the way: a reader who taps a column has already asked "which ones", and answering with
 * a second summary of the number they just tapped delays the only thing they came for. It also
 * laid out badly, because `Stack` pairs cards into two columns — a short strip of three figures
 * beside a forty-row list left half the sheet empty down its whole height.
 *
 * So the summaries are gone from all four sheets and the list spans the full width. The one
 * qualification that survived is how many death records carry an age, and it survived by moving
 * ONTO the list's own header, where it belongs: it describes the rows, it is not a subject of
 * its own. Everything else those cards said is still one tap away on the tab that drew it.
 *
 * WHAT THE SOURCE CANNOT PUT ON A ROW, and is therefore absent rather than dashed in:
 *   WEIGHT — `housing.weight` is null on 77% of rows and mixes units where present, so
 *     `core/animals.ts` does not carry it into the register at all. The reference build prints
 *     a two-decimal kilogram figure for every animal; this cannot, and does not pretend to.
 *   ENCLOSURE ON AN EVENT — neither flow records where the animal was at the time, so a death
 *     row carries its site and not its enclosure.
 *   A NAME — `callName` exists for the 5,161 register rows identified by name; every other
 *     animal is identified by its id, and the row says `Animal <id>` rather than inventing one.
 */

import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { MapPin, PawPrint, Skull } from 'lucide-react'

import { dateAt, longDate, resolveWindow, shortDate } from '../core/calendar'
import {
  animalsOfSpecies,
  compositionOf,
  holdingsByEnclosure,
  type Animal,
  type Composition,
  type EnclosureHolding,
} from '../core/animals'
import { siteOf } from '../core/world'
import { FAINT, Figure, HERO_INK, Section, Stack, fmt } from '../exec/system'
import { animalFromId } from './drill'
import { FindField } from './filters'
import { AnimalPanel, TapList, TapRow } from './panels'
import { MoreRows, usePaged } from './perf'
import { useSheet } from './sheet'
import { ageLabel, lifeEvents, type LifeEv } from './speciesLife'

/* ── the hero every focus sheet opens with ───────────────────────────────── */

/**
 * The figure that was tapped, restated at the top of what it opened.
 *
 * IT IS THE CLICKED NUMBER AND NOT A RECOUNT OF THE LIST BELOW. A reader who taps a column
 * reading 306 and lands on a sheet headed 298 has been told the chart is wrong; where the two
 * genuinely differ — and for the register lists they can, because a windowed headcount is
 * apportioned while the register is counted — the difference is stated on the list itself, by
 * the section that holds it, rather than by quietly changing the headline.
 */
function FocusHero({ value, unit, note }: { value: string; unit: string; note?: string }) {
  return (
    <div className="w-full px-[var(--gutter)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} size={48} color={HERO_INK} />
        <p className="mt-1 text-body" style={{ color: '#3d3a34' }}>
          {unit}
        </p>
        {note && (
          <p className="mt-3 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
      </section>
    </div>
  )
}

/**
 * A searchable, paged list inside a sheet section.
 *
 * ONE COMPONENT FOR ALL FOUR SHEETS, because the anatomy is the same in all four: a find field
 * that only appears where there is enough to search, twenty rows, and the real total beside the
 * control that extends them. `MoreRows` states "20 of 306" whatever the list is of, which is the
 * line that stops a page of rows reading as a population.
 */
function RecordList<T>({
  icon,
  label,
  aside,
  rows,
  match,
  render,
  noun,
  placeholder,
  empty,
}: {
  icon: ComponentType<{ size?: number | string; strokeWidth?: number; className?: string; style?: object }>
  label: string
  aside?: string
  rows: T[]
  /** Free text over whatever identifies a row — its id, its name, its enclosure. */
  match: (row: T, q: string) => boolean
  render: (row: T) => ReactNode
  noun: string
  placeholder: string
  empty: string
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const found = useMemo(() => (q ? rows.filter((r) => match(r, q)) : rows), [rows, q, match])
  const page = usePaged(
    (offset, limit) => ({ rows: found.slice(offset, offset + limit), total: found.length }),
    20,
    [found],
  )

  return (
    /* `wide`, ALWAYS. A focus sheet is one list and nothing else — see the note at the top of
       this file — and `Stack` puts its children into two columns past 760px of sheet. A single
       card in a two-column grid takes the left half and leaves the right half empty, which is
       the ragged layout the summary cards used to fill. `col-span-full` gives the list the whole
       width, which is what a list of records wants anyway: the sub-line carries a date, a sex
       and a site, and halving the column wraps it onto three lines. */
    <Section icon={icon} label={label} aside={aside} wide>
      {/* SEARCH ONLY WHERE THERE IS SOMETHING TO SEARCH. A find field over eight rows is a
          control that costs a line and saves nothing; the reader can see all eight. */}
      {rows.length > 12 && (
        <div className="mb-3">
          <FindField value={query} onChange={setQuery} placeholder={placeholder} />
        </div>
      )}
      <TapList>{page.rows.map(render)}</TapList>
      {found.length === 0 && (
        <p className="text-small" style={{ color: '#5c574f' }}>
          {q ? `Nothing matches “${query}”.` : empty}
        </p>
      )}
      <MoreRows page={page} noun={q ? `matching ${noun}` : noun} />
    </Section>
  )
}

/* ── the sex word, as the register spells it ─────────────────────────────── */

const SEX_LETTER: Record<string, string> = { male: 'M', female: 'F' }
const sexLetter = (v?: string) => SEX_LETTER[(v ?? '').toLowerCase()] ?? 'U'

/* ── level 2 · the records behind a column or a slice ────────────────────── */

/**
 * Birth or death records, cut to whatever the reader tapped.
 *
 * THE SUB-LINE CARRIES WHAT THE RECORD ACTUALLY HAS. A birth row has a date, a sex and a site;
 * a death row adds an age where the record carries a birth date to derive one, and its manner
 * is the row's own value rather than a lookup. Where a field is absent it is left out of the
 * line instead of printing an em-dash for it — a row reading "· — · — ·" is four separators
 * telling the reader nothing four times.
 */
function EventFocusPanel({
  rows,
  kind,
  headline,
  unit,
  note,
}: {
  rows: LifeEv[]
  kind: 'births' | 'mortality'
  headline: string
  unit: string
  note?: string
}) {
  const { open } = useSheet()
  const deaths = kind === 'mortality'

  /**
   * HOW MANY OF THESE RECORDS CARRY AN AGE — the one qualification that survived the cut.
   *
   * Age at death is filled on 21% of the mortality flow, so a list whose rows mostly show no
   * age has to say why, or the gaps read as a rendering fault. It sits on the list's OWN header
   * rather than in a card above it: it is a statement about this list, not a second subject.
   */
  const aged = useMemo(
    () => (deaths ? rows.reduce((n, r) => n + (r.age === undefined ? 0 : 1), 0) : 0),
    [rows, deaths],
  )

  const openAnimal = (r: LifeEv) => {
    if (!r.animalId) return undefined
    return () => {
      const record = animalFromId(r.animalId)
      open({
        title: record.name,
        eyebrow: `Animal ${r.animalId} · ${siteOf(r.siteKey)?.name ?? r.siteKey}`,
        body: <AnimalPanel record={record} />,
      })
    }
  }

  return (
    <>
      <FocusHero value={headline} unit={unit} note={note} />
      <Stack>
        <RecordList
          icon={deaths ? Skull : PawPrint}
          label={deaths ? 'Death records' : 'Birth records'}
          aside={deaths ? `${fmt(aged)} carry an age` : 'newest first'}
          rows={rows}
          match={(r, q) => r.animalId.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q)}
          noun="records"
          placeholder="Search by animal id or cause"
          empty="No records here."
          render={(r) => (
            <TapRow
              key={r.key}
              label={r.animalId ? `Animal ${r.animalId}` : 'No animal id on this record'}
              sub={[
                longDate(r.day),
                sexLetter(r.sex) === 'U' ? undefined : sexLetter(r.sex) === 'M' ? 'Male' : 'Female',
                r.age === undefined ? undefined : ageLabel(r.age),
                siteOf(r.siteKey)?.name ?? r.siteKey,
              ]
                .filter(Boolean)
                .join(' · ')}
              value={deaths ? r.detail : shortDate(r.day)}
              onOpen={openAnimal(r)}
            />
          )}
        />
      </Stack>
    </>
  )
}

/* ── level 2 · the animals behind a sex slice ────────────────────────────── */

/**
 * The register rows recorded with one sex.
 *
 * THE HEADLINE AND THE LIST CAN DIFFER, AND THE NOTE IS WHERE THAT IS SETTLED. The ring on the
 * tab apportions the register's ratio to the window's reconstructed headcount — `sexSplit` says
 * so — while this list is the register itself, counted. On the current window the two agree; on
 * a past one they need not, and the note prints only when they actually do not, so a reader is
 * never handed a caveat that does not apply to what is on screen.
 */
function SexFocusPanel({
  animals,
  label,
  charted,
}: {
  animals: Animal[]
  label: string
  charted: number
}) {
  const { open } = useSheet()
  const drift = charted !== animals.length

  return (
    <>
      <FocusHero
        value={fmt(charted)}
        unit={`${label.toLowerCase()} · as held today`}
        note={
          drift
            ? `The register records ${fmt(animals.length)} ${label.toLowerCase()} rows; the figure above is that ratio apportioned to the window's headcount.`
            : undefined
        }
      />
      <Stack>
        <RecordList
          icon={PawPrint}
          label="Animals"
          aside="from the register"
          rows={animals}
          match={(a, q) =>
            a.id.toLowerCase().includes(q) ||
            (a.callName ?? '').toLowerCase().includes(q) ||
            a.enclosureId.toLowerCase().includes(q)
          }
          noun="animals"
          placeholder="Search by id, name or enclosure"
          empty="The register holds none."
          render={(a) => (
            <TapRow
              key={a.id}
              label={a.callName ?? `Animal ${a.id}`}
              sub={[a.age === '—' ? undefined : a.age, a.enclosureId, a.siteName].filter(Boolean).join(' · ')}
              value={a.status}
              tone={a.status === 'Healthy' ? 'good' : 'warn'}
              onOpen={() => {
                const record = animalFromId(a.id)
                open({
                  title: record.name,
                  eyebrow: `Animal ${a.id} · ${a.siteName}`,
                  body: <AnimalPanel record={record} />,
                })
              }}
            />
          )}
        />
      </Stack>
    </>
  )
}

/* ── level 2 · the enclosures behind a readiness slice ───────────────────── */

/**
 * The enclosures in one composition bucket, and one level below, what each holds.
 *
 * THIS IS THE ONE MARK WHOSE UNIT IS NOT AN ANIMAL. Breeding Readiness counts ENCLOSURES — four
 * of them, not four animals — so the sheet lists enclosures, and the animals are a level down
 * inside whichever one the reader picks. Presenting the animals directly would answer a question
 * the ring was not asked.
 */
function ReadinessFocusPanel({
  holdings,
  label,
  animalsIn,
}: {
  holdings: EnclosureHolding[]
  label: string
  animalsIn: (enclosureId: string) => Animal[]
}) {
  const { open } = useSheet()

  return (
    <>
      <FocusHero
        value={fmt(holdings.length)}
        unit={`${holdings.length === 1 ? 'enclosure' : 'enclosures'} · ${label.toLowerCase()}`}
        /* The register is a snapshot of who is housed where on the extract's last day and holds
           no enclosure-move history, so this bucket is current and cannot be windowed. The tab
           says so on the card; the sheet repeats it because the sheet can be read alone. */
        note="Counted from the register as at the extract's last day."
      />
      <Stack>
        <RecordList
          icon={MapPin}
          label="Enclosures"
          aside="largest first"
          rows={holdings}
          match={(h, q) =>
            h.enclosureName.toLowerCase().includes(q) || h.enclosureId.toLowerCase().includes(q)
          }
          noun="enclosures"
          placeholder="Search enclosures"
          empty="No enclosure falls in this bucket."
          render={(h) => (
            <TapRow
              key={h.enclosureId}
              lead={MapPin}
              label={h.enclosureName}
              sub={[
                siteOf(h.siteKey)?.name ?? h.siteKey,
                `${h.male} M · ${h.female} F${h.undetermined ? ` · ${h.undetermined} U` : ''}`,
              ].join(' · ')}
              value={fmt(h.total)}
              onOpen={() =>
                open({
                  title: h.enclosureName,
                  eyebrow: `${siteOf(h.siteKey)?.name ?? h.siteKey} · ${fmt(h.total)} animals`,
                  body: <EnclosurePanel holding={h} animals={animalsIn(h.enclosureId)} />,
                })
              }
            />
          )}
        />
      </Stack>
    </>
  )
}

/* ── level 3 · one enclosure's animals ───────────────────────────────────── */

/**
 * What one enclosure holds — the screen the reference build renders as a bare scrolling list of
 * label-colon-value lines, rebuilt as a card stack.
 *
 * The composition goes in a `Snapshot` at the top because "how many of each sex" is the question
 * an enclosure is opened with, and repeating it as a prefix on every one of ten rows — which is
 * what a per-row `Sex: F` does — spends ten lines on a fact that fits in one card.
 */
function EnclosurePanel({ holding, animals }: { holding: EnclosureHolding; animals: Animal[] }) {
  const { open } = useSheet()

  return (
    <>
      <FocusHero
        value={fmt(holding.total)}
        unit={`${holding.total === 1 ? 'animal' : 'animals'} · ${holding.enclosureName}`}
      />
      <Stack>
        <RecordList
          icon={PawPrint}
          label="Animals"
          aside={`${fmt(animals.length)} of this species`}
          rows={animals}
          match={(a, q) => a.id.toLowerCase().includes(q) || (a.callName ?? '').toLowerCase().includes(q)}
          noun="animals"
          placeholder="Search animals"
          empty="None of this species is housed here."
          render={(a) => (
            <TapRow
              key={a.id}
              label={a.callName ?? `Animal ${a.id}`}
              sub={[
                a.sex === 'M' ? 'Male' : a.sex === 'F' ? 'Female' : 'Undetermined',
                a.age === '—' ? undefined : a.age,
                a.accession === '—' ? undefined : `Accessioned ${a.accession}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              value={a.status}
              tone={a.status === 'Healthy' ? 'good' : 'warn'}
              onOpen={() => {
                const record = animalFromId(a.id)
                open({
                  title: record.name,
                  eyebrow: `Animal ${a.id} · ${holding.enclosureName}`,
                  body: <AnimalPanel record={record} />,
                })
              }}
            />
          )}
        />
      </Stack>
    </>
  )
}

/* ── what the Overview tab calls ─────────────────────────────────────────── */

export interface SpeciesFocus {
  /** A year column on the Births or Deaths chart. */
  year: (kind: 'births' | 'mortality', year: number, value: number) => void
  /** A slice or legend row on Causes of Death. `folded` names what "Other" stands for. */
  cause: (label: string, value: number, folded?: string[]) => void
  /** A slice or legend row on Sex Composition. */
  sex: (label: string, value: number) => void
  /** A slice or legend row on Breeding Readiness. */
  readiness: (label: string, of: Composition[]) => void
}

/**
 * The four openers, bound to one species.
 *
 * EVERY LIST IS BUILT WHEN THE SHEET OPENS AND NOT BEFORE. These handlers close over the
 * species and the scope, and the walks inside them — one pass of a flow, one pass of a register
 * span — run on the tap. Building all four eagerly on the tab would be four scans per render of
 * a dashboard where most readers tap nothing.
 *
 * `speciesIds` IS THE LIST, NOT ONE ID. A species page is cross-site: the same name at four
 * sites is four registry rows, and the register lists have to walk all of them or a sex slice
 * reading 2,007 would open on one site's share of it. The event lists filter by NAME for the
 * same reason — see `speciesLife.ts`.
 */
export function useSpeciesFocus({
  name,
  speciesIds,
  siteKey,
}: {
  name: string
  /** Every registry id carrying this name, inside the current scope. */
  speciesIds: string[]
  siteKey: string | null
}): SpeciesFocus {
  const { open } = useSheet()
  /* Keyed on the JOINED ids rather than the array, so a caller passing a fresh literal each
     render — which every caller does, because the id list is derived from the scope — does not
     rebuild four closures per render for a value that has not changed. */
  const key = speciesIds.join(',')

  return useMemo(() => {
    const ids = key ? key.split(',') : []
    /* THE SAME ALL-TIME WINDOW THE CHARTS THEMSELVES READ. The year columns and the cause ring
       deliberately ignore the date pill — a year axis under a one-month window is one column —
       so a sheet opened from them has to read all time too, or tapping a bar labelled 306 would
       open a list of the four that fell inside this month. */
    const allTime = resolveWindow('all')
    /* The register is a snapshot with no history, so `win` only reaches the apportioned total;
       the rows themselves are the same rows at every window. */
    const held = () =>
      ids.flatMap((id) => animalsOfSpecies(id, allTime, 0, Number.MAX_SAFE_INTEGER).rows)

    return {
      year: (kind, year, value) => {
        const rows = lifeEvents(kind, name, siteKey, allTime).filter(
          (r) => dateAt(r.day).getFullYear() === year,
        )
        open({
          title: `${kind === 'births' ? 'Births' : 'Deaths'} · ${year}`,
          eyebrow: name,
          body: (
            <EventFocusPanel
              rows={rows}
              kind={kind}
              headline={fmt(value)}
              unit={`${kind === 'births' ? 'births' : 'deaths'} recorded in ${year}`}
            />
          ),
        })
      },

      cause: (label, value, folded) => {
        const all = lifeEvents('mortality', name, siteKey, allTime)
        /* "OTHER" IS NOT A CAUSE THE SOURCE RECORDS. It is `foldTail`'s bucket for the manners
           past the sixth, so the filter is "not one of the ones the chart drew separately"
           rather than a match on the word — which would find nothing. */
        const rows = folded
          ? all.filter((r) => !folded.includes(r.detail))
          : all.filter((r) => r.detail === label)
        open({
          title: label,
          eyebrow: `${name} · cause of death`,
          body: (
            <EventFocusPanel
              rows={rows}
              kind="mortality"
              headline={fmt(value)}
              /* THE CAUSE IS NOT LOWERCASED. It is the source's verbatim value — "Old Age",
                 "Under Treatment" — and every other surface in the product prints it as the
                 database spells it. Case-folding a recorded value to make a sentence read
                 nicely is editing the data to suit the caption. */
              unit={`deaths · ${label}`}
              note="All time. A cause vocabulary cut to one month is usually empty."
            />
          ),
        })
      },

      sex: (label, value) => {
        const want = label.toLowerCase()
        const animals = held().filter((a) =>
          want === 'male' ? a.sex === 'M' : want === 'female' ? a.sex === 'F' : a.sex === 'U',
        )
        open({
          title: label,
          eyebrow: `${name} · sex composition`,
          body: <SexFocusPanel animals={animals} label={label} charted={value} />,
        })
      },

      readiness: (label, of) => {
        const holdings = ids
          .flatMap((id) => holdingsByEnclosure(id))
          .filter((h) => h.total > 0 && (!siteKey || h.siteKey === siteKey))
          .filter((h) => of.includes(compositionOf(h)))
        open({
          title: label,
          eyebrow: `${name} · breeding readiness`,
          body: (
            <ReadinessFocusPanel
              holdings={holdings}
              label={label}
              animalsIn={(enclosureId) => held().filter((a) => a.enclosureId === enclosureId)}
            />
          ),
        })
      },
    }
  }, [name, key, siteKey, open])
}
