#!/usr/bin/env python3
"""
ETL — compile the SQL dump into the shapes `src/core/` already consumes.

WHY A BUILD STEP RATHER THAN A DATABASE BEHIND THE UI. `core/query.ts` is a pure,
synchronous façade and says why in its own header: "the moment a figure becomes async, two
figures on one screen can be from two different scopes for a frame, which is the
contradiction this whole layer exists to prevent." The dump is a static extract with a fixed
horizon, so there is nothing to keep fresh — compiling it into typed arrays that load once at
boot keeps every downstream guarantee intact and touches no page.

WHAT COMES OUT:
  public/data/dims.json     sites, species, enclosures, staff, metric descriptors, vocabularies
  public/data/events.bin    every event, columnar, sorted by (site, day)
  public/data/levels.bin    the population reading for every site on every day

NOTHING IS INVENTED HERE. A metric with no source in the schema is simply absent from the
output, which makes `METRICS[slug]` undefined, which makes `figure()` return `known: false` —
the empty state the pages already render. Eggs, laboratory turnaround, pharmacy cost and
inventory, attendance, tasks, approvals and alerts all fall out that way, on purpose.
"""
import json
import os
import re
import struct
import sys
from collections import Counter, defaultdict
from datetime import date, timedelta

import dump

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DUMP = os.path.join(ROOT, "Dump20260622.sql")
OUT = os.path.join(ROOT, "public", "data")

# ── the clock ────────────────────────────────────────────────────────────────
#
# The dump's own horizon, not the wall clock. 20 May 2026 is the last date any feed carries
# (housing.added_on_antz, vaccination.administered_on, animal_assessments.assessment_date all
# stop there). The epoch is 1 Jan 2020: earlier rows exist but are a scatter of a few hundred
# across six years, and several are plainly corrupt (deaths dated 1970, accessions dated 0001).
EPOCH = date(2020, 1, 1)
TODAY = date(2026, 5, 20)
HISTORY_DAYS = (TODAY - EPOCH).days + 1
TODAY_INDEX = HISTORY_DAYS - 1

_DATE = re.compile(r"^(\d{4})-(\d{2})-(\d{2})")


def day_index(raw):
    """A dump date string as a ledger index, or None where it is unusable."""
    if not raw:
        return None
    m = _DATE.match(raw.strip())
    if not m:
        return None
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (1 <= mo <= 12 and 1 <= d <= 31):
        return None
    try:
        v = date(y, mo, d)
    except ValueError:
        return None
    if v < EPOCH or v > TODAY:
        return None
    return (v - EPOCH).days


def slug(s):
    s = (s or "").lower().replace("’", "").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "unknown"


def title_fold(s):
    """Fold the spelling variants the anonymiser left behind: IncineratED / Incineration."""
    if not s:
        return None
    return " ".join(w.capitalize() if w.isupper() or w.islower() else w for w in s.strip().split())


# ── pass 1 · read everything the build needs ─────────────────────────────────

TABLES = {
    "housing", "species", "users",
    "report_births", "report_accessions", "report_deaths", "report_transfers",
    "vaccination", "deworming",
    "medical_records", "medical_record_animals", "complaints", "diagnosis",
    "prescriptions",
}

print("reading dump …", file=sys.stderr)
COLS = dump.columns(DUMP)


def getter(table, *names):
    """Index accessors for named columns, resolved once per table."""
    idx = [COLS[table].index(n) if n in COLS[table] else None for n in names]

    def get(row):
        return tuple(row[i] if i is not None and i < len(row) else None for i in idx)

    return get


G = {
    "housing": getter("housing", "antz_animal_id", "common_name", "class", "gender",
                      "site_facilty", "enclosure_name", "section_name", "accession_date",
                      "birth_date", "accession_type", "identifier_value", "weight"),
    "species": getter("species", "common_name", "scientific_name", "taxonomic_class",
                      "iucn_status", "cites_appendix", "breeding_category", "conservation_priority",
                      "incubation_days", "clutch_litter_size", "gestation_days", "lifespan_years",
                      "diet_category", "danger_level", "is_endemic"),
    "users": getter("users", "antz_user_id", "first_name", "last_name", "role",
                    "account_status", "site_access", "last_activity_date",
                    "observations_created", "medical_records_created", "assessments_recorded"),
    "report_births": getter("report_births", "antz_animal_id", "common_name", "site_facility",
                            "birth_date", "added_on_antz", "gender", "class"),
    "report_accessions": getter("report_accessions", "antz_animal_id", "common_name",
                                "site_facility", "accession_date", "accession_type", "class"),
    "report_deaths": getter("report_deaths", "antz_animal_id", "common_name", "site_facility",
                            "mortality_recorded_on", "manner_of_death", "necropsy_status",
                            "carcass_condition", "carcass_disposal_method", "class"),
    "report_transfers": getter("report_transfers", "antz_animal_id", "common_name",
                               "site_facility", "transferred_on", "transferred_to", "class"),
    "vaccination": getter("vaccination", "animal_id", "common_name", "site", "administered_on",
                          "vaccination_date", "medicine_name", "status", "qty_administered",
                          "wastage_qty", "enclosure"),
    "deworming": getter("deworming", "animal_id", "common_name", "site", "administered_on",
                        "vaccination_date", "medicine_name", "status", "qty_administered",
                        "wastage_qty", "enclosure"),
    "medical_records": getter("medical_records", "id", "site_name", "created_at", "case_type",
                              "medical_record_type"),
    "medical_record_animals": getter("medical_record_animals", "medical_record_id", "animal_id",
                                     "site_name", "common_name", "sex", "user_enclosure_name"),
    "complaints": getter("complaints", "medical_record_id", "animal_id", "complaint_name",
                         "severity", "recorded_date_time"),
    "diagnosis": getter("diagnosis", "medical_record_id", "animal_id", "diagnosis_name",
                        "severity", "recorded_date_time", "prognosis"),
    "prescriptions": getter("prescriptions", "medical_record_id", "generic_name",
                            "prescription_name", "created_at", "end_date", "delivery_route"),
}

raw = defaultdict(list)
counts = Counter()
for table, row in dump.rows(DUMP, TABLES):
    counts[table] += 1
    raw[table].append(G[table](row))
print("  rows read:", sum(counts.values()), file=sys.stderr)

# ── sites ────────────────────────────────────────────────────────────────────
#
# Canonical list is the union across every table that names one — 50 in total, against
# housing's 48. Ordered by living headcount so the biggest collection leads, which is the
# order every module already sorts by.

housed = Counter()
site_enclosures = defaultdict(set)
site_sections = defaultdict(set)
for aid, name, cls, gender, site, enc, section, *_ in raw["housing"]:
    if site:
        housed[site] += 1
        if enc:
            site_enclosures[site].add(enc)
        if section:
            site_sections[site].add(section)

seen_sites = set(housed)
for t, col in (("report_births", 2), ("report_accessions", 2), ("report_deaths", 2),
               ("report_transfers", 2), ("vaccination", 2), ("deworming", 2),
               ("medical_record_animals", 2)):
    for r in raw[t]:
        if r[col]:
            seen_sites.add(r[col])

site_names = sorted(seen_sites, key=lambda s: (-housed[s], s))
SITE_IX = {name: i for i, name in enumerate(site_names)}

used_codes = set()
def site_code(name):
    words = [w for w in re.split(r"[^A-Za-z]+", name) if w]
    base = ("".join(w[0] for w in words[:2]) or name[:2]).upper()[:2]
    code, n = base, 1
    while code in used_codes:
        n += 1
        code = f"{base}{n}"
    used_codes.add(code)
    return code

SITES = [{
    "key": slug(name),
    "name": name,
    "code": site_code(name),
    "enclosures": len(site_enclosures[name]),
    "sections": len(site_sections[name]),
    "animals": housed[name],
} for name in site_names]
SITE_KEY = {name: SITES[i]["key"] for i, name in enumerate(site_names)}

# ── species ──────────────────────────────────────────────────────────────────
#
# Keyed by (site, common name), because the same species held at two sites is two
# populations — the convention `core/world.ts` already uses. The registry spans every
# (site, species) pair seen ANYWHERE, not just currently housed ones: a mortality record
# names a species that may no longer be held, and an event whose species cannot be resolved
# would break the invariant that every event lands in exactly one bucket of every dimension.

sp_class = {}
for name, sci, cls, *_ in raw["species"]:
    if name:
        sp_class[name] = cls or "Unknown"
sp_ref = {}
for r in raw["species"]:
    if r[0]:
        sp_ref[r[0]] = r

pair_count = Counter()
pair_class = {}
for aid, name, cls, gender, site, *_ in raw["housing"]:
    if site and name:
        pair_count[(site, name)] += 1
        pair_class.setdefault((site, name), cls or sp_class.get(name) or "Unknown")

for t, (ci, si, cli) in (("report_births", (1, 2, 6)), ("report_accessions", (1, 2, 5)),
                         ("report_deaths", (1, 2, 8)), ("report_transfers", (1, 2, 5)),
                         ("vaccination", (1, 2, None)), ("deworming", (1, 2, None)),
                         ("medical_record_animals", (3, 2, None))):
    for r in raw[t]:
        name, site = r[ci], r[si]
        if not (name and site):
            continue
        key = (site, name)
        if key not in pair_class:
            pair_class[key] = (r[cli] if cli is not None else None) or sp_class.get(name) or "Unknown"

SPECIES, SP_IX = [], {}
for (site, name) in sorted(pair_class, key=lambda k: (-pair_count[k], k[1], k[0])):
    key = f"{SITE_KEY[site]}:{slug(name)}"
    SP_IX[(site, name)] = len(SPECIES)
    ref = sp_ref.get(name)
    SPECIES.append({
        "id": key,
        "name": name,
        "cls": pair_class[(site, name)],
        "siteKey": SITE_KEY[site],
        "weight": pair_count[(site, name)],
        "iucn": (ref[3] if ref else None),
        "cites": (ref[4] if ref else None),
    })

CLASSES = [c for c, _ in Counter(s["cls"] for s in SPECIES).most_common()]

print(f"  sites {len(SITES)} · species pairs {len(SPECIES)} · classes {len(CLASSES)}",
      file=sys.stderr)

# ── medical record → site / species / animal ─────────────────────────────────

mr_site, mr_species, mr_animal = {}, {}, {}
for mrid, aid, site, name, sex, enc in raw["medical_record_animals"]:
    if mrid:
        mr_site[mrid] = site
        mr_species[mrid] = name
        mr_animal[mrid] = aid
mr_meta = {}
for mid, site, created, case_type, rtype in raw["medical_records"]:
    mr_meta[mid] = (site or mr_site.get(mid), created, case_type, rtype)

mr_complaint, mr_severity = {}, {}
for mrid, aid, cname, sev, when in raw["complaints"]:
    if mrid and mrid not in mr_complaint and cname:
        mr_complaint[mrid] = cname
        mr_severity[mrid] = sev

# ── events ───────────────────────────────────────────────────────────────────

discarded = Counter()


def to_int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def build(metric, source, *, unit, grain, detail_label, facets=()):
    """
    Collect (day, siteIx, speciesIx, detailIx, animalId) for one metric, plus any facets.

    A FACET IS A SECOND CLASSIFYING COLUMN. `detail` is the one dimension every flow has —
    the manner of death, the vaccine, the destination — and for most metrics that is all the
    source records. Mortality records four more things about each death that a reader asks
    for directly: whether the necropsy is done, what condition the carcass was in, how it was
    disposed of. Those are per-EVENT facts, not per-metric ones, so they travel as extra
    columns on the same rows rather than as separate metrics that would have to be re-joined.

    Each facet is `(name, label, extractor)` where the extractor is passed the source tuple's
    trailing payload. Vocabularies are built the same way `detail` is, so a facet groups and
    sums exactly like the primary dimension.
    """
    vocab, vix = [], {}
    fvocab = {name: [] for name, _, _ in facets}
    fix = {name: {} for name, _, _ in facets}
    rows = []

    for row in source:
        site, name, when, detail, animal = row[:5]
        payload = row[5] if len(row) > 5 else None
        d = day_index(when)
        if d is None or not site or site not in SITE_IX:
            discarded[metric] += 1
            continue
        spx = SP_IX.get((site, name))
        if spx is None:
            discarded[metric + ":species"] += 1
            spx = 0xFFFF
        label = (detail or "Not recorded").strip() or "Not recorded"
        if label not in vix:
            vix[label] = len(vocab)
            vocab.append(label)

        codes = []
        for fname, _, extract in facets:
            v = extract(payload)
            v = (v or "Not recorded").strip() or "Not recorded"
            if v not in fix[fname]:
                fix[fname][v] = len(fvocab[fname])
                fvocab[fname].append(v)
            codes.append(fix[fname][v])

        rows.append((SITE_IX[site], d, spx, vix[label], to_int(animal), codes))

    rows.sort(key=lambda r: (r[0], r[1]))
    return {"metric": metric, "unit": unit, "grain": grain, "detailLabel": detail_label,
            "details": vocab, "rows": rows,
            "facets": [(n, l, fvocab[n]) for n, l, _ in facets]}


def src_report(table, ci, si, di, dei, ai=0, when_fallback=None):
    for r in raw[table]:
        when = r[di] or (r[when_fallback] if when_fallback is not None else None)
        yield r[si], r[ci], when, r[dei], r[ai]


FLOWS = []

# Births. `birth_date` is null on 59% of rows, so the record's own creation date stands in
# where it is missing — stated here rather than silently.
FLOWS.append(build("births",
                   ((r[2], r[1], r[3] or r[4], "Natality", r[0]) for r in raw["report_births"]),
                   unit="births", grain="event", detail_label="Type"))

FLOWS.append(build("accession",
                   ((r[2], r[1], r[3], r[4], r[0]) for r in raw["report_accessions"]),
                   unit="intakes", grain="event", detail_label="Intake route"))

# `carcass_disposal_method` is the same act spelled three ways in the source — IncineratED
# 27,316, Incineration 522, Combustion 16 — so it is folded before it becomes a vocabulary.
DISPOSAL = {"incinerated": "Incinerated", "incineration": "Incinerated", "combustion": "Incinerated",
            "burial": "Burial", "buried": "Burial", "discarded": "Discarded",
            "preserved": "Preserved"}

def disposal(v):
    if not v:
        return None
    return DISPOSAL.get(v.strip().lower(), title_fold(v))

FLOWS.append(build("mortality",
                   ((r[2], r[1], r[3], r[4], r[0], r) for r in raw["report_deaths"]),
                   unit="deaths", grain="event", detail_label="Manner of death",
                   facets=[
                       ("necropsy", "Necropsy", lambda r: r[5] if r[5] in ("Pending", "Completed") else None),
                       ("condition", "Carcass condition", lambda r: title_fold(r[6])),
                       ("disposal", "Disposal", lambda r: disposal(r[7])),
                   ]))

FLOWS.append(build("transfers",
                   ((r[2], r[1], r[3], r[4], r[0]) for r in raw["report_transfers"]),
                   unit="transfers", grain="event", detail_label="Destination"))

FLOWS.append(build("vaccinations",
                   ((r[2], r[1], r[3], r[5], r[0]) for r in raw["vaccination"]
                    if (r[6] or "").lower() == "completed"),
                   unit="vaccinations", grain="event", detail_label="Vaccine"))

FLOWS.append(build("deworming",
                   ((r[2], r[1], r[3], r[5], r[0]) for r in raw["deworming"]
                    if (r[6] or "").lower() == "completed"),
                   unit="treatments", grain="event", detail_label="Anthelmintic"))

# Doses scheduled and not given. THIS is what "overdue" means in the source — a row with
# status Pending and a null administered_on — and it is a count of real scheduled doses
# rather than a coverage gap. Dated on the scheduled date, so days-overdue is a subtraction.
FLOWS.append(build("vaccinationDue",
                   ((r[2], r[1], r[4], r[5], r[0]) for r in raw["vaccination"]
                    if (r[6] or "").lower() == "pending"),
                   unit="doses due", grain="event", detail_label="Vaccine"))

FLOWS.append(build("dewormingDue",
                   ((r[2], r[1], r[4], r[5], r[0]) for r in raw["deworming"]
                    if (r[6] or "").lower() == "pending"),
                   unit="treatments due", grain="event", detail_label="Anthelmintic"))

# Consultations. The presenting complaint is the classifying dimension where one was
# recorded; the rest say so rather than being bucketed into a plausible-looking guess.
FLOWS.append(build("admissions",
                   ((mr_meta[m][0], mr_species.get(m), mr_meta[m][1],
                     mr_complaint.get(m), mr_animal.get(m), m)
                    for m in mr_meta if mr_meta[m][2] == "Standard"),
                   unit="consultations", grain="event", detail_label="Presenting sign",
                   facets=[("severity", "Severity", lambda m: mr_severity.get(m))]))

FLOWS.append(build("disease",
                   ((mr_site.get(r[0]), mr_species.get(r[0]), r[4], r[2], r[1], r)
                    for r in raw["diagnosis"]),
                   unit="diagnoses", grain="event", detail_label="Diagnosis",
                   facets=[
                       ("severity", "Severity", lambda r: r[3]),
                       ("prognosis", "Prognosis", lambda r: title_fold(r[5])),
                   ]))

FLOWS.append(build("supplement",
                   ((mr_meta[m][0], mr_species.get(m), mr_meta[m][1], "Supplement", mr_animal.get(m))
                    for m in mr_meta if mr_meta[m][2] == "Supplements"),
                   unit="administrations", grain="event", detail_label="Type"))

FLOWS.append(build("pharmacy",
                   ((mr_site.get(r[0]), mr_species.get(r[0]), r[3], r[1], mr_animal.get(r[0]))
                    for r in raw["prescriptions"]),
                   unit="prescriptions", grain="event", detail_label="Medicine"))

FLOWS = [f for f in FLOWS if f["rows"]]

# ── the population level, reconstructed ──────────────────────────────────────
#
# housing IS the living collection — deaths overlap it at 0.1% and transfers at 0.0%, measured
# across the whole dump — so today's headcount is an exact count. Earlier days are walked
# backwards through the recorded movements: pop(d-1) = pop(d) − arrivals(d) + departures(d).
# That is a reconstruction, not a reading, and it is the only honest option: the schema stores
# no headcount history at all.

by_metric = {f["metric"]: f for f in FLOWS}
level = [[0] * HISTORY_DAYS for _ in SITES]


def daily_counts(metric):
    grid = [[0] * HISTORY_DAYS for _ in SITES]
    f = by_metric.get(metric)
    if f:
        for s, d, *_ in f["rows"]:
            grid[s][d] += 1
    return grid


arrivals = daily_counts("births")
acc = daily_counts("accession")
deaths = daily_counts("mortality")
gone = daily_counts("transfers")

for i, site in enumerate(SITES):
    level[i][TODAY_INDEX] = site["animals"]
    for d in range(TODAY_INDEX, 0, -1):
        prev = level[i][d] - arrivals[i][d] - acc[i][d] + deaths[i][d] + gone[i][d]
        level[i][d - 1] = max(0, prev)

# ── rate metrics ─────────────────────────────────────────────────────────────
#
# Coverage is distinct animals dosed against animals housed. There is no protocol table
# anywhere in the schema saying which animals are DUE a dose, so the eligible herd cannot be
# established — the denominator here is every housed animal, which is the widest honest
# reading and the one the module now states.

SIX_MONTHS = 182


def coverage(table, status_ix=6, when_ix=3):
    now, then = defaultdict(set), defaultdict(set)
    for r in raw[table]:
        if (r[status_ix] or "").lower() != "completed":
            continue
        site, animal, when = r[2], r[0], r[when_ix]
        if not site or site not in SITE_IX or not animal:
            continue
        d = day_index(when)
        if d is None:
            continue
        now[site].add(animal)
        if d <= TODAY_INDEX - SIX_MONTHS:
            then[site].add(animal)
    return now, then


RATES = {}
for slugname, table, unit in (("vaccination", "vaccination", "covered"),
                              ("dewormingCover", "deworming", "dewormed")):
    now, then = coverage(table)
    RATES[slugname] = {
        "unit": unit, "kind": "rate", "grain": "member",
        "levels": [{"site": s["key"], "now": len(now.get(n, ())), "then": len(then.get(n, ())),
                    "of": s["animals"]}
                   for s, n in zip(SITES, site_names) if s["animals"] or now.get(n)],
    }

# Animals under care right now — the only proxy the schema supports is a live prescription.
live = defaultdict(set)
was = defaultdict(set)
for mrid, generic, brand, created, end, route in raw["prescriptions"]:
    site = mr_site.get(mrid)
    animal = mr_animal.get(mrid)
    if not site or not animal:
        continue
    e = day_index(end)
    if e is None or e >= TODAY_INDEX:
        live[site].add(animal)
    if e is not None and e >= TODAY_INDEX - SIX_MONTHS:
        was[site].add(animal)

LEVELS = {"health": {
    "unit": "under care", "kind": "level", "grain": "member",
    "levels": [{"site": s["key"], "now": len(live.get(n, ())), "then": len(was.get(n, ()))}
               for s, n in zip(SITES, site_names) if live.get(n) or was.get(n)],
}}

# ── enclosures and staff ─────────────────────────────────────────────────────

ENCLOSURES = []
ENC_IX = {}
for name in site_names:
    for enc in sorted(site_enclosures[name]):
        ENC_IX[(name, enc)] = len(ENCLOSURES)
        ENCLOSURES.append({"id": enc, "name": enc, "siteKey": SITE_KEY[name]})

# ── the animal register ──────────────────────────────────────────────────────
#
# Every housed animal, columnar. `core/animals.ts` used to derive 215,432 animals from a
# seeded hash of an id because no registry existed to read; there is one now, so an animal's
# species, enclosure, sex and date of birth are read rather than invented. Only the fields the
# UI actually renders are carried — 110,020 rows at 15 bytes is 1.6 MB.

SEX = {"male": 1, "female": 2, "undetermined": 0, "indeterminate": 3}
NO_DAY = 0xFFFF

# Which animals carry a preventive or clinical record. `core/animals.ts` used to draw these
# per animal from a seeded coin; they are set memberships now.
ORIGINS = ["Rescue", "House Breeding", "Birth", "From Institution"]
ORIGIN_IX = {o: i for i, o in enumerate(ORIGINS)}

vaccinated = {r[0] for r in raw["vaccination"] if (r[6] or "").lower() == "completed" and r[0]}
dewormed = {r[0] for r in raw["deworming"] if (r[6] or "").lower() == "completed" and r[0]}
under_care = set()
for mrid, generic, brand, created, end, route in raw["prescriptions"]:
    a = mr_animal.get(mrid)
    e = day_index(end)
    if a and (e is None or e >= TODAY_INDEX):
        under_care.add(a)
for mrid, aid, dname, sev, when, prog in raw["diagnosis"]:
    a = aid or mr_animal.get(mrid)
    d = day_index(when)
    if a and d is not None and d >= TODAY_INDEX - 90:
        under_care.add(a)

FLAG_VACCINATED, FLAG_DEWORMED, FLAG_CARE = 1, 2, 4

register = []
for aid, name, cls, gender, site, enc, section, acc_date, birth, acc_type, ident, weight in raw["housing"]:
    if not site or site not in SITE_IX:
        discarded["housing:site"] += 1
        continue
    spx = SP_IX.get((site, name))
    if spx is None:
        discarded["housing:species"] += 1
        continue
    b = day_index(birth)
    a = day_index(acc_date)
    flags = 0
    if aid in vaccinated:
        flags |= FLAG_VACCINATED
    if aid in dewormed:
        flags |= FLAG_DEWORMED
    if aid in under_care:
        flags |= FLAG_CARE
    register.append((
        SITE_IX[site],
        spx,
        to_int(aid),
        ENC_IX.get((site, enc), 0xFFFF),
        SEX.get((gender or "").lower(), 0),
        NO_DAY if b is None else b,
        NO_DAY if a is None else a,
        flags,
        ORIGIN_IX.get(acc_type, 255),
    ))
register.sort(key=lambda r: (r[0], r[1]))

roles = Counter(r[3] for r in raw["users"] if r[3])
DEPARTMENTS = [{"id": slug(r), "name": r, "weight": n} for r, n in roles.most_common()]

USERS = []
for uid, first, last, role, status, access, last_active, obs, med, assess in raw["users"]:
    if not (first or last):
        continue
    first_site = (access or "").split(";")[0].strip()
    USERS.append({
        "id": uid or f"USR-{len(USERS)}",
        "name": " ".join(x for x in (first, last) if x),
        "role": role or "Unspecified",
        "departmentId": slug(role or "Unspecified"),
        "siteKey": SITE_KEY.get(first_site),
        "status": "active" if (status or "").lower() == "active" else "dormant",
        "lastActive": day_index(last_active),
        "observations": to_int(obs),
        "records": to_int(med),
        "assessments": to_int(assess),
    })

# ── write ────────────────────────────────────────────────────────────────────

os.makedirs(OUT, exist_ok=True)

events = bytearray()
layout = {}


def pad4():
    while len(events) % 4:
        events.append(0)


for f in FLOWS:
    rows = f["rows"]
    n = len(rows)
    pad4()
    entry = {"count": n, "details": f["details"], "unit": f["unit"], "grain": f["grain"],
             "detailLabel": f["detailLabel"], "kind": "flow"}
    entry["animal"] = len(events)
    events += struct.pack(f"<{n}i", *(r[4] for r in rows))
    entry["day"] = len(events)
    events += struct.pack(f"<{n}H", *(r[1] for r in rows))
    entry["species"] = len(events)
    events += struct.pack(f"<{n}H", *(r[2] for r in rows))
    entry["detail"] = len(events)
    events += struct.pack(f"<{n}H", *(r[3] for r in rows))
    entry["site"] = len(events)
    events += struct.pack(f"<{n}B", *(r[0] for r in rows))
    entry["facets"] = {}
    for fi, (fname, flabel, fvals) in enumerate(f["facets"]):
        while len(events) % 2:
            events.append(0)
        entry["facets"][fname] = {"label": flabel, "values": fvals, "offset": len(events)}
        events += struct.pack(f"<{n}H", *(r[5][fi] for r in rows))
    # Where each site's slice starts, so a scoped read never scans another site's events.
    slices = {}
    at = 0
    for s, site in enumerate(SITES):
        start = at
        while at < n and rows[at][0] == s:
            at += 1
        if at > start:
            slices[site["key"]] = [start, at - start]
    entry["slices"] = slices
    layout[f["metric"]] = entry

with open(os.path.join(OUT, "events.bin"), "wb") as fh:
    fh.write(events)

levels_buf = bytearray()
for row in level:
    levels_buf += struct.pack(f"<{HISTORY_DAYS}i", *row)
with open(os.path.join(OUT, "levels.bin"), "wb") as fh:
    fh.write(levels_buf)

# The register, columnar, with each species' slice recorded so a population page reads only
# its own rows rather than scanning 110,020 to find 12.
animals_buf = bytearray()
n = len(register)
animal_layout = {"count": n}
animal_layout["id"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}i", *(r[2] for r in register))
animal_layout["species"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}H", *(r[1] for r in register))
animal_layout["enclosure"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}H", *(r[3] for r in register))
animal_layout["born"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}H", *(r[5] for r in register))
animal_layout["accession"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}H", *(r[6] for r in register))
animal_layout["sex"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}B", *(r[4] for r in register))
animal_layout["site"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}B", *(r[0] for r in register))
animal_layout["flags"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}B", *(r[7] for r in register))
animal_layout["origin"] = len(animals_buf)
animals_buf += struct.pack(f"<{n}B", *(r[8] for r in register))
animal_layout["origins"] = ORIGINS

spans = {}
at = 0
while at < n:
    spx = register[at][1]
    start = at
    while at < n and register[at][1] == spx:
        at += 1
    spans[str(spx)] = [start, at - start]
animal_layout["spans"] = spans

with open(os.path.join(OUT, "animals.bin"), "wb") as fh:
    fh.write(animals_buf)

dims = {
    "meta": {
        "database": "species_mgmt_anon",
        "source": os.path.basename(DUMP),
        "epoch": EPOCH.isoformat(),
        "today": TODAY.isoformat(),
        "historyDays": HISTORY_DAYS,
        "sourceRows": dict(counts),
        "discarded": dict(discarded),
        "notes": {
            "population": "housing is the living collection; earlier days reconstructed from recorded movements",
            "births": "birth_date where present, else added_on_antz (59% of birth_date is null)",
            "coverage": "distinct animals dosed / animals housed — no protocol table exists to define an eligible herd",
            "health": "animals with a live prescription — the only under-care proxy in the schema",
        },
    },
    "sites": SITES,
    "classes": CLASSES,
    "species": SPECIES,
    "enclosures": ENCLOSURES,
    "departments": DEPARTMENTS,
    "users": USERS,
    "flows": layout,
    "rates": RATES,
    "levels": LEVELS,
    "population": {"file": "levels.bin", "sites": [s["key"] for s in SITES]},
    "animals": animal_layout,
}

with open(os.path.join(OUT, "dims.json"), "w") as fh:
    json.dump(dims, fh, separators=(",", ":"))

print(f"\nwrote {OUT}", file=sys.stderr)
print(f"  dims.json    {os.path.getsize(os.path.join(OUT,'dims.json'))/1e6:.2f} MB", file=sys.stderr)
print(f"  events.bin   {os.path.getsize(os.path.join(OUT,'events.bin'))/1e6:.2f} MB", file=sys.stderr)
print(f"  levels.bin   {os.path.getsize(os.path.join(OUT,'levels.bin'))/1e6:.2f} MB", file=sys.stderr)
print(f"  animals.bin  {os.path.getsize(os.path.join(OUT,'animals.bin'))/1e6:.2f} MB", file=sys.stderr)
print(f"\n  register     {len(register):,} housed animals", file=sys.stderr)
print(f"\n  clock        {EPOCH} → {TODAY}  ({HISTORY_DAYS} days)", file=sys.stderr)
print(f"  sites        {len(SITES)}", file=sys.stderr)
print(f"  species      {len(SPECIES)} (site × name pairs)", file=sys.stderr)
print(f"  enclosures   {len(ENCLOSURES)}", file=sys.stderr)
print(f"  staff        {len(USERS)}", file=sys.stderr)
print("\n  metrics:", file=sys.stderr)
for f in FLOWS:
    print(f"    {f['metric']:14} {len(f['rows']):>8,} events   {len(f['details']):>4} × {f['detailLabel']}",
          file=sys.stderr)
for k, v in RATES.items():
    tot = sum(x["now"] for x in v["levels"])
    of = sum(x["of"] for x in v["levels"])
    print(f"    {k:14} {tot:>8,} of {of:,} ({100*tot/max(1,of):.1f}%)", file=sys.stderr)
for k, v in LEVELS.items():
    print(f"    {k:14} {sum(x['now'] for x in v['levels']):>8,} now", file=sys.stderr)
if discarded:
    print("\n  discarded (unusable date, unknown site, or unresolvable species):", file=sys.stderr)
    for k, v in discarded.most_common():
        print(f"    {k:24} {v:>7,}", file=sys.stderr)
