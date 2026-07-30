# ANTZ Command Centre — UI Plan

The home screen answers **"How is my zoo today?"** in one vertical scroll.
No AI-generated content — every element is real operational data.

Three concepts ship in the app:

| Route | Concept |
|---|---|
| `/` (default) | **Overview** — warm editorial aesthetic (below) |
| `#/feed` | Feed — white/monochrome single-scroll report sections |
| `#/classic` | Classic — pixel-faithful Figma screen |

## 0. Overview concept (default route)

Warm neutral canvas (`#F7F6F3 → #EFEDE9`), white 24px-radius cards, Space
Grotesk display numerals, Inter everywhere else.

No section labels — hierarchy comes from size and order alone.

```
Thursday — Good Afternoon, Subhash   ← caption (page opens here)
30.07     │ 14:08  Jamnagar          ← editorial date block, live clock
JUL       │ 24°    Partly cloudy
         215,432                     ← giant centered hero
         Animals · ▲ +324
[Natality 45 ▪▪▪] [Mortality 23 ∿]   ← THE headline pair (38px numbers,
                                        dot-bars / pulse line micro-viz)
[⌖ Sites 6]   [👥 On Duty 312]       ← compact stat strip
[Eggs 21 ▪▪▪]  [Alerts 5 ∿]          ← secondary 2-up cards
[Animal Welfare Score      4.6/5]    ← full-width score row
[Health & Medical  123  −9 this wk]  ← stacked module cards,
[Approvals 12      ◠ 70% arc gauge]     big number + note / gauge
[Tasks 13 of 21    Almost there   ]
[Vaccination 92%   +128 this month]
```

Micro-viz rules stay the same as §4: one accent per card, marks only,
text in ink tokens. The coral (`#E0684B`) dot-bar accent is
contrast-validated on white.

---

The sections below describe the **Feed** concept (`#/feed`).

## 1. Screen map

```
┌──────────────────────────────────────┐
│ 1  GREETING HEADER          (static) │  Good Afternoon, / Subhash
│    date · time / site / weather      │  live clock, "Updated n min ago"
├──────────────────────────────────────┤
│ 2  STICKY BAR            (pins top)  │  appears compact after scroll:
│    [Subhash — site        12:34]     │  · identity row (fades in)
│    [🔍 search field             ]    │  · universal search (filters modules)
│    [Today|Week|Month] | [chips…]     │  · range control + section chips
├──────────────────────────────────────┤
│ 3  MODULE SECTIONS  (19, uniform)    │  hairline-divided report blocks
│    …                                 │
├──────────────────────────────────────┤
│ 4  FOOTER                            │  link to classic Figma concept
└──────────────────────────────────────┘
```

Section order: Animals · Health & Medical · Births · Eggs & Incubation ·
Mortality · Transfers · Vaccination · Deworming · Lab Requests · Animal
Welfare · Enclosure Assessments · Approvals · Tasks · Staff Attendance ·
Alerts · Announcements · IoT Devices · Weather · Recent Activity.

## 2. Section anatomy (identical for every module)

```
┌ section (px-20, py-24, border-b hairline) ─────────────┐
│ [icon 18] Title 18/med        ● status 12    ⌄ chevron │  ← header row
│                                                        │
│ 215,432  (34/semibold)                     ╱╲___╱▔ ●   │  ← metric + sparkline
│ label 13/ink-2                                         │
│ ↗ +324 this month (13/med, status color)               │  ← delta
│ ── expanded (inline, 300ms) ─────────────────────────  │
│   SPLIT BAR      one-hue steps + labels                │
│   STAT GRID      2-col, 20/semibold values             │
│   METER          accent fill on light track            │
│   BREAKDOWN      label · value · thin proportion bar   │
│   ACTIVITY       time 12/tabular · event 13            │
│   [action chips]        View complete analytics →      │
└────────────────────────────────────────────────────────┘
```

Collapsed = header + metric + label + delta + sparkline only.
Tap anywhere on the summary to expand inline; nothing navigates away.
Expanded content mounts lazily (performance) and each module supplies only
the blocks it needs — the anatomy order never changes.

## 3. Type scale

| Role            | Size / weight        | Token    |
|-----------------|----------------------|----------|
| Greeting name   | 34 / bold, display   | ink      |
| Section metric  | 34 / semibold        | ink      |
| Section title   | 18 / medium          | ink      |
| Stat value      | 20 / semibold        | ink      |
| Body / labels   | 13 / regular–medium  | ink-2    |
| Captions, times | 12 / regular         | ink-3    |

Numbers use proportional figures at display size; `tabular-nums` only in the
activity-feed time column.

## 4. Color rules

- Surfaces: white; page gutter `#F8F9FA`; hairlines `#ECECEC`.
- One accent hue per module (green animals, red medical, orange births, amber
  eggs, blue transfers, purple approvals, crimson alerts, sky weather, indigo
  attendance) — used only on marks: sparkline current period, proportion
  bars, meter fills. **Text never wears the data color.**
- Status is a reserved trio (good / warn / critical) shown as dot + text.
- Multi-part visuals (sex split) use lightness steps of one hue + neutral
  gray, separated by 2px surface gaps, always direct-labeled.

## 5. Interaction & motion

- Expansion: grid-rows 0fr→1fr, 300ms `cubic-bezier(0.22,1,0.36,1)`;
  details fade/slide 8px; metric scales 1.04.
- Sparkline draws in on first scroll into view; metric counts up once.
- Chips smooth-scroll to sections; scrollspy highlights the active chip.
- Everything honours `prefers-reduced-motion`.

## 6. Data contract

The page renders from one typed snapshot (`src/v2/data.ts`) shaped like a
single lightweight home endpoint; detailed analytics belong to the
"View complete analytics" drill-downs, loaded only on entry.
