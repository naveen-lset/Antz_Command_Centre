# ANTZ Command Centre → Figma

Rebuilds the running app as an **editable, layered Figma design** — real auto-layout
frames, real vector charts, real text nodes. No PNG rendering, no flattened images.

The app's 14 detail pages are one data-driven renderer ([`DetailPage.tsx`](../../src/detail/DetailPage.tsx)),
so this mirrors that architecture: one Figma builder + the extracted page data, rather
than 14 hand-placed screens. Change the app, re-run, get an updated design.

## Run — Figma plugin (the working path)

```bash
node tools/figma/extract-data.mjs    # app data → antz-data.json   (14 pages, 115 sections)
node tools/figma/extract-icons.mjs   # lucide   → antz-icons.json  (36 icons, real geometry)
node tools/figma/build-plugin.mjs    # bundle   → plugin/{manifest.json,code.js}
node tools/figma/dryrun-plugin.mjs   # verify against a real-shaped Plugin API mock
```

Then in **Figma desktop**:

1. **Plugins → Development → Import plugin from manifest…**
2. Pick `tools/figma/plugin/manifest.json`
3. **Plugins → Development → ANTZ Command Centre → Screens** → Run

It creates a page named **ANTZ — Command Centre** and builds 15 frames of
**390×844** laid out left to right at `x = 0, 470, 940, …`. Nothing else in the
file is touched.

> **Why a plugin and not MCP?** The Figma Dev Mode MCP server (`127.0.0.1:3845`)
> exposes read tools only — `get_design_context`, `get_metadata`, `get_screenshot`,
> `get_variable_defs`. There is no write tool, so an MCP client cannot create
> nodes. The plugin uses the same Plugin API directly and needs no MCP at all.

### MCP variant (only if a write tool is available)

`node tools/figma/build-scripts.mjs` emits `out/00..15.js` for `use_figma`
(`00-setup.js` first — it also creates the `ANTZ` colour variable collection).
`node tools/figma/dryrun.mjs` checks all 16. Unused unless a write-capable Figma
MCP server appears.

## Files

| File | Role |
|---|---|
| `prelude.js` | Tokens, text/vector/auto-layout helpers, icon renderer, 8 chart primitives, all 13 section renderers, the detail-page assembler |
| `home.js` | Home screen: 4 micro-viz primitives, the illustrated forest band, home cards |
| `extract-data.mjs` | Bundles the real TS data with `lucide-react` stubbed, dumps JSON |
| `extract-icons.mjs` | Pulls `__iconNode` geometry out of `lucide-react` |
| `build-scripts.mjs` | Concatenates prelude + builder + per-page data into self-contained scripts |
| `build-plugin.mjs` | Bundles prelude + builder + all data into a runnable Figma plugin |
| `mock-figma.mjs` | Plugin API stand-in — validates paints, path data, FILL/HUG legality, font loading |
| `dryrun.mjs` | Runs all 16 MCP scripts against the mock |
| `dryrun-plugin.mjs` | Runs the plugin with the MCP-only helpers removed — the real sandbox shape |

`out/`, `antz-data.json`, `antz-icons.json` and `_bundle.mjs` are generated.

## Fidelity notes

Ported 1:1 from source, so the Figma output matches the browser:

- **Geometry** — `niceTicks`, `smoothPath` (Catmull-Rom → cubic with clamped
  controls), `topRounded`, the midpoint-quadratic home sparkline, and the 270°
  dashed arc gauge are the same maths as [`charts.tsx`](../../src/detail/charts.tsx)
  and [`viz.tsx`](../../src/v3/viz.tsx).
- **Chapter grouping and per-chart hue rotation** — `CHAPTER_OF` / `chaptersOf` /
  `sectionAccents` are ported verbatim, so section order and the accent each chart
  wears are identical to the app.
- **Alpha flattening** — CSS `color-mix()` / `rgba()` over a known backdrop is
  precomputed to opaque hex (`mixOver`), because Figma layer opacity would also
  fade the strokes sitting on top.
- **Heights** — everything hugs via auto-layout, so Figma computes page height the
  way the browser does. Frame heights are not hardcoded.

Charts are drawn at the true content width (306px inside a detail card) rather
than scaling a 340px viewBox, so stroke weights stay exactly 2px as designed.

## Known deviations

- **Interaction states are captured at rest**: the first range chip / first tab is
  the selected one, the trend readout shows the latest point, and the scrub
  crosshair is absent. The app resolves these at runtime; a static frame has to
  pick one.
- **Horizontally-scrolling rails** (`ranked`, More Modules) are laid out at full
  width rather than clipped to a scrollport, so the whole set is visible and
  editable.
- **The detail sheet's backdrop** is the ground colour plus a 22% scrim, not a live
  render of the home screen behind it.
