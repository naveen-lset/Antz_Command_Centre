/**
 * MEDICAL & HOSPITALS — the sheets.
 *
 * The page is the analytical view; everything on it opens here. Nothing is a route,
 * because none of it is a place: a hospital's caseload, a case, the animal in it — these
 * are looks at the page you are already on.
 *
 * ONE HIERARCHY, ENTERED AT ANY HEIGHT. The brief's Overall → Hospital → Medical Case →
 * Animal is one tree, and Sick Animals, Hospitalised, Surgeries, Mortality, Recovery and
 * Active Medications are all filters over the same case list rather than six separate
 * trees. So there is one `CaseListSheet` that takes a title and a set of cases, and the
 * sections differ only in which cases they hand it. Six components would eventually give
 * six different answers about the same animal.
 *
 * NOTHING PRINTS A FIELD IT DOES NOT HAVE. An open case has no outcome, so its sheet says
 * "Still open" rather than guessing one; a case with no procedure prints no surgery row.
 */

import { useMemo } from 'react'
import {
  Activity,
  BedDouble,
  Building2,
  ClipboardList,
  Dna,
  HeartPulse,
  Hourglass,
  MapPin,
  Pill,
  Scissors,
  Stethoscope,
} from 'lucide-react'
import { longDate, shortDate } from '../../core/calendar'
import { animalById } from '../../core/animals'
import { hospitalOf } from '../../core/world'
import {
  FAINT,
  Facts,
  Figure,
  HERO_INK,
  Rule,
  Section,
  Snapshot,
  Stack,
  TONE,
  fmt,
} from '../../exec/system'
import { MoreRows, usePaged } from '../perf'
import { useScope } from '../scope'
import { useSheet } from '../sheet'
import { DrillList, DrillRow } from './kit'
import {
  OUTCOME_TONE,
  SEVERITY_TONE,
  byComplaintSlice,
  byHospitalSlice,
  byOutcomeSlice,
  bySeveritySlice,
  bySpeciesSlice,
  casesIn,
  daysIn,
  dischargedIn,
  medicationSlices,
  openCases,
  scopeLine,
  summarise,
  type MedCase,
} from './medicalData'
import { siteKeyOf } from '../../core/scope'

/* ── shared chrome ───────────────────────────────────────────────────────── */

/** `Figure` takes no neutral tone — a neutral reading is simply the default ink. */
const hero = (t: 'good' | 'warn' | 'bad' | 'neutral' | undefined): 'good' | 'warn' | 'bad' | undefined =>
  t === 'neutral' ? undefined : t

function SheetHero({
  value,
  unit,
  label,
  note,
  tone,
}: {
  value: string
  unit?: string
  label: string
  note?: string
  tone?: 'good' | 'warn' | 'bad'
}) {
  return (
    <div className="w-full px-[var(--gutter-lg)] pb-3">
      <section className="animate-hero-in rounded-[var(--radius-card)] bg-white p-[var(--pad-card)]">
        <Figure value={value} unit={unit} size={48} color={tone ? TONE[tone] : HERO_INK} />
        <p className="mt-1 text-body text-[#3d3a34]">{label}</p>
        {note && (
          <p className="mt-2.5 text-caption" style={{ color: FAINT }}>
            {note}
          </p>
        )}
      </section>
    </div>
  )
}

/** A page of case rows. Every list on this page is one of these. */
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
        No cases.
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
            sub={`${c.animalId} · ${c.hospitalName}`}
            value={c.open ? `${daysIn(c)} d` : (c.outcome ?? shortDate(c.closesOn))}
            tone={c.open ? SEVERITY_TONE[c.severity] : OUTCOME_TONE[c.outcome ?? 'Recovered']}
            onOpen={() => open({ title: c.id, eyebrow: `${eyebrow} › Case`, body: <CaseSheet c={c} /> })}
          />
        ))}
      </DrillList>
      <MoreRows page={page} noun="cases" />
    </>
  )
}

/** The hospital / species split every filtered list carries, above its records. */
function Splits({
  rows,
  eyebrow,
  onHospital,
  onSpecies,
}: {
  rows: MedCase[]
  eyebrow: string
  onHospital?: (id: string) => void
  onSpecies?: (name: string, id: string) => void
}) {
  const hospitals = useMemo(() => byHospitalSlice(rows), [rows])
  const species = useMemo(() => bySpeciesSlice(rows).slice(0, 12), [rows])

  return (
    <>
      {hospitals.length > 0 && (
        <Section icon={Building2} label="Hospitals" aside={`${hospitals.length}`}>
          <DrillList>
            {hospitals.map((h) => (
              <DrillRow
                key={h.id}
                label={h.label}
                value={fmt(h.value)}
                onOpen={onHospital ? () => onHospital(h.id) : undefined}
              />
            ))}
          </DrillList>
        </Section>
      )}
      {species.length > 0 && (
        <Section icon={Dna} label="Species" aside={`${species.length}`}>
          <DrillList>
            {species.map((s) => (
              <DrillRow
                key={s.id}
                label={s.label}
                sub={s.sub}
                value={fmt(s.value)}
                onOpen={onSpecies ? () => onSpecies(s.label, s.id) : undefined}
              />
            ))}
          </DrillList>
        </Section>
      )}
      <Section icon={ClipboardList} label="Case records" aside={`${rows.length}`}>
        <CaseRows rows={rows} eyebrow={eyebrow} />
      </Section>
    </>
  )
}

/* ── the animal, at the bottom of every path ─────────────────────────────── */

/**
 * An animal's medical standing — the deepest level.
 *
 * Reached from a case, from a species, from search. Shows the animal's own record and
 * every case it has, so a reader who arrived from one case can see it is the animal's
 * third admission this year.
 */
export function AnimalMedicalSheet({ animalId, cases }: { animalId: string; cases: MedCase[] }) {
  const animal = animalById(animalId)
  const mine = cases.filter((c) => c.animalId === animalId)
  const current = mine.find((c) => c.open)

  return (
    <>
      <SheetHero
        value={current ? `${daysIn(current)}` : String(mine.length)}
        unit={current ? 'd' : undefined}
        label={current ? `In hospital · ${current.hospitalName}` : `Medical cases · ${animal?.speciesName ?? ''}`}
        note={animal ? `${animal.id} · ${animal.siteName}` : animalId}
        tone={current ? hero(SEVERITY_TONE[current.severity]) : undefined}
      />
      <Stack>
        <Section icon={Stethoscope} label="Animal">
          <Facts
            items={[
              { label: 'Animal ID', value: animalId },
              ...(animal?.callName ? [{ label: 'Call name', value: animal.callName }] : []),
              { label: 'Species', sub: animal?.cls, value: animal?.speciesName ?? mine[0]?.speciesName ?? '—' },
              { label: 'Site', value: animal?.siteName ?? mine[0]?.siteName ?? '—' },
              ...(animal ? [{ label: 'Enclosure', value: animal.enclosureId }] : []),
              ...(animal ? [{ label: 'Age', value: animal.age }] : []),
              {
                label: 'Current medical status',
                value: current ? `${current.severity} · in hospital` : (mine[0]?.outcome ?? 'No open case'),
                tone: current ? SEVERITY_TONE[current.severity] : 'good',
              },
            ]}
          />
        </Section>

        {current && (
          <>
            <Section icon={BedDouble} label="Hospitalisation" aside={current.hospitalName}>
              <Facts
                items={[
                  { label: 'Hospital', value: current.hospitalName },
                  ...(current.wardName ? [{ label: 'Ward', value: current.wardName }] : []),
                  { label: 'Admitted', value: longDate(current.day) },
                  { label: 'Length of stay', value: `${daysIn(current)} d` },
                  { label: 'Presenting complaint', value: current.complaint },
                ]}
              />
            </Section>

            {current.medications.length > 0 && (
              <Section icon={Pill} label="Active medication" aside={`${current.medications.length}`}>
                <Facts
                  items={current.medications.map((m) => ({
                    label: m.name,
                    sub: m.kind,
                    value: `from ${shortDate(m.startOn)}`,
                  }))}
                />
              </Section>
            )}

            {current.surgery && (
              <Section icon={Scissors} label="Surgery" aside={shortDate(current.surgery.day)}>
                <Facts
                  items={[
                    { label: 'Procedure', value: current.surgery.procedure },
                    { label: 'Date', value: longDate(current.surgery.day) },
                    { label: 'Status', value: 'Post-operative', tone: 'warn' },
                  ]}
                />
              </Section>
            )}
          </>
        )}

        <Section icon={ClipboardList} label="Medical cases" aside={`${mine.length}`}>
          <CaseRows rows={mine} eyebrow={animalId} />
        </Section>
      </Stack>
      <p className="px-[var(--gutter-lg)] pt-1 pb-2 text-center text-caption" style={{ color: FAINT }}>
        Deepest level
      </p>
    </>
  )
}

/* ── one medical case ────────────────────────────────────────────────────── */

/** Every field the case has, and no field it does not. The brief's §15, exactly. */
export function CaseSheet({ c }: { c: MedCase }) {
  const { open } = useSheet()

  return (
    <>
      <SheetHero
        value={c.open ? String(daysIn(c)) : String(c.stay)}
        unit="d"
        label={c.open ? `${c.severity} · in hospital` : `${c.outcome} · ${c.stay} day stay`}
        note={`${c.speciesName} · ${c.hospitalName}`}
        tone={hero(c.open ? SEVERITY_TONE[c.severity] : OUTCOME_TONE[c.outcome ?? 'Recovered'])}
      />
      <Stack>
        <Section icon={ClipboardList} label="Medical case">
          <Facts
            items={[
              { label: 'Case ID', value: c.id },
              { label: 'Animal', value: c.animalId },
              { label: 'Species', value: c.speciesName },
              { label: 'Hospital', value: c.hospitalName },
              ...(c.wardName ? [{ label: 'Ward', value: c.wardName }] : []),
              { label: 'Site', value: c.siteName },
              { label: 'Case date', value: longDate(c.day) },
              { label: 'Presenting complaint', value: c.complaint },
              { label: 'Severity', value: c.severity, tone: SEVERITY_TONE[c.severity] },
              {
                label: 'Hospitalisation',
                value: c.open ? `In hospital · day ${daysIn(c)}` : `Discharged ${shortDate(c.closesOn)}`,
                tone: c.open ? 'warn' : 'good',
              },
              {
                label: 'Outcome',
                /* An open case has none. Saying so is the honest field, and it is the one
                   field on this sheet a director would act on. */
                value: c.outcome ?? 'Still open',
                tone: c.outcome ? OUTCOME_TONE[c.outcome] : 'neutral',
              },
            ]}
          />
        </Section>

        {c.medications.length > 0 && (
          <Section icon={Pill} label="Active medication" aside={`${c.medications.length}`}>
            <Facts
              items={c.medications.map((m) => ({
                label: m.name,
                sub: m.kind,
                value: `from ${shortDate(m.startOn)}`,
              }))}
            />
          </Section>
        )}

        {c.surgery && (
          <Section icon={Scissors} label="Surgery">
            <Facts
              items={[
                { label: 'Procedure', value: c.surgery.procedure },
                { label: 'Date', value: longDate(c.surgery.day) },
                { label: 'Status', value: c.open ? 'Post-operative' : (c.outcome ?? '—'), tone: c.open ? 'warn' : 'good' },
              ]}
            />
          </Section>
        )}

        <Section icon={Stethoscope} label="Animal" aside={c.animalId}>
          <DrillList>
            <DrillRow
              label={c.speciesName}
              sub={`${c.animalId} · ${c.siteName}`}
              value="Record"
              onOpen={() =>
                open({
                  title: c.animalId,
                  eyebrow: `${c.id} › Animal`,
                  body: <AnimalMedicalSheet animalId={c.animalId} cases={[c]} />,
                })
              }
            />
          </DrillList>
        </Section>
      </Stack>
    </>
  )
}

/* ── a filtered case list — what most sections open ──────────────────────── */

/**
 * ONE SHEET FOR EVERY SLICE. Sick animals, hospitalised, surgeries, deaths, recoveries, a
 * period of the trend, a species, a medicine — all of them are "these cases", and the only
 * thing that differs is which cases and what the figure at the top means.
 */
export function CaseListSheet({
  title,
  cases,
  label,
  tone,
  note,
}: {
  title: string
  cases: MedCase[]
  /** What the count at the top IS — "in hospital", "surgeries", "deaths in care". */
  label: string
  tone?: 'good' | 'warn' | 'bad'
  note?: string
}) {
  const { scope } = useScope()
  const { open } = useSheet()

  return (
    <>
      <SheetHero value={fmt(cases.length)} label={label} note={note ?? scopeLine(scope)} tone={tone} />
      <Stack>
        <Splits
          rows={cases}
          eyebrow={title}
          onHospital={(id) =>
            open({
              title: hospitalOf(id)?.name ?? id,
              eyebrow: `${title} › Hospital`,
              body: (
                <CaseListSheet
                  title={hospitalOf(id)?.name ?? id}
                  cases={cases.filter((c) => c.hospitalId === id)}
                  label={label}
                  tone={tone}
                  note={`${hospitalOf(id)?.name ?? id} · ${scope.win.window}`}
                />
              ),
            })
          }
          onSpecies={(name) =>
            open({
              title: name,
              eyebrow: `${title} › Species`,
              body: (
                <CaseListSheet
                  title={name}
                  cases={cases.filter((c) => c.speciesName === name)}
                  label={label}
                  tone={tone}
                  note={`${name} · ${scope.win.window}`}
                />
              ),
            })
          }
        />
      </Stack>
    </>
  )
}

/* ── one hospital, in full ───────────────────────────────────────────────── */

/** The brief's §6 — every figure the hospital table shows, then species, cases, animals. */
export function HospitalSheet({ hospitalId }: { hospitalId: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const hospital = hospitalOf(hospitalId)
  const site = siteKeyOf(scope)

  const s = useMemo(() => summarise(scope, hospitalId), [scope, hospitalId])
  const opened = useMemo(() => casesIn(scope, hospitalId), [scope, hospitalId])
  const inHospital = useMemo(() => openCases(site, hospitalId), [site, hospitalId])
  const closed = useMemo(() => dischargedIn(scope, hospitalId), [scope, hospitalId])
  const severity = useMemo(() => bySeveritySlice(inHospital), [inHospital])
  const meds = useMemo(() => medicationSlices(site, hospitalId), [site, hospitalId])

  return (
    <>
      <SheetHero
        value={fmt(s.inHospital)}
        label={`In hospital · ${hospital?.name ?? hospitalId}`}
        note={`${hospital?.beds ?? 0} beds · ${Math.round((s.inHospital / (hospital?.beds || 1)) * 100)}% occupied · cases ${scope.win.window}`}
        tone={s.inHospital > (hospital?.beds ?? 0) * 0.85 ? 'bad' : undefined}
      />
      <Stack>
        <Section icon={HeartPulse} label="Caseload" aside={scope.win.window}>
          <Snapshot
            cols={4}
            items={[
              { label: 'Medical cases', value: fmt(s.cases), note: 'opened' },
              { label: 'In hospital', value: fmt(s.inHospital), note: 'now', tone: 'warn' },
              { label: 'Medications', value: fmt(s.medications), note: 'active now' },
              { label: 'Surgeries', value: fmt(s.surgeries) },
            ]}
          />
          <Rule label="Outcomes" />
          <Snapshot
            cols={4}
            items={[
              { label: 'Discharges', value: fmt(s.discharges) },
              { label: 'Died in care', value: fmt(s.deaths), tone: s.deaths ? 'bad' : 'neutral' },
              {
                label: 'Recovery',
                value: s.recovery === undefined ? '—' : `${Math.round(s.recovery)}`,
                unit: s.recovery === undefined ? undefined : '%',
                tone: 'good',
              },
              {
                label: 'Average stay',
                value: s.averageStay === undefined ? '—' : s.averageStay.toFixed(1),
                unit: s.averageStay === undefined ? undefined : 'd',
              },
            ]}
          />
        </Section>

        {severity.length > 0 && (
          <Section icon={Activity} label="Severity" aside={`${s.inHospital} in hospital`}>
            <DrillList>
              {severity.map((r) => (
                <DrillRow
                  key={r.id}
                  label={r.label}
                  value={fmt(r.value)}
                  tone={SEVERITY_TONE[r.label as keyof typeof SEVERITY_TONE]}
                  onOpen={() =>
                    open({
                      title: r.label,
                      eyebrow: `${hospital?.name ?? hospitalId} › Severity`,
                      body: (
                        <CaseListSheet
                          title={r.label}
                          cases={inHospital.filter((c) => c.severity === r.label)}
                          label={`${r.label} · in hospital`}
                          tone={SEVERITY_TONE[r.label as keyof typeof SEVERITY_TONE] === 'bad' ? 'bad' : 'warn'}
                        />
                      ),
                    })
                  }
                />
              ))}
            </DrillList>
          </Section>
        )}

        {meds.length > 0 && (
          <Section icon={Pill} label="Active medication" aside={`${s.medications} courses`}>
            <DrillList>
              {meds.slice(0, 10).map((m) => (
                <DrillRow
                  key={m.id}
                  label={m.label}
                  sub={m.sub}
                  value={fmt(m.value)}
                  onOpen={() =>
                    open({
                      title: m.label,
                      eyebrow: `${hospital?.name ?? hospitalId} › Medicine`,
                      body: (
                        <CaseListSheet
                          title={m.label}
                          cases={inHospital.filter((c) => c.medications.some((x) => x.id === m.id))}
                          label={`Animals on ${m.label}`}
                          note={`${hospital?.name ?? hospitalId} · active today`}
                        />
                      ),
                    })
                  }
                />
              ))}
            </DrillList>
          </Section>
        )}

        <Splits
          rows={opened}
          eyebrow={hospital?.name ?? hospitalId}
          onSpecies={(name) =>
            open({
              title: name,
              eyebrow: `${hospital?.name ?? hospitalId} › Species`,
              body: (
                <CaseListSheet
                  title={name}
                  cases={opened.filter((c) => c.speciesName === name)}
                  label="Medical cases"
                  note={`${name} · ${hospital?.name ?? hospitalId}`}
                />
              ),
            })
          }
        />

        {closed.length > 0 && (
          <Section icon={Hourglass} label="Discharged" aside={scope.win.window}>
            <CaseRows rows={closed} eyebrow={hospital?.name ?? hospitalId} />
          </Section>
        )}
      </Stack>
    </>
  )
}

/* ── the hospital's own species / outcome slices, for the smaller sections ── */

/** Recovery, as its outcomes — the brief's §9 drill. */
export function RecoverySheet({ cases, title }: { cases: MedCase[]; title: string }) {
  const { scope } = useScope()
  const { open } = useSheet()
  const outcomes = useMemo(() => byOutcomeSlice(cases), [cases])
  const recovered = cases.filter((c) => c.outcome === 'Recovered')

  return (
    <>
      <SheetHero
        value={cases.length ? `${Math.round((recovered.length / cases.length) * 100)}` : '—'}
        unit={cases.length ? '%' : undefined}
        label={`Recovery · ${title}`}
        note={`${fmt(recovered.length)} of ${fmt(cases.length)} discharged · ${scope.win.window}`}
        tone="good"
      />
      <Stack>
        <Section icon={Activity} label="Outcomes" aside={`${fmt(cases.length)} discharged`}>
          <DrillList>
            {outcomes.map((o) => (
              <DrillRow
                key={o.id}
                label={o.label}
                value={fmt(o.value)}
                unit={`${Math.round(o.percent)}%`}
                tone={OUTCOME_TONE[o.label as keyof typeof OUTCOME_TONE]}
                onOpen={() =>
                  open({
                    title: o.label,
                    eyebrow: `${title} › Outcome`,
                    body: (
                      <CaseListSheet
                        title={o.label}
                        cases={cases.filter((c) => c.outcome === o.label)}
                        label={o.label}
                        tone={OUTCOME_TONE[o.label as keyof typeof OUTCOME_TONE] === 'bad' ? 'bad' : 'good'}
                      />
                    ),
                  })
                }
              />
            ))}
          </DrillList>
        </Section>
        <Splits rows={cases} eyebrow={title} />
      </Stack>
    </>
  )
}

/** A period of the case trend — the brief's §3 drill. */
export function PeriodSheet({ cases, label, from, to }: { cases: MedCase[]; label: string; from: number; to: number }) {
  const complaints = useMemo(() => byComplaintSlice(cases), [cases])

  return (
    <>
      <SheetHero
        value={fmt(cases.length)}
        label={`Medical cases · ${label}`}
        note={from === to ? longDate(from) : `${shortDate(from)} – ${shortDate(to)}`}
      />
      <Stack>
        {complaints.length > 0 && (
          <Section icon={ClipboardList} label="Presenting complaint" aside={`${complaints.length}`}>
            <DrillList>
              {complaints.map((r) => (
                <DrillRow key={r.id} label={r.label} value={fmt(r.value)} />
              ))}
            </DrillList>
          </Section>
        )}
        <Splits rows={cases} eyebrow={label} />
      </Stack>
    </>
  )
}

export { MapPin }
