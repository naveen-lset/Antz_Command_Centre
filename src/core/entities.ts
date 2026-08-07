/**
 * ENTITY RESOLUTION — one function that turns `(kind, id)` into a thing with a name, a
 * parent and a site.
 *
 * WHY THE PRODUCT NEEDS THIS TO BE ONE FUNCTION. The requirement is that every module is
 * "simply another entry point to these entities". That only holds if an entity has an
 * identity independent of the module that showed it to you — otherwise Aquatic Halls
 * reached from Mortality and Aquatic Halls reached from Lab are two different screens that
 * happen to share a name, which is exactly what the product did before.
 *
 * So: entities have ids, ids appear in routes, and a route is resolvable without knowing
 * which module the reader came from. `#/e/animal/ANM-AQ03-00142` means the same animal
 * forever, and the breadcrumb above it is computed by walking `parent` rather than by the
 * caller remembering the trail it came down.
 *
 * `parent` is what makes the walk possible, and it is deliberately a single link rather
 * than a stored path: an animal's parent is its species, whose parent is its site, whose
 * parent is the collection. One chain, no duplication, and no way for a breadcrumb to
 * claim a lineage the data does not have.
 */

import { animalById, animalTitle, stockOfSpecies } from './animals'
import type { Win } from './calendar'
import {
  DEPARTMENTS,
  ENCLOSURES,
  HOSPITALS,
  INCUBATORS,
  LABS,
  LAB_DEPARTMENTS,
  MEDICINES,
  NURSERIES,
  PHARMACIES,
  SITES,
  SPECIES,
  USERS,
  WARDS,
  departmentOf,
  enclosuresOf,
  hospitalOf,
  incubatorOf,
  incubatorsOf,
  labDepartmentOf,
  labDepartmentsOf,
  labOf,
  medicineOf,
  nurseryOf,
  pharmacyOf,
  siteOf,
  speciesIn,
  speciesOf,
  userOf,
  usersIn,
  wardOf,
  wardsOf,
} from './world'

export type EntityKind =
  | 'site'
  | 'species'
  | 'animal'
  | 'enclosure'
  | 'hospital'
  | 'ward'
  | 'lab'
  | 'labdept'
  | 'pharmacy'
  | 'medicine'
  | 'nursery'
  | 'incubator'
  | 'department'
  | 'user'

export interface Ref {
  kind: EntityKind
  id: string
}

export interface Entity extends Ref {
  name: string
  /** One short line under the name. Never a sentence. */
  sub?: string
  /** The site this entity belongs to, where it belongs to exactly one. */
  siteKey?: string | null
  /** The entity one level up. Absent at the top of a hierarchy. */
  parent?: Ref
}

/** Plural label for a kind — the heading over a list of them. */
export const KIND_LABEL: Record<EntityKind, string> = {
  site: 'Sites',
  species: 'Species',
  animal: 'Animals',
  enclosure: 'Enclosures',
  hospital: 'Hospitals',
  ward: 'Wards',
  lab: 'Laboratories',
  labdept: 'Departments',
  pharmacy: 'Pharmacies',
  medicine: 'Medicines',
  nursery: 'Nurseries',
  incubator: 'Incubators',
  department: 'Departments',
  user: 'Users',
}

/** Singular label — what one row is. */
export const KIND_ONE: Record<EntityKind, string> = {
  site: 'Site',
  species: 'Species',
  animal: 'Animal',
  enclosure: 'Enclosure',
  hospital: 'Hospital',
  ward: 'Ward',
  lab: 'Laboratory',
  labdept: 'Lab department',
  pharmacy: 'Pharmacy',
  medicine: 'Medicine',
  nursery: 'Nursery',
  incubator: 'Incubator',
  department: 'Department',
  user: 'User',
}

/* ── resolution ──────────────────────────────────────────────────────────── */

export function resolve(kind: EntityKind, id: string): Entity | undefined {
  switch (kind) {
    case 'site': {
      const s = siteOf(id)
      return s && { kind, id, name: s.name, sub: `${s.code} · ${s.enclosures} enclosures`, siteKey: s.key }
    }

    case 'species': {
      const sp = speciesOf(id)
      if (!sp) return undefined
      return {
        kind,
        id,
        name: sp.name,
        sub: `${sp.cls} · ${siteOf(sp.siteKey)?.name ?? sp.siteKey}`,
        siteKey: sp.siteKey,
        parent: { kind: 'site', id: sp.siteKey },
      }
    }

    case 'animal': {
      const a = animalById(id)
      if (!a) return undefined
      return {
        kind,
        id: a.id,
        name: animalTitle(a),
        sub: `${a.id} · ${a.enclosureId}`,
        siteKey: a.siteKey,
        parent: { kind: 'species', id: a.speciesId },
      }
    }

    case 'enclosure': {
      const e = ENCLOSURES.find((x) => x.id === id)
      return e && { kind, id, name: e.name, sub: `${e.kind} · capacity ${e.capacity}`, siteKey: e.siteKey, parent: { kind: 'site', id: e.siteKey } }
    }

    case 'hospital': {
      const h = hospitalOf(id)
      return h && { kind, id, name: h.name, sub: `${h.code} · ${h.beds} beds`, siteKey: h.siteKey }
    }

    case 'ward': {
      const w = wardOf(id)
      if (!w) return undefined
      const h = hospitalOf(w.hospitalId)
      return {
        kind,
        id,
        name: w.name,
        sub: `${w.kind} · ${w.beds} beds`,
        siteKey: h?.siteKey ?? null,
        parent: { kind: 'hospital', id: w.hospitalId },
      }
    }

    case 'lab': {
      const l = labOf(id)
      return l && { kind, id, name: l.name, sub: l.code, siteKey: l.siteKey }
    }

    case 'labdept': {
      const d = labDepartmentOf(id)
      if (!d) return undefined
      return {
        kind,
        id,
        name: d.name,
        sub: `${d.turnaround}-day turnaround`,
        siteKey: labOf(d.labId)?.siteKey ?? null,
        parent: { kind: 'lab', id: d.labId },
      }
    }

    case 'pharmacy': {
      const p = pharmacyOf(id)
      if (!p) return undefined
      return {
        kind,
        id,
        name: p.name,
        sub: p.central ? 'Central store · supplies every site' : 'Site dispensary',
        siteKey: p.siteKey,
        parent: p.central ? undefined : { kind: 'pharmacy', id: 'central' },
      }
    }

    case 'medicine': {
      const m = medicineOf(id)
      return m && { kind, id, name: m.name, sub: `${m.category} · per ${m.unit}`, siteKey: null }
    }

    case 'nursery': {
      const n = nurseryOf(id)
      return n && { kind, id, name: n.name, sub: siteOf(n.siteKey)?.name, siteKey: n.siteKey, parent: { kind: 'site', id: n.siteKey } }
    }

    case 'incubator': {
      const i = incubatorOf(id)
      if (!i) return undefined
      return {
        kind,
        id,
        name: i.name,
        sub: `${i.trays} trays · ${i.tempC}°C`,
        siteKey: nurseryOf(i.nurseryId)?.siteKey ?? null,
        parent: { kind: 'nursery', id: i.nurseryId },
      }
    }

    case 'department': {
      const d = departmentOf(id)
      return d && { kind, id, name: d.name, sub: `${usersIn(undefined, id).length} staff`, siteKey: null }
    }

    case 'user': {
      const u = userOf(id)
      if (!u) return undefined
      return {
        kind,
        id,
        name: u.name,
        sub: `${u.role} · ${departmentOf(u.departmentId)?.name ?? u.departmentId}`,
        siteKey: u.siteKey,
        parent: { kind: 'department', id: u.departmentId },
      }
    }
  }
}

/**
 * The chain from an entity up to the collection, oldest ancestor first.
 *
 * Capped at eight links purely as a cycle guard — the hierarchies are all four deep or
 * fewer, so hitting the cap means a `parent` has been wired wrongly and the breadcrumb
 * should end rather than loop.
 */
export function lineage(ref: Ref): Entity[] {
  const out: Entity[] = []
  let at: Ref | undefined = ref
  for (let i = 0; at && i < 8; i++) {
    const e = resolve(at.kind, at.id)
    if (!e) break
    out.unshift(e)
    at = e.parent
  }
  return out
}

/* ── children ────────────────────────────────────────────────────────────── */

export interface ChildGroup {
  kind: EntityKind
  label: string
  items: Entity[]
  /** Real count, when `items` is a page of a larger set. */
  total?: number
}

const asEntities = (kind: EntityKind, ids: string[]): Entity[] =>
  ids.map((id) => resolve(kind, id)).filter((e): e is Entity => Boolean(e))

/**
 * What sits under an entity, grouped by kind.
 *
 * A site has species, enclosures, hospitals, nurseries and staff under it — five different
 * kinds, which is why this returns groups rather than a flat list. `win` is needed because
 * a species with no animals in the current scope should not be offered as somewhere to go.
 */
export function children(ref: Ref, win: Win): ChildGroup[] {
  switch (ref.kind) {
    case 'site': {
      const species = speciesIn(ref.id)
        .map((sp) => ({ sp, count: stockOfSpecies(sp.id, win) }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count)
      const groups: ChildGroup[] = [
        { kind: 'species', label: 'Species', items: asEntities('species', species.map((r) => r.sp.id)), total: species.length },
        { kind: 'enclosure', label: 'Enclosures', items: asEntities('enclosure', enclosuresOf(ref.id).map((e) => e.id)) },
        { kind: 'hospital', label: 'Hospitals', items: asEntities('hospital', HOSPITALS.filter((h) => h.siteKey === ref.id).map((h) => h.id)) },
        { kind: 'nursery', label: 'Nurseries', items: asEntities('nursery', NURSERIES.filter((n) => n.siteKey === ref.id).map((n) => n.id)) },
      ]
      return groups.filter((g) => g.items.length > 0)
    }

    case 'hospital':
      return [{ kind: 'ward', label: 'Wards', items: asEntities('ward', wardsOf(ref.id).map((w) => w.id)) }]

    case 'lab':
      return [{ kind: 'labdept', label: 'Departments', items: asEntities('labdept', labDepartmentsOf(ref.id).map((d) => d.id)) }]

    case 'nursery':
      return [{ kind: 'incubator', label: 'Incubators', items: asEntities('incubator', incubatorsOf(ref.id).map((i) => i.id)) }]

    case 'pharmacy':
      return pharmacyOf(ref.id)?.central
        ? [{ kind: 'pharmacy', label: 'Site pharmacies', items: asEntities('pharmacy', PHARMACIES.filter((p) => !p.central).map((p) => p.id)) }]
        : [{ kind: 'medicine', label: 'Medicines', items: asEntities('medicine', MEDICINES.map((m) => m.id)) }]

    case 'department':
      return [{ kind: 'user', label: 'Staff', items: asEntities('user', usersIn(undefined, ref.id).slice(0, 40).map((u) => u.id)), total: usersIn(undefined, ref.id).length }]

    /* Species children are animals, and a species can hold twelve thousand of them —
       paging belongs to the page that shows them, not to a function that returns an array. */
    default:
      return []
  }
}

/* ── top-level listings, for the entity index ─────────────────────────────── */

/** Every kind that can be browsed from the top, and how many there are. */
export const ROOTS: { kind: EntityKind; count: number }[] = [
  { kind: 'site', count: SITES.length },
  { kind: 'species', count: new Set(SPECIES.map((s) => s.name)).size },
  { kind: 'enclosure', count: ENCLOSURES.length },
  { kind: 'hospital', count: HOSPITALS.length },
  { kind: 'ward', count: WARDS.length },
  { kind: 'lab', count: LABS.length },
  { kind: 'labdept', count: LAB_DEPARTMENTS.length },
  { kind: 'pharmacy', count: PHARMACIES.length },
  { kind: 'medicine', count: MEDICINES.length },
  { kind: 'nursery', count: NURSERIES.length },
  { kind: 'incubator', count: INCUBATORS.length },
  { kind: 'department', count: DEPARTMENTS.length },
  { kind: 'user', count: USERS.length },
]

/** Everything of one kind, optionally narrowed to the site scope in force. */
export function listOf(kind: EntityKind, siteKey: string | null): Entity[] {
  const within = (s?: string | null) => !siteKey || !s || s === siteKey

  switch (kind) {
    case 'site':
      return asEntities('site', SITES.filter((s) => within(s.key)).map((s) => s.key))
    case 'species':
      return asEntities('species', SPECIES.filter((s) => within(s.siteKey)).map((s) => s.id))
    case 'enclosure':
      return asEntities('enclosure', ENCLOSURES.filter((e) => within(e.siteKey)).map((e) => e.id))
    case 'hospital':
      return asEntities('hospital', HOSPITALS.filter((h) => within(h.siteKey)).map((h) => h.id))
    case 'ward':
      return asEntities('ward', WARDS.filter((w) => within(hospitalOf(w.hospitalId)?.siteKey)).map((w) => w.id))
    case 'lab':
      return asEntities('lab', LABS.filter((l) => within(l.siteKey)).map((l) => l.id))
    case 'labdept':
      return asEntities('labdept', LAB_DEPARTMENTS.filter((d) => within(labOf(d.labId)?.siteKey)).map((d) => d.id))
    case 'pharmacy':
      return asEntities('pharmacy', PHARMACIES.filter((p) => p.central || within(p.siteKey)).map((p) => p.id))
    case 'medicine':
      return asEntities('medicine', MEDICINES.map((m) => m.id))
    case 'nursery':
      return asEntities('nursery', NURSERIES.filter((n) => within(n.siteKey)).map((n) => n.id))
    case 'incubator':
      return asEntities('incubator', INCUBATORS.filter((i) => within(nurseryOf(i.nurseryId)?.siteKey)).map((i) => i.id))
    case 'department':
      return asEntities('department', DEPARTMENTS.map((d) => d.id))
    case 'user':
      return asEntities('user', USERS.filter((u) => within(u.siteKey)).map((u) => u.id))
    default:
      return []
  }
}

/** Free-text over every entity except animals, which have their own scan. */
export function searchEntities(query: string, siteKey: string | null, limit = 10): Entity[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const kinds: EntityKind[] = [
    'site', 'species', 'hospital', 'ward', 'lab', 'labdept',
    'pharmacy', 'medicine', 'nursery', 'incubator', 'department', 'user', 'enclosure',
  ]
  const out: Entity[] = []
  for (const kind of kinds) {
    for (const e of listOf(kind, siteKey)) {
      if (out.length >= limit) return out
      if (e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) out.push(e)
    }
  }
  return out
}
