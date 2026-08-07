# ANTZ Command Centre — V4

An **Executive Wildlife Command Centre**, not an analytics dashboard.

The readers are the Chairman, the CEO, the Zoo Director, the Curator and senior
management. The home screen has ten seconds to answer five questions:

1. What is the overall zoo health?
2. What needs my attention?
3. What approvals are waiting on me?
4. What is due soon?
5. Are we improving?

Everything else on the home screen is out of scope by design.

## What changed from V3

V3's home screen was the monthly board report's table of contents rendered as cards —
population, life events, veterinary, preventive care, movement, trends. That is the
right shape for *reading a report* and the wrong shape for the ten seconds between
meetings: "45 births" is a fact, not a decision.

V4 keeps the entire design language — the sage ground, the white `rounded-[16px]`
cards, DM Sans with rounded numerals, the single accent, the 12px rhythm, the
reveal-on-scroll motion — and every mark on the home screen is a component from
`src/exec/system.tsx`. Nothing was redesigned. What changed is **what the home screen
is**: seven executive sections instead of twenty module doors, with the modules
reached from the sidebar, from search, and from the foot of every sheet.

## The home screen

| # | Section | Answers |
|---|---------|---------|
| — | Zoo Health hero | overall health, as one composite of four weighted parts |
| 1 | Executive KPIs | ten numbers, minimal labels, no charts |
| 2 | Critical Alerts | the ten queues that can start a phone call today |
| 3 | Needs My Approval | six decision types, each with Approve / Reject |
| 4 | Upcoming | nine date-driven groups under a 7 / 30-day switch |
| 5 | Executive Health | six board measures, each against its stated target |
| 6 | Risk Indicators | seven exposures, named and sized — no suggestions |
| 7 | Trends | eight twelve-month series as compact sparklines |

## Two layers: routes and sheets

**Routes are places.** The home and the twenty module pages each have a URL.

**Sheets are looks at things.** Tapping any card on the home opens a sheet — a bottom
sheet on a phone, a side sheet on tablet and desktop — and closing it returns you
exactly where you were. This is the brief's "never navigate unnecessarily".

A sheet nests to any depth without stacking panels: the sheet stays put and its
content swaps, with a back chevron and a breadcrumb in the eyebrow. Each level pushes
a history entry carrying its own depth, so the browser/Android back button, Escape,
the chevron and swipe-down are all one behaviour.

### The drill: Overall → Site → Species → Animal

Four levels, and no fifth. The animal record is the bottom — everything below it
(samples, doses, keeper notes) is the working screen of the person who owns the
animal, not the executive question that opened the drill.

Site totals come from `src/exec/sites.ts` untouched, where Overall is defined as the
sum of its rows rather than authored. Species and animal rows are **derived** from
those totals by weighted apportionment, so a species split always sums to its site and
a site split always sums to Overall, at every reporting window, by construction.
Per-animal attributes come from a seeded hash of the animal's own id, so a given
animal reads identically on every visit without a row being stored.

## Responsive

Three tiers. The boundary is one number shared by the shell and the sheet, so the
sidebar and the sheet geometry can never disagree about which tier the app is in.

| Tier | Width | Layout | Sheets |
|------|-------|--------|--------|
| Phone | `< 768px` | single column, one scroll; modules are pages with a back chevron | bottom sheet, swipe-down to dismiss |
| Tablet | `768–1279px` | permanent sidebar + content; 2-column grids | side sheet from the right |
| Desktop | `≥ 1280px` | sidebar + content + executive panel | side sheet from the right |

**Sizes are keyed to the content column, not the window** (`@container` in
`src/index.css`). This is load-bearing: a 1280px desktop hands the content column
~600px once the rail and the panel take their share, while a 1194px tablet landscape
hands it ~900px. Sizing off the window would put desktop type into the narrower of the
two columns.

## Stack

- React 19 + TypeScript + Vite 7
- Tailwind CSS v4 — design tokens in `@theme`, responsive scale in `:root` /
  `@container` (`src/index.css`)
- DM Sans Variable + Nunito Variable (self-hosted via Fontsource); SF Pro Rounded for
  numerals where the OS has it

## Run

```sh
npm install
npm run dev      # http://localhost:5202  — V4 owns 5202, V1 5199, V2 5200, V3 5201
npm run build    # typecheck + production build
```

## Structure

```
src/
  App.tsx                 # routes + the two layouts (phone / shell)
  index.css               # design tokens, responsive scale, motion
  motion.tsx              # Reveal, AnimatedValue, CountUp, usePlay
  hooks/                  # useNow, useCountUp, useInView, useTween, useMediaQuery
  v4/
    data.ts               # the executive model — KPIs, alerts, approvals,
                          #   upcoming, health measures, risks, trends
    drill.ts              # Overall → Site → Species → Animal derivation
    sheet.tsx             # the responsive, nestable sheet + history integration
    Home.tsx              # the seven sections
    panels.tsx            # what goes inside a sheet
    Shell.tsx             # sidebar + content + executive panel; phone module page
    Sidebar.tsx           # permanent module rail (tablet and up)
    ExecPanel.tsx         # desktop right rail — queues derived from the same data
    Settings.tsx          # settings, as a sheet
    nav.ts                # module list + executive renaming, derived from execPages
    search.tsx            # global module search
  exec/
    system.tsx            # THE DESIGN SYSTEM — every card, mark and figure
    pages/                # 20 hand-composed module pages, one per module
    records.tsx           # the record tier under a module page
    sites.ts              # the six sites and every module's split across them
    period.ts(x)          # the five reporting windows and the switcher
```

## Modules

Every module keeps its own dedicated, hand-composed page — no two share a layout.

**Named in the brief:** Animals, Health, Natality, Mortality, Transfers, Vaccination,
Deworming, Lab, Approvals, Attendance, Tasks, Alerts, Welfare.

**Report detail:** Accession, Eggs & Incubation, Eggs Discarded, Fetal Death, Disease,
Preventive, Trends.
