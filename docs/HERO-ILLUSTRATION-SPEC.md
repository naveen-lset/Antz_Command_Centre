# Hero illustration — brief for new artwork

Replaces `src/assets/forest-scene.webp`. Same picture, same style, recomposed for a
**band** instead of a square-ish frame.

## Why the current file can't be repositioned

Measured, not guessed:

| | |
|---|---|
| Canvas | 1200 × 900 (aspect **1.33:1**) |
| Sky | top **51%** — rows 0–455 |
| Zoo scene | bottom **49%** — rows 455–900 |
| Renders at 390px wide | canvas 293px tall, **scene only 144px** |

The artwork is anchored to the bottom of its band, so **the scene's top edge is not a
position anyone can set — it is fixed by the scene's own height.** At 144px tall its top
always lands 144px above the band's bottom, which is 23px below the KPI's growth line.

That leaves 23px of headroom, and every way of using more of it breaks something:

- **Move the scene up inside the canvas** → leaves a hole at the canvas bottom, which on
  screen is a strip of bare ground between the artwork and the cards.
- **Scale the artwork up** → a 80px lift needs 1.55×, cropping 332px off *each* side. The
  left edge strip is 79% drawn content (elephants, foliage) and the right is 87% (deer,
  tree, cave). The animals go.
- **Stretch it vertically** → 1.28× is about the limit before the elephants and giraffe
  read as elongated, and that only buys 40px.

So the fix is artwork whose scene is simply taller as a share of the canvas.

## Target geometry

**Canvas 1600 × 1000 px — aspect 1.6:1.**

At the 390px reference width that renders 244px tall:

```
┌──────────────────────────────────┐  ← canvas top
│                                  │
│   SKY  30–35%  (73–85px on screen)│   renders BEHIND the KPI number and is
│   vines · 2–3 clouds · few birds  │   faded out by a mask — keep it near-empty
│                                  │
├──────────────────────────────────┤  ← topmost tree crown starts here
│                                  │
│   ZOO SCENE  65–70%              │   the band. 158–171px on screen, up from 144
│   (158–171px on screen)          │
│                                  │
└──────────────────────────────────┘  ← canvas bottom = page edge, no margin
```

- **Scene occupies the bottom 65–70%** — rows ~650–700 of 1000. This is the whole point;
  the current file is 49%.
- **Sky is the top 30–35%** and must stay near-empty. It renders behind the big KPI
  figure and is masked to a ghost, so anything detailed there is wasted.
- **The foreground must run to the very bottom edge.** No vignette, no empty margin, no
  drop shadow — that edge butts directly against the card stack.

## Safe margins

On a wide viewport the band crops horizontally from the centre (`object-cover`). So:

- **Keep every animal, building and focal element inside the middle 76%** — nothing
  important within **192px (12%)** of the left or right edge.
- Foliage, grass and plants *may* bleed to the edges; they are the parts that can be lost.

The current file fails this — the elephants sit hard against the left edge — which is why
it can only be used at exactly full width.

## Content — same cast, same arrangement

Keep the composition and left-to-right reading of the existing artwork:

- **Left**: adult elephant + calf on a path; thatched watchtower / gazebo behind them
- **Centre-left**: low building with a green roof, post-and-rail fence running right
- **Centre**: giraffe beside a thatched parasol
- **Centre-right**: pond with a flamingo standing in it
- **Right**: stone cave mouth with a bridge over it; deer on the grass; one tall tree
- **Throughout**: distant tree canopy on the horizon, foreground foliage in both lower
  corners
- **Top corners**: hanging monstera vines with blossoms

## Style and format

- Flat vector. **No gradients, no textures, no outlines, no noise** — flat fills only.
- One consistent light source, same gentle perspective as the current file.
- **Colour does not matter.** Ship it in any palette; `tools/recolour-forest-scene.py`
  maps it into the app's sage range, preserving every pixel's lightness. Flat fills are
  what make that mapping clean, which is why gradients and texture are excluded.
- **PNG**, 1600 × 1000. Transparency optional.

## Handover

Drop the file anywhere and tell me the path. Then it is:

```
python3 tools/recolour-forest-scene.py src/assets/forest-scene.webp
```

— recoloured, converted to WebP (~75KB), and dropped in. `ForestBand`'s height gets
retuned to the new scene height in the same pass.
