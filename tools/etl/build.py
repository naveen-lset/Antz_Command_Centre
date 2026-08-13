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
    "prescriptions", "animal_assessments",
}

print("reading dump …", file=sys.stderr)
COLS = dump.columns(DUMP)

# ── the species page's reference biology ─────────────────────────────────────
#
# One row per species NAME, not per site × name pair. The rest of this build is keyed by the
# pair because a metric is always asked under a scope; this is not a metric. Sexual
# dimorphism does not change because the animal is at a different site, and holding one copy
# per pair would be 5,717 copies of 2,352 facts and an invitation for two of them to disagree.
#
# EVERY COLUMN HERE IS READ, NOT DERIVED. Where the dump has nothing the field is absent and
# the page renders no row for it — `lifespan_years` is filled for 55% of species, `gestation`
# for 17%, `incubation` for 41%, and that is the honest shape of the source: a bird has an
# incubation period and a mammal has a gestation, so a species carrying neither is a gap in
# the extract rather than a zero.
#
# THE SCORES ARE 1–5, NOT 0–10. Measured across all 2,352 rows: intelligence, activity,
# social, space, stress, size, need, conservation priority and visitor appeal are all 1–5.
# `budget_score` is the exception at 0–20, with 393 species above 10. A page that draws these
# on a common 0–10 track prints "Budget 11/10" and halves every welfare bar — so the scale
# travels with the value in `SCORE_SCALE` below rather than being assumed by the renderer.
PROFILE_COLS = [
    "common_name", "scientific_name", "taxonomic_class", "taxonomic_order", "taxonomic_family",
    "taxonomic_genus", "iucn_status", "iucn_trend", "cites_appendix", "native_countries",
    "avg_weight_g", "sexual_dimorphism", "sex_id_method", "habitat_zone", "habitat_type",
    "activity_pattern", "social_structure", "migration_pattern", "diet_category",
    "communication_type", "reproduction_type", "mating_system", "parental_care", "danger_level",
    "can_be_handled", "venomous_poisonous", "enclosure_type_required", "substrate_type",
    "uv_light_required", "water_feature_required", "recommended_id_method", "lifespan_years",
    "maturity_age_years", "gestation_days", "incubation_days", "clutch_litter_size",
    "independence_days", "birth_egg_weight_g", "weaning_age_days", "litters_per_year",
    "daily_kcal_estimate", "protein_pct_range", "fat_pct_range", "fiber_pct_range", "ca_p_ratio",
    "feeding_frequency", "foraging_mode", "intelligence_score", "activity_needs_score",
    "social_needs_score", "space_needs_score", "stress_risk_score", "size_score", "need_score",
    "conservation_priority", "visitor_appeal", "budget_score", "breeding_category",
    "breeding_feasibility", "species_description", "fun_fact", "iconic_trait", "group_name",
    "baby_name", "sound_description", "visitor_tip", "cultural_significance", "uniqueness",
]

# Which of those are numeric scores, and the top of each one's OWN scale.
SCORE_SCALE = {
    "intelligence_score": 5, "activity_needs_score": 5, "social_needs_score": 5,
    "space_needs_score": 5, "stress_risk_score": 5, "size_score": 5, "need_score": 5,
    "conservation_priority": 5, "visitor_appeal": 5, "budget_score": 20,
}


def getter(table, *names):
    """Index accessors for named columns, resolved once per table."""
    idx = [COLS[table].index(n) if n in COLS[table] else None for n in names]

    def get(row):
        return tuple(row[i] if i is not None and i < len(row) else None for i in idx)

    return get


# THE FIVE IDENTIFICATION COLUMNS ARE APPENDED, NEVER INSERTED, and the reason is the same one
# the `profile` getter below is kept separate for: this tuple is positionally unpacked in three
# places (the site walk, the pair walk and the register loop) and putting a column in the middle
# would silently reindex all of them into plausible-looking nonsense. Two of those three unpacks
# end in `*_`, so appending costs nothing and inserting would cost a day.
G = {
    "housing": getter("housing", "antz_animal_id", "common_name", "class", "gender",
                      "site_facilty", "enclosure_name", "section_name", "accession_date",
                      "birth_date", "accession_type", "identifier_value", "weight",
                      "micro_chip", "ring_number", "identifier_type", "breed_name",
                      "morph_name"),
    "species": getter("species", "common_name", "scientific_name", "taxonomic_class",
                      "iucn_status", "cites_appendix", "breeding_category", "conservation_priority",
                      "incubation_days", "clutch_litter_size", "gestation_days", "lifespan_years",
                      "diet_category", "danger_level", "is_endemic"),
    # The species page's reference biology, read straight across. Kept as its own getter
    # rather than widened above because the tuple above is positionally unpacked in four
    # places and adding to it would silently reindex all of them.
    "profile": getter("species", *PROFILE_COLS),
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
                        "severity", "recorded_date_time", "prognosis", "chronic"),
    "prescriptions": getter("prescriptions", "medical_record_id", "generic_name",
                            "prescription_name", "created_at", "end_date", "delivery_route"),
    # Read for the species page's ASSESSMENTS tab and for nothing else yet. `assessment_value`
    # is free text carrying everything from "3.135" to a paragraph about a morning walk, so it
    # is read as text and interpreted downstream against `response_type` rather than coerced
    # here — a float() at read time would silently turn 47,937 faecal descriptions into nothing.
    "animal_assessments": getter("animal_assessments", "antz_animal_id", "common_name", "site",
                                 "assessment_date", "assessment_category", "assessment_type",
                                 "assessment_value", "uom", "response_type", "life_stage",
                                 "contraception_type", "enclosure", "gender"),
}

raw = defaultdict(list)
counts = Counter()
for table, row in dump.rows(DUMP, TABLES):
    counts[table] += 1
    raw[table].append(G[table](row))
    # `raw` is keyed by TABLE and applies one getter per table, so a second view of a table
    # has to be taken here rather than by naming a getter after it. The profile is the only
    # one, and it reads the same `species` row through a much wider set of columns.
    if table == "species":
        raw["profile"].append(G["profile"](row))
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

# ── the profiles, one per species name that the collection actually holds ────
#
# Filtered to names that appear in `SPECIES`, because a profile for a species nobody holds is
# 2,352 rows of payload for a page that can never be reached. Empty fields are DROPPED rather
# than emitted as null: the page renders what it is given, so an absent key and a present
# `null` would otherwise have to mean the same thing in two places.
HELD = {s["name"] for s in SPECIES}
PROFILES = {}
_p_ix = {c: i for i, c in enumerate(PROFILE_COLS)}
for row in raw["profile"]:
    name = row[0]
    if not name or name not in HELD or slug(name) in PROFILES:
        continue
    out = {}
    for col, val in zip(PROFILE_COLS, row):
        if val is None or val == "" or val == "NULL":
            continue
        if col in SCORE_SCALE:
            try:
                out[col] = [int(float(val)), SCORE_SCALE[col]]   # [value, top of its scale]
            except ValueError:
                pass
        else:
            out[col] = val
    PROFILES[slug(name)] = out

_score_cov = sum(1 for p in PROFILES.values() if "intelligence_score" in p)
print(f"  profiles {len(PROFILES)} of {len(HELD)} held names · {_score_cov} scored",
      file=sys.stderr)

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

# `chronic` is the ONLY chronic-versus-acute signal anywhere in the schema, and it is a tinyint
# rather than a vocabulary: measured across all 6,808 diagnosis rows it is 1 on 271 and 0 on
# 6,537, with nothing null. The zero bucket is labelled "Not chronic" rather than "Acute"
# because the column records a flag that was set, not a clinical judgement that was made — a
# diagnosis nobody ticked is not thereby an acute one, and naming it so would put a finding in
# the reader's mouth that no clinician wrote down.
def chronic(v):
    if v in ("1", 1):
        return "Chronic"
    if v in ("0", 0):
        return "Not chronic"
    return None

FLOWS.append(build("disease",
                   ((mr_site.get(r[0]), mr_species.get(r[0]), r[4], r[2], r[1], r)
                    for r in raw["diagnosis"]),
                   unit="diagnoses", grain="event", detail_label="Diagnosis",
                   facets=[
                       ("severity", "Severity", lambda r: r[3]),
                       ("prognosis", "Prognosis", lambda r: title_fold(r[5])),
                       ("chronic", "Course", lambda r: chronic(r[6])),
                   ]))

FLOWS.append(build("supplement",
                   ((mr_meta[m][0], mr_species.get(m), mr_meta[m][1], "Supplement", mr_animal.get(m))
                    for m in mr_meta if mr_meta[m][2] == "Supplements"),
                   unit="administrations", grain="event", detail_label="Type"))

# `delivery_route` needs the same spelling fold `carcass_disposal_method` got, and for the same
# reason: the anonymiser left one act spelled several ways. Measured over the prescriptions
# table — Orally 1,089 · Oraly 497 · orally 5. Unfolded, the commonest route in the collection
# would render as three routes and the leading one would understate itself by a third.
ROUTE = {"orally": "Orally", "oraly": "Orally", "oral": "Orally",
         "topical": "Topical", "topically": "Topical",
         "subcutaneous": "Subcutaneous", "subcutaneous route": "Subcutaneous",
         "intravenous": "Intravenous", "intra venous": "Intravenous",
         "intramuscular": "Intramuscular", "opthalmic": "Ophthalmic"}

# Named `delivery` rather than `route` because two later loops over `raw["prescriptions"]`
# already bind a local called `route`, and a module-level function of that name would be
# shadowed by whichever ran last.
def delivery(v):
    if not v or not v.strip():
        return None
    return ROUTE.get(v.strip().lower(), title_fold(v))

FLOWS.append(build("pharmacy",
                   ((mr_site.get(r[0]), mr_species.get(r[0]), r[3], r[1], mr_animal.get(r[0]), r)
                    for r in raw["prescriptions"]),
                   unit="prescriptions", grain="event", detail_label="Medicine",
                   facets=[("route", "Delivery route", lambda r: delivery(r[5]))]))

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
for mrid, aid, dname, sev, when, prog, *_ in raw["diagnosis"]:
    a = aid or mr_animal.get(mrid)
    d = day_index(when)
    if a and d is not None and d >= TODAY_INDEX - 90:
        under_care.add(a)

FLAG_VACCINATED, FLAG_DEWORMED, FLAG_CARE = 1, 2, 4

# ── how an animal is told apart, and what stock it is ────────────────────────
#
# WHICH CHIP AND RING NUMBERS ARE NOT UNIQUE. A microchip that two animals share cannot
# identify either of them, and that is the single most useful thing this tab can say — but it
# is a fact about the WHOLE collection, not about one species, so the duplicate values have to
# be found in a pass over every housing row before any per-species walk can ask "is this one
# of them". Measured: 36,530 rows carry a chip across 36,103 distinct values, of which 362 are
# held by more than one animal id; 9,706 rows carry a ring across 9,570 values, 127 shared.
_chip_seen, _ring_seen = Counter(), Counter()
for r in raw["housing"]:
    if r[12]:
        _chip_seen[r[12]] += 1
    if r[13]:
        _ring_seen[r[13]] += 1
CHIP_DUP = {v for v, n in _chip_seen.items() if n > 1}
RING_DUP = {v for v, n in _ring_seen.items() if n > 1}

# A chip column that is filled but holds a recorded refusal rather than a number. THE LIST IS
# DELIBERATELY NARROW — only tokens that are literally a zero or a negation, matching 21 rows
# ('0' 18 · 'No chip' 2 · 'No' 1). A wider heuristic (anything without four consecutive digits)
# catches 56 rows but sweeps in 'TR 00-97BD4E46' and '4C9A064F3C', which are chip numbers in a
# vendor's own format and not refusals at all. This is reported BESIDE the filled count and
# never subtracted from it: the column being filled and the column being usable are two facts,
# and reconciling them here would hide the one the reader needs.
CHIP_VOID = {"0", "00", "000", "no", "none", "no chip", "nochip", "nil", "na", "n/a", "-", "--",
             "not applicable", "not available"}

ident_of = defaultdict(Counter)      # species slug → tallies, keyed by what was counted
ident_types = defaultdict(Counter)   # species slug → identifier_type → animals
breed_of = defaultdict(Counter)      # species slug → breed_name → animals
morph_of = defaultdict(Counter)      # species slug → morph_name → animals
reg_ids = defaultdict(set)           # species slug → the animal ids the register holds

register = []
for (aid, name, cls, gender, site, enc, section, acc_date, birth, acc_type, ident, weight,
     chip, ring, id_type, breed, morph) in raw["housing"]:
    if not site or site not in SITE_IX:
        discarded["housing:site"] += 1
        continue
    spx = SP_IX.get((site, name))
    if spx is None:
        discarded["housing:species"] += 1
        continue

    # Tallied HERE rather than in a second walk over housing, so that every denominator the
    # IDENTIFICATION and BREEDS tabs print is the same number `animals.bin` holds for that
    # species. A separate pass would count the 15 rows this loop discards and put a headcount
    # on the page that the animal list beneath it cannot reproduce.
    sl = slug(name)
    t = ident_of[sl]
    t["of"] += 1
    if aid:
        reg_ids[sl].add(aid)
    if chip:
        t["chip"] += 1
        if chip in CHIP_DUP:
            t["chipShared"] += 1
        if chip.strip().lower() in CHIP_VOID:
            t["chipVoid"] += 1
    if ring:
        t["ring"] += 1
        if ring in RING_DUP:
            t["ringShared"] += 1
    if id_type:
        t["identType"] += 1
        ident_types[sl][id_type] += 1
    if ident:
        t["identValue"] += 1
    if not (chip or ring or id_type):
        t["none"] += 1
    if breed:
        t["breed"] += 1
        breed_of[sl][breed] += 1
    if morph:
        t["morph"] += 1
        morph_of[sl][morph] += 1

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

# ── what the species page can now say about identification and stock ─────────
#
# PER SPECIES NAME ACROSS EVERY SITE, AND THE SHAPE FOLLOWS FROM THE PAGE. A species page is
# cross-site by construction — `core/profiles.ts` drops the site half of the species id and
# says why: "the same warbler at eleven sites has one biology, and holding eleven copies of it
# is how two of them come to disagree." Identification coverage is not biology, but it is asked
# the same way: a keeper opening Ochre Warbler wants to know how much of the collection's
# warbler holding can be told apart, not how much of it at one site.
#
# THESE GO IN `profiles.json`, NOT `dims.json`, and that is a measured decision rather than a
# filing preference. dims.json is fetched at boot by every page in the product and is 2.89 MB;
# profiles.json is fetched when the first species page opens and by nothing else. A coverage
# rollup that only a species page can render has no business on the home screen's load path.
#
# EVERY RATIO TRAVELS AS `[value, outOf]`. `Score` in core/profiles.ts already argues this for
# the welfare scores — "the denominator travels with the numerator, from the ETL, and no
# renderer may assume one" — and it matters more here, because the denominator is a different
# number for every species and a bar drawn against a fixed 100 would be nonsense on all of them.
#
# ZERO IS ABSENT, NOT PRESENT. A species with no ringed animals has no `ring` key at all, so
# the page renders no row for rings rather than a row reading "0 of 314", which reads as a
# finding when it is only a silence. This is the same rule PROFILES already applies to the
# reference columns.

def _ranked(counter):
    """A vocabulary as [[label, count], …], commonest first, ties broken alphabetically."""
    return [[k, n] for k, n in sorted(counter.items(), key=lambda kv: (-kv[1], kv[0]))]


def _profile(sl):
    """
    The profile object for a slug, CREATED IF THE REFERENCE TABLE HAS NO ROW FOR IT.

    108 names the collection actually holds have no `species` row at all, so `profileOf` has
    been returning undefined for them and every tab on those pages has had nothing to render.
    A holding fact is not reference biology and does not need one to be true — the register
    knows how many of them carry a chip whether or not anybody wrote down their gestation.
    """
    return PROFILES.setdefault(sl, {})


for sl, t in ident_of.items():
    of = t["of"]
    if not of:
        continue
    out = {"of": of}
    for k in ("chip", "ring", "identType", "identValue", "none"):
        if t[k]:
            out[k] = [t[k], of]
    for k in ("chipShared", "chipVoid", "ringShared"):
        if t[k]:
            out[k] = t[k]
    if ident_types[sl]:
        out["types"] = _ranked(ident_types[sl])
    _profile(sl)["identification"] = out

    stock = {"of": of}
    if t["breed"]:
        stock["withBreed"] = [t["breed"], of]
        stock["byBreed"] = _ranked(breed_of[sl])
    if t["morph"]:
        stock["withMorph"] = [t["morph"], of]
        stock["byMorph"] = _ranked(morph_of[sl])
    # A BREEDS BLOCK WITH NOTHING BUT A DENOMINATOR IS NOT A BLOCK. Breed is filled on 4,224 of
    # 110,020 housing rows and morph on 7,810, so the overwhelming majority of species have
    # neither — emitting `{of: 314}` for them would make the tab render a card that says
    # nothing, which the brief forbids more plainly than anything else in it.
    if len(stock) > 1:
        _profile(sl)["breeds"] = stock

# The two identification sources the extract does not reconcile, measured rather than assumed,
# so the page can cite the gap instead of picking a winner.
_chip_col = sum(1 for r in raw["housing"] if r[12])
_type_chip = sum(1 for r in raw["housing"] if r[14] == "Micro chip")
_both = sum(1 for r in raw["housing"] if r[14] == "Micro chip" and r[12])
_dup_ids = len(raw["housing"]) - len({r[0] for r in raw["housing"] if r[0]})

# ── assessments, rolled up per species name ──────────────────────────────────
#
# WHY A ROLLUP AND NOT AN EVENT BLOCK. Every other feed in this build compiles into
# `events.bin` because a metric is asked under a scope — a site, a window — and the block
# format carries five integer columns per row so that `tally` can walk them. Assessments do
# not fit it, and the reason is `assessment_value`: it is free text holding "3.135", "544",
# "Bored/Inactive" and a paragraph about a morning walk, and the block format has no column
# that can carry it. A flow block would therefore produce a tab that lists WHAT WAS ASSESSED
# and can never show WHAT WAS FOUND — 79,424 weights and 10,409 body condition scores would
# travel as bare counts. Summarised here against `response_type` and `uom`, the readings
# survive at the grain the species page actually asks them at.
#
# THE NUMERIC READINGS ARE SPLIT BY UNIT, NEVER POOLED. Weight is recorded in kilogram on
# 49,502 rows and gram on 34,584, in the same column, for the same assessment type. A mean
# over both is a number with no meaning — it would put a 940 g animal and a 3.1 kg animal in
# one average and report roughly 470. So a reading is keyed by (type, uom) and a species that
# was weighed in both units gets two rows saying so.

ASSESS_HELD = {slug(n) for n in HELD}

# The top of each scale, measured — because there is no declared one anywhere in the schema and
# the scales are NOT the same. Across the dump: Body Condition Score runs 1–5 (in half steps,
# 2,743 of them), Lively / Playful / Content / Sociable run to 10, Aggression and the musth
# observations to 3, Mahouts Command to 2. A renderer that assumed a common track would draw
# every one of them wrong, which is exactly the defect `Score` was introduced to prevent.
#
# WHAT `outOf` MEANS HERE, STATED SO NOBODY OVERREADS IT: the highest value recorded anywhere
# in the dump for that assessment type. It is a floor on the true scale, not the scale itself —
# 'Tense' was only ever recorded as 6 and its real ceiling is unknowable from this extract.
scale_top = defaultdict(float)
for r in raw["animal_assessments"]:
    if r[8] != "numeric_scale":
        continue
    try:
        scale_top[r[5]] = max(scale_top[r[5]], float(r[6]))
    except (TypeError, ValueError):
        pass

a_n = Counter()
a_cat, a_type, a_resp, a_stage, a_contra = (defaultdict(Counter) for _ in range(5))
a_month = defaultdict(Counter)
a_first, a_last = {}, {}
a_ids = defaultdict(set)
a_read = defaultdict(lambda: defaultdict(list))   # slug → (type, uom) → values

for (aid, name, site, when, cat, atype, val, uom, resp, stage, contra, enc, gender) in raw["animal_assessments"]:
    sl = slug(name) if name else None
    if not sl or sl not in ASSESS_HELD:
        discarded["assessments:species"] += 1
        continue
    d = day_index(when)
    if d is None:
        discarded["assessments:date"] += 1
        continue
    a_n[sl] += 1
    a_month[sl][when.strip()[:7]] += 1
    a_first[sl] = d if sl not in a_first else min(a_first[sl], d)
    a_last[sl] = d if sl not in a_last else max(a_last[sl], d)
    if aid:
        a_ids[sl].add(aid)
    if cat:
        a_cat[sl][cat] += 1
    if atype:
        a_type[sl][atype] += 1
    if resp:
        a_resp[sl][resp] += 1
    if stage:
        a_stage[sl][stage] += 1
    if contra:
        a_contra[sl][contra] += 1
    if atype and resp in ("numeric_value", "numeric_scale"):
        # PARSED BEFORE THE BUCKET IS TOUCHED, deliberately. `a_read[sl][key]` on a defaultdict
        # creates the list as a side effect of being read, so parsing inside the subscript
        # leaves an empty bucket behind for every unparseable value — and a (type, unit) pair
        # with no readings in it then reaches the summariser and asks it for min() of nothing.
        try:
            reading = float(val)
        except (TypeError, ValueError):
            reading = None
        if reading is not None:
            a_read[sl][(atype, uom or "", resp)].append(reading)

for sl, n in a_n.items():
    out = {"n": n, "first": a_first[sl], "last": a_last[sl]}

    # Assessed animals against the register's own count for this species. Both halves are
    # counted over the SAME set — ids that this species' register span holds — so the ratio
    # can never exceed one. Measured across the dump, all 25,752 assessed ids do appear in
    # housing, but they are not all filed under the name the assessment names them by, and a
    # coverage bar that read 112% because of that would destroy the page's credibility.
    of = ident_of[sl]["of"]
    if of:
        hit = len(a_ids[sl] & reg_ids[sl])
        if hit:
            out["assessed"] = [hit, of]
        # Assessed animals this species' register does NOT hold — the same animal id filed
        # under another common name, or an animal since departed. Stated rather than folded in.
        stray = len(a_ids[sl]) - hit
        if stray:
            out["strayIds"] = stray
    elif a_ids[sl]:
        out["animals"] = len(a_ids[sl])

    for key, counter in (("categories", a_cat), ("types", a_type), ("responses", a_resp),
                         ("stages", a_stage), ("contraception", a_contra)):
        if counter[sl]:
            out[key] = _ranked(counter[sl])

    # The volume series, sparse and by calendar month. Sparse because most species were
    # assessed in a handful of months and a dense 77-month array per species would be 89,000
    # zeroes across the file to carry 23,000 readings. By month rather than by day because the
    # tab draws a trend, and a per-day series for 1,153 species is the whole of events.bin
    # again in JSON.
    out["months"] = dict(sorted(a_month[sl].items()))

    readings = []
    for (atype, uom, resp), vals in sorted(a_read[sl].items(), key=lambda kv: (-len(kv[1]), kv[0])):
        r = {"type": atype, "n": len(vals), "lo": round(min(vals), 3), "hi": round(max(vals), 3)}
        mean = round(sum(vals) / len(vals), 3)
        if resp == "numeric_scale" and scale_top.get(atype):
            # A SCORE, SO THE SCALE TRAVELS WITH IT. See the note on `scale_top` above for what
            # the denominator is and, more importantly, what it is not.
            r["mean"] = [mean, round(scale_top[atype], 3)]
        else:
            r["mean"] = mean
        if uom:
            r["uom"] = uom
        readings.append(r)
    if readings:
        out["readings"] = readings

    _profile(sl)["assessments"] = out

print(f"  identification {len(ident_of)} species · breeds {sum(1 for p in PROFILES.values() if 'breeds' in p)}"
      f" · assessments {len(a_n)} species over {sum(a_n.values()):,} readings", file=sys.stderr)

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
            # THE PAGE MUST BE ABLE TO CITE THIS GAP RATHER THAN ASSERT ONE NUMBER. Two columns
            # in `housing` both claim to say whether an animal is chipped and they do not agree,
            # so the note carries both counts and their overlap and reconciles nothing.
            "identification": (
                f"micro_chip is filled on {_chip_col:,} housing rows and identifier_type='Micro chip' "
                f"on {_type_chip:,}, overlapping on {_both:,}; both are reported and neither is "
                f"reconciled. {_dup_ids:,} rows repeat an antz_animal_id already used, so a count of "
                "rows and a count of animals are not the same number."
            ),
            "assessments": (
                "per species name across all sites, in profiles.json — assessment_value is free "
                "text and cannot travel in an event block, so numeric readings are summarised by "
                "(assessment type, unit) and never pooled across units. A reading's outOf is the "
                "highest value recorded anywhere in the dump for that assessment type; the schema "
                "declares no scale, so it is a floor on the real one rather than the real one."
            ),
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

# ── profiles, in their own file ──────────────────────────────────────────────
#
# NOT IN `dims.json`, and the reason is a measurement rather than tidiness: folded in, dims
# went 2.89 MB → 8.67 MB, and dims is read at boot by every page in the product. Six extra
# megabytes on the home screen to carry reference biology that only a species page can show
# is the whole cost with none of the benefit.
#
# It can be a separate fetch precisely BECAUSE it is not a metric. `core/query.ts` is
# synchronous so that two figures on one screen can never be from two different scopes for a
# frame; a species' incubation period is not scoped and cannot disagree with anything, so
# fetching it when a species page opens breaks no invariant that layer holds.
with open(os.path.join(OUT, "profiles.json"), "w") as fh:
    json.dump(PROFILES, fh, separators=(",", ":"))

print(f"\nwrote {OUT}", file=sys.stderr)
print(f"  dims.json    {os.path.getsize(os.path.join(OUT,'dims.json'))/1e6:.2f} MB", file=sys.stderr)
print(f"  events.bin   {os.path.getsize(os.path.join(OUT,'events.bin'))/1e6:.2f} MB", file=sys.stderr)
print(f"  levels.bin   {os.path.getsize(os.path.join(OUT,'levels.bin'))/1e6:.2f} MB", file=sys.stderr)
print(f"  animals.bin  {os.path.getsize(os.path.join(OUT,'animals.bin'))/1e6:.2f} MB", file=sys.stderr)
print(f"  profiles.json {os.path.getsize(os.path.join(OUT,'profiles.json'))/1e6:.2f} MB", file=sys.stderr)
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
