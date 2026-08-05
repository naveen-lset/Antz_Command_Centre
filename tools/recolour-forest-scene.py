"""
Recolour the zoo illustration into the Command Centre's sage palette.

Only HUE and SATURATION move. VALUE is preserved for every pixel, which is what
guarantees the illustration survives untouched: every shape stays exactly as light or
dark as the artist drew it, so nothing merges into its neighbour and no edge softens.
The drawing is not redrawn, reshaped or simplified — it is the same file with its
colours mapped.

Measured, not guessed. Sampling the source gave:
  sky            H 74  S  9  V 93     app ground  #e7f0ea  H 146 S  4 V 94
  elephants      H 84  S 31  V 61     app body    #4a6f5f  H 155 S 33 V 44
  trees          H 97  S 35  V 59     app treeline #a2c9b6 H 156 S 20 V 79
  pond           H 118 S 12  V 83     app stream  #d9ece2  H 152 S  8 V 87
  giraffe        H 34  S 63  V 78
  deer           H 42  S 41  V 67
  coral blossom  H 20  S 35  V 95     app flamingo #d8a8b0 H 348 S 22 V 85

So the whole picture is a YELLOW-green (hues 48–150) where the app is a SAGE green
(hues 146–163), with three warm accents. Nothing in it is blue.
"""

import colorsys
import sys
from PIL import Image

SRC = '/Users/naveen/Downloads/ChatGPT Image Aug 5, 2026, 03_40_13 PM.png'
OUT = sys.argv[1] if len(sys.argv) > 1 else 'forest-scene.png'

# App sage band, from the palette the rest of the screen already uses.
SAGE_LO, SAGE_HI = 140.0, 164.0
GREEN_LO, GREEN_HI = 48.0, 150.0
FLAMINGO_H, FLAMINGO_S = 348.0, 0.26


def remap(rgb):
    r, g, b = (c / 255 for c in rgb)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    hd = h * 360

    if s < 0.05:
        # Clouds, the sun, whitewashed walls, tusks. Already neutral; a hue rotation
        # on a 4%-saturated pixel is invisible and risks banding, so leave them.
        return rgb

    if 12 <= hd < 30:
        # Coral blossoms → the flamingo pink the app already carries, so the picture
        # keeps one warm accent instead of going flatly monochrome.
        nh, ns = FLAMINGO_H, min(s, FLAMINGO_S)
    elif 30 <= hd < GREEN_LO:
        # Giraffe and deer. The app's own band draws both in sage (#4a6f5f with
        # #35544a patches), so they join the greens. Saturation is halved rather than
        # clamped, which keeps the giraffe's patches distinct from its coat — and the
        # 7-point value gap between them is untouched either way.
        nh, ns = 152.0, min(s * 0.5, 0.34)
    elif GREEN_LO <= hd <= GREEN_HI:
        # The body of the illustration, linearly rehued into the sage band. The sky's
        # H 74 lands on 146 — exactly the app's ground colour.
        t = (hd - GREEN_LO) / (GREEN_HI - GREEN_LO)
        nh, ns = SAGE_LO + t * (SAGE_HI - SAGE_LO), s * 0.95
    else:
        # Nothing measured lands here; fall back to the mid sage rather than pass an
        # off-palette hue through.
        nh, ns = 152.0, min(s, 0.34)

    nr, ng, nb = colorsys.hsv_to_rgb((nh % 360) / 360, ns, v)
    return (round(nr * 255), round(ng * 255), round(nb * 255))


im = Image.open(SRC).convert('RGB')
cache = {}
out = []
for px in im.getdata():
    m = cache.get(px)
    if m is None:
        m = cache[px] = remap(px)
    out.append(m)

dst = Image.new('RGB', im.size)
dst.putdata(out)
dst.save(OUT, optimize=True)
print(f'{OUT}  {im.size[0]}×{im.size[1]}  {len(cache)} unique colours mapped')
