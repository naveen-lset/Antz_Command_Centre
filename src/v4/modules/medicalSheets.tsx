/**
 * THE MEDICAL DRILL — four sheets over one set of consultations.
 *
 * Mortality → Cause → Record has a sibling here: Cases → Species → Animal → Case. Species,
 * presenting sign and severity are all FILTERS over the same `MedCase[]`, so there is one
 * corpus and no sheet can hold a figure another sheet disagrees with.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THIS FILE WAS REWRITTEN WHEN THE PRODUCT WAS CONNECTED TO THE DATABASE, and most of what it
 * used to show is gone rather than changed.
 *
 * The old sheets drew a hospital stay: which ward the animal was in, how many days it had been
 * there, when it was discharged, what the outcome was, which procedures it had, which
 * medication courses were running, and a recovery rate over all of it. `medicalData.ts` derived
 * every one of those from a seeded draw per case, because `species_mgmt_anon` records none of
 * them — no admission, no bed, no ward, no discharge, no procedure, no outcome, and no closed
 * state anywhere (`diagnosis.closed_at` is null on all 6,808 rows).
 *
 * What the source does record, and what these sheets now show: the consultation, its date, its
 * site, its species, its animal, the presenting sign, and the severity that sign was recorded
 * at. That is a smaller sheet and every field on it is a field somebody typed.
 */

import { useMemo } from 'react'
import { ClipboardList, Dna, MapPin, Stethoscope, TriangleAlert } from 'lucide-react'
import { longDate, shortDate } from '../../core/calendar'
import { animalById } from '../../core/animals'
import { FAINT, Facts, Figure, HERO_INK, Rule, Section, Snapshot, Stack, fmt } from '../../exec/system'
import { MoreRows, usePaged } from '../perf'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import {
  SEVERITY_TONE,
  byComplaintSlice,
  bySeveritySlice,
  bySpeciesSlice,
  type MedCase,
} from './medicalData'

/* ── shared parts ────────────────────────────────────────────────────────── */

/** The hero every sheet in this family opens with. */
function SheetHero({
  value,
  label,
  note,
  tone,
}: {
  value: string
  label: string
  note?: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div className="px-[var(--gutter)] pb-3">
      <div className="rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} size={40} color={tone ? undefined : HERO_INK} />
        <p className="mt-1 text-body text-[#3d3a34]">{label}</p>
        {note && (
          <p className="mt-1 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}

/** A paged list of consultations, the one row shape every sheet here uses. */
function CaseRows({ rows, eyebrow }: { rows: MedCase[]; eyebrow: string }) {
  const { open } = useSheet()
  const page = usePaged<MedCase>(
    (offset, limit) => ({ rows: rows.slice(offset, offset + limit), total: rows.length }),
    12,
    [rows.length, rows[0]?.id],
  )

  if (rows.length === 0) {
    return (
      <p className="text-caption" style={{ color: FAINT }}>
        No consultations.
      </p>
    )
  }

  return (
    <>
      <DrillList>
        {page.rows.map((c) => (
          <DrillRow
            key={c.id}
            label={`${c.speciesName} · ${c.complaint}`}
            sub={`${c.animalId} · ${c.siteName} · ${shortDate(c.day)}`}
            value={c.severity ?? '—'}
            tone={c.severity ? SEVERITY_TONE[c.severity] : undefined}
            onOpen={() => open({ title: c.id, eyebrow: `${eyebrow} › Case`, body: <CaseSheet c={c} /> })}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="consultations" />
    </>
  )
}

/**
 * The three splits every filtered list carries above its records.
 *
 * Species, presenting sign and severity. The hospital split that used to lead this block is
 * gone — a consultation is attributed to a site, which the sheet's own heading already states,
 * and never to a building.
 */
function Splits({ rows, onSpecies }: { rows: MedCase[]; onSpecies?: (name: string, id: string) => void }) {
  const species = useMemo(() => bySpeciesSlice(rows).slice(0, 12), [rows])
  const signs = useMemo(() => byComplaintSlice(rows).slice(0, 12), [rows])
  const severity = useMemo(() => bySeveritySlice(rows), [rows])

  return (
    <>
      {severity.length > 0 && (
        <Section icon={TriangleAlert} label="Severity" aside={`${fmt(rows.length)} cases`}>
          <DrillList>
            {severity.map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                sub={`${Math.round(s.percent)}%`}
                value={fmt(s.value)}
                tone={SEVERITY_TONE[s.id as keyof typeof SEVERITY_TONE]}
              />
            ))}
          </DrillList>
        </Section>
      )}
      {species.length > 0 && (
        <Section icon={Dna} label="Species" aside={`${species.length}`}>
          <DrillList>
            {species.map((sp) => (
              <DrillRow
                key={sp.id}
                label={sp.label}
                sub={sp.sub}
                value={fmt(sp.value)}
                onOpen={onSpecies ? () => onSpecies(sp.label, sp.id) : undefined}
              />
            ))}
          </DrillList>
        </Section>
      )}
      {signs.length > 0 && (
        <Section icon={Stethoscope} label="Presenting sign" aside={`${signs.length}`}>
          <DrillList>
            {signs.map((c) => (
              <DrillRow key={c.id} label={c.label} value={fmt(c.value)} />
            ))}
          </DrillList>
        </Section>
      )}
    </>
  )
}

/* ── one animal ──────────────────────────────────────────────────────────── */

/** Every consultation recorded against one animal, newest first. */
export function AnimalMedicalSheet({ animalId, cases }: { animalId: string; cases: MedCase[] }) {
  const animal = animalById(animalId)
  const rows = useMemo(() => [...cases].sort((a, b) => b.day - a.day), [cases])
  const severe = rows.filter((c) => c.severity === 'High' || c.severity === 'Extreme').length

  return (
    <>
      <SheetHero
        value={fmt(rows.length)}
        label={`Consultations · ${animal?.speciesName ?? 'Animal'}`}
        note={`${animalId}${animal ? ` · ${animal.siteName}` : ''}`}
        tone={severe ? 'bad' : undefined}
      />
      <Stack>
        <Section icon={MapPin} label="Animal" aside={animalId}>
          <Facts
            items={[
              { label: 'Animal ID', value: animalId },
              { label: 'Species', sub: animal?.cls, value: animal?.speciesName ?? '—' },
              { label: 'Site', value: animal?.siteName ?? '—' },
              { label: 'Enclosure', value: animal?.enclosureId ?? '—' },
              { label: 'Consultations', value: fmt(rows.length) },
              {
                label: 'High or extreme',
                value: fmt(severe),
                tone: severe ? 'bad' : undefined,
              },
            ]}
          />
        </Section>
        <Section icon={ClipboardList} label="Consultations" aside={`${fmt(rows.length)}`}>
          <CaseRows rows={rows} eyebrow={animalId} />
        </Section>
      </Stack>
    </>
  )
}

/* ── one consultation ────────────────────────────────────────────────────── */

/** Every field the record has, and no field it does not. */
export function CaseSheet({ c }: { c: MedCase }) {
  const { open } = useSheet()

  return (
    <>
      <SheetHero
        value={c.severity ?? 'Recorded'}
        label={`${c.speciesName} · ${c.complaint}`}
        note={`${c.siteName} · ${longDate(c.day)}`}
        tone={c.severity ? (SEVERITY_TONE[c.severity] as 'good' | 'warn' | 'bad') : undefined}
      />
      <Stack>
        <Section icon={ClipboardList} label="Consultation">
          <Facts
            items={[
              { label: 'Case ID', value: c.id },
              { label: 'Animal ID', value: c.animalId || '—' },
              { label: 'Species', value: c.speciesName },
              { label: 'Site', value: c.siteName },
              { label: 'Date', value: longDate(c.day) },
              { label: 'Presenting sign', value: c.complaint },
              {
                label: 'Severity',
                value: c.severity ?? 'Not recorded',
                tone: c.severity ? SEVERITY_TONE[c.severity] : undefined,
              },
              /* THE FIELDS THAT ARE NOT HERE. Ward, admitted, discharged, days in, outcome,
                 surgery and active medications were all on this sheet and every one of them
                 was a seeded draw. `medical_records` is a consultation, not an admission. */
            ]}
          />
        </Section>
        {c.animalId && (
          <Section icon={Dna} label="Animal" aside={c.animalId}>
            <DrillList>
              <DrillRow
                label={c.speciesName}
                sub={`${c.animalId} · ${c.siteName}`}
                value="Record"
                onOpen={() =>
                  open({
                    title: c.animalId,
                    eyebrow: 'Animal',
                    body: <AnimalMedicalSheet animalId={c.animalId} cases={[c]} />,
                  })
                }
              />
            </DrillList>
          </Section>
        )}
      </Stack>
    </>
  )
}

/* ── a filtered list ─────────────────────────────────────────────────────── */

/** Any set of consultations, with its splits above its records. */
export function CaseListSheet({
  title,
  cases,
  label,
  note,
}: {
  title: string
  cases: MedCase[]
  label: string
  note?: string
}) {
  const { scope } = useScope()
  const { open } = useSheet()
  const severe = cases.filter((c) => c.severity === 'High' || c.severity === 'Extreme').length

  return (
    <>
      <SheetHero
        value={fmt(cases.length)}
        label={label}
        note={note ?? `${title} · ${scope.win.window}`}
        tone={severe ? 'bad' : undefined}
      />
      <Stack>
        <Section icon={Stethoscope} label="Caseload">
          <Snapshot
            cols={2}
            items={[
              { label: 'Consultations', value: fmt(cases.length) },
              { label: 'High or extreme', value: fmt(severe), tone: severe ? 'bad' : undefined },
            ]}
          />
        </Section>
        <Splits
          rows={cases}
          onSpecies={(name) =>
            open({
              title: name,
              eyebrow: `${title} › Species`,
              body: (
                <CaseListSheet
                  title={name}
                  cases={cases.filter((c) => c.speciesName === name)}
                  label="Consultations"
                />
              ),
            })
          }
        />
        <Section icon={ClipboardList} label="Records" aside={`${fmt(cases.length)}`}>
          <CaseRows rows={cases} eyebrow={title} />
        </Section>
      </Stack>
    </>
  )
}

/* ── one bucket of the trend ─────────────────────────────────────────────── */

/** The consultations inside one cell of the case-trend grid. */
export function PeriodSheet({ cases, label, from, to }: { cases: MedCase[]; label: string; from: number; to: number }) {
  const severe = cases.filter((c) => c.severity === 'High' || c.severity === 'Extreme').length

  return (
    <>
      <SheetHero
        value={fmt(cases.length)}
        label={`Consultations · ${label}`}
        note={from === to ? longDate(from) : `${shortDate(from)} – ${shortDate(to)}`}
        tone={severe ? 'bad' : undefined}
      />
      <Stack>
        <Splits rows={cases} />
        <Rule label="Records" />
        <Section icon={ClipboardList} label="Consultations" aside={`${fmt(cases.length)}`}>
          <CaseRows rows={cases} eyebrow={label} />
        </Section>
      </Stack>
    </>
  )
}
