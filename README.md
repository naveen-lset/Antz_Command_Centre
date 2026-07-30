# ANTZ Command Centre

Flagship executive home screen for the ANTZ Wildlife Management Platform — a calm,
data-first operational control centre that answers "How is my zoo today?" in seconds.

Implemented from the Figma design
[Antz Command Center · node 188-70](https://www.figma.com/design/WvxVp4VXLXD5JwMFlYehjR/Antz-Command-Center?node-id=188-70).

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (design tokens declared in `@theme`, `src/index.css`)
- Inter Variable + Space Grotesk Variable (self-hosted via Fontsource)

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## Structure

```
src/
  data.ts                 # Typed Command Centre snapshot (demo data → API payload)
  index.css               # MD3_Antz design tokens, motion, utilities
  hooks/
    useNow.ts             # Live clock + time-of-day greeting
    useCountUp.ts         # Metric count-up (respects prefers-reduced-motion)
  components/
    TopBar.tsx            # Fixed brand bar: logo, live date/time
    HeroHeader.tsx        # Wildlife hero + greeting
    WeatherCard.tsx       # Site weather summary
    PopulationCard.tsx    # Flagship KPI: population + M/F/U split
    MiniStatCard.tsx      # Compact KPI with tiny bar sparkline
    ModuleRow.tsx         # Module summary row (Health & Medical, Eggs)
    ApprovalsCard.tsx     # Pending approvals, reviewers, progress ring
    QuickActions.tsx      # Horizontal module shortcuts
```

## Drill-down pages

Every card on the home screen opens a module analytics page at `#/<slug>`:

| Route | Module | Route | Module |
| --- | --- | --- | --- |
| `#/animals` | Animals | `#/lab` | Lab Requests |
| `#/health` | Health & Medical | `#/welfare` | Animal Welfare |
| `#/births` | Birth Analytics | `#/approvals` | Approvals |
| `#/eggs` | Eggs & Incubation | `#/tasks` | Tasks |
| `#/mortality` | Mortality | `#/attendance` | Staff Attendance |
| `#/transfers` | Transfers | `#/alerts` | Alerts |
| `#/vaccination` | Vaccination | `#/deworming` | Deworming |

```
src/detail/
  model.ts        # Section vocabulary — the shared page grammar
  charts.tsx      # AreaTrend, Columns, BarRows, ShareBar, Meter, MiniArea, Ring
  motion.tsx      # Reveal, AnimatedValue, usePlay, useScrolledPast
  DetailPage.tsx  # One renderer for all 14 pages (shell + section switch)
  pages/          # Per-module content: animals, breeding, medical, operations
```

### Motion

One easing family (`cubic-bezier(0.22, 1, 0.36, 1)`), nothing over a second, and
every animation explains something rather than decorating:

| Moment | What moves |
| --- | --- |
| Sheet open | Slides up over the home screen behind a scrim; hero figure settles in and counts up; label/sub/status and the header stagger behind it |
| Sheet close | Slides back down; drag the grabber and it tracks the finger, springing back under 110px and dismissing past it |
| Card arrives | Fades up on first scroll into view (`Reveal`), grids staggering 60–80ms per child |
| Marks | Lines draw left→right (`pathLength={1}` + dashoffset), area washes up from the baseline, bars grow from their baseline, share segments grow left→right, arcs sweep 0→target |
| Every number | Counts to its target — hero, tiles, bar rows, share values *and* their percentages, arc labels, the trend readout, the column label. `AnimatedValue` keeps prefix/suffix ("1.4 d", "0.011%", "243 / 312"); `CountUp` takes its trigger from the parent so a value lands with its own mark |
| Range chips | Segmented control with an indicator that slides and resizes between segments; picking one zooms the series to a real trailing window (`points`) and the line redraws |
| Tabs | Bars re-grow and re-count into the new dimension |
| Module switch | Content slides in from the right inside the open sheet and every reveal replays |
| Scroll | Hero sinks, dims and scales as it leaves, handing off to the header eyebrow collapsing to the hero figure; a hairline under the bar tracks reading depth |
| Scrub | Crosshair dot glides between samples (and the readout stops counting so it tracks the finger exactly) |

Two rules the numbers follow, both learned the hard way: a tween is **snapped to its
target's precision** (an un-snapped one prints `54,852.757` animals), and staggered
rows **all start together and finish in cascade order** — a row held at `0` while its
neighbours count reads as a real zero, not as motion.

Charts animate off their own `IntersectionObserver`, so a chart never plays while
off-screen. Everything collapses under `prefers-reduced-motion` — CSS animations
via the global media query, the JS tweens via explicit guards in `motion.tsx`.

The pages speak the home screen's UI language exactly — same warm canvas gradient,
same floating white `rounded-[24px]` cards, 15px card titles, 30px values, the same
dashed `ArcGauge` and tinted icon chips. Only the accent hue changes per module.

All fourteen follow the same flow so the product feels like one thing:
hero KPI → trend → quick summary → category breakdown → distribution →
performance → recent activity → AI insight → quick actions. Each page carries a
single accent hue; multi-category series are lightness steps of that one hue with
direct labels, never cycled categorical colors. Adding a module means adding one
file under `pages/` and one entry in `pages/index.ts` — no new components.

## Design system notes

- Palette comes from the Figma `MD3_Antz` variables (`--color-antz-*` tokens).
- Every card is tappable (`onPress`) and ready to route to its drill-down page;
  the home screen stays lightweight — detailed analytics belong in drill-downs.
- Motion is deliberately calm: 250ms-class easing, staggered section reveal,
  metric count-up, sparkline rise — all disabled under `prefers-reduced-motion`.
- The mobile canvas is fluid up to 430px and centred on larger viewports.

## Known design-inherited issue

The classic concept's white-on-teal KPI text (Natality card, `#00d6c9`) measures
1.83:1 contrast — a WCAG failure inherited from the Figma design itself, kept
here for pixel fidelity. Flagged for a design-side decision (darker text token
or darker card fill) rather than silently deviating from the source design.
