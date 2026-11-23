#!/usr/bin/env python3
"""Build the WordPress.org art for Maestro ("Score" brand, 2026-11).

Writes to OUT_DIR (default: the parent .wordpress-org/ folder):
  banner-1544x500.png, banner-772x250.png, icon.svg, icon-256x256.png, icon-128x128.png

Everything is drawn from the geometry below. The PNGs are drawn with Pillow at 4x,
then LANCZOS-downsampled for smooth edges. icon.svg is written from the same shapes.
Fonts are bundled in ./fonts (SIL OFL): Fraunces for the wordmark, Figtree for the tagline.

Run from the repo root:  npm run assets:banners
"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.environ.get("FONT_DIR", os.path.join(HERE, "fonts"))
OUT_DIR = os.environ.get("OUT_DIR", os.path.dirname(HERE))

S = 4  # supersampling factor

# Palette "Score": paper, indigo ink, vermilion downbeat.
P = dict(
    paper="#f7f3ec",  # ground
    rule="#ddd5c7",   # hairline frame + panel divider
    ink="#1f2340",    # wordmark, menu rows, baton
    mute="#9a97a8",   # unselected row chips
    accent="#d9472b", # selected row, baton tip, accent bar
    tag="#4a4d63",    # tagline
)

WORDMARK = "MAESTRO"
TAGLINE = "Orchestrate your menu in place, inside the dashboard."


# ---------------------------------------------------------------- geometry ---

def mark_shapes(cx, cy, k):
    """The menu-and-baton mark as a list of (kind, coords, colour) in 1x units.

    Four menu rows, one picked out in the accent colour, and a tapered baton
    cutting across them. A paper-coloured halo separates the baton from the rows.
    """
    shapes = []
    rows = [(150, False), (210, True), (120, False), (180, False)]
    gap, h = 46 * k, 22 * k
    top, left = cy - gap * 1.5, cx - 120 * k
    for i, (length, sel) in enumerate(rows):
        y = top + i * gap
        x2 = left + h + 14 * k
        shapes.append(("rect", (left, y - h / 2, left + h, y + h / 2), "accent" if sel else "mute"))
        shapes.append(("rect", (x2, y - h / 2, x2 + length * k, y + h / 2), "accent" if sel else "ink"))

    gx, gy = cx - 78 * k, cy + 128 * k   # grip
    tx, ty = cx + 132 * k, cy - 128 * k  # tip
    ang = math.atan2(ty - gy, tx - gx)
    nx, ny = -math.sin(ang), math.cos(ang)

    def taper(wg, wt):
        return [(gx + nx * wg, gy + ny * wg), (tx + nx * wt, ty + ny * wt),
                (tx - nx * wt, ty - ny * wt), (gx - nx * wg, gy - ny * wg)]

    halo = 5 * k
    shapes.append(("poly", taper(5.5 * k + halo, 1.2 * k + halo), "paper"))
    shapes.append(("poly", taper(5.5 * k, 1.2 * k), "ink"))
    shapes.append(("circle", (gx, gy, 9 * k), "ink"))
    shapes.append(("circle", (tx, ty, 5 * k), "accent"))
    return shapes


def draw_shapes(d, shapes):
    for kind, c, col in shapes:
        fill = P[col]
        if kind == "rect":
            d.rectangle([v * S for v in c], fill=fill)
        elif kind == "poly":
            d.polygon([(x * S, y * S) for x, y in c], fill=fill)
        else:
            x, y, r = c
            d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=fill)


def svg_shapes(shapes):
    out = []
    for kind, c, col in shapes:
        fill = P[col]
        if kind == "rect":
            x1, y1, x2, y2 = c
            out.append(f'<rect x="{x1:.2f}" y="{y1:.2f}" width="{x2 - x1:.2f}" height="{y2 - y1:.2f}" fill="{fill}"/>')
        elif kind == "poly":
            pts = " ".join(f"{x:.2f},{y:.2f}" for x, y in c)
            out.append(f'<polygon points="{pts}" fill="{fill}"/>')
        else:
            x, y, r = c
            out.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{fill}"/>')
    return "".join(out)


# ------------------------------------------------------------------- type ---

def font(name, size, **axes):
    f = ImageFont.truetype(os.path.join(FONT_DIR, name), int(size * S))
    names = {"Weight": "wght", "Optical size": "opsz", "Optical Size": "opsz",
             "Softness": "SOFT", "Wonky": "WONK"}
    vals = []
    for a in f.get_variation_axes():
        n = a["name"].decode() if isinstance(a["name"], bytes) else a["name"]
        vals.append(axes.get(names.get(n, n), a["default"]))
    f.set_variation_by_axes(vals)
    return f


def tracked(d, x, y, text, f, fill, track):
    """Draw text on a baseline with letter-spacing (1x px)."""
    cx = x * S
    for ch in text:
        d.text((cx, y * S), ch, font=f, fill=fill, anchor="ls")
        cx += f.getlength(ch) + track * S


# ---------------------------------------------------------------- outputs ---

def build_banner():
    W, H, split = 1544, 500, 500
    img = Image.new("RGB", (W * S, H * S), P["paper"])
    d = ImageDraw.Draw(img)
    draw_shapes(d, mark_shapes(split / 2, H / 2, 1.0))
    # Hairline frame and panel divider.
    d.rectangle([0, 0, W * S - 1, H * S - 1], outline=P["rule"], width=2 * S)
    d.rectangle([(split - 1) * S, 0, (split + 1) * S, H * S], fill=P["rule"])

    tx, base = 590, 258
    wordmark = font("Fraunces-Variable.ttf", 132, opsz=144, wght=300, SOFT=50, WONK=0)
    tagline = font("Figtree-Variable.ttf", 29, wght=400)
    tracked(d, tx, base, WORDMARK, wordmark, P["ink"], 22)
    bar_y = base + 38
    d.rectangle([tx * S, bar_y * S, (tx + 112) * S, (bar_y + 8) * S], fill=P["accent"])
    d.text((tx * S, (bar_y + 70) * S), TAGLINE, font=tagline, fill=P["tag"], anchor="ls")

    img.resize((1544, 500), Image.LANCZOS).save(os.path.join(OUT_DIR, "banner-1544x500.png"), optimize=True)
    img.resize((772, 250), Image.LANCZOS).save(os.path.join(OUT_DIR, "banner-772x250.png"), optimize=True)


def build_icon():
    N, k = 256, 0.74
    shapes = mark_shapes(N / 2, N / 2, k)

    img = Image.new("RGB", (N * S, N * S), P["paper"])
    d = ImageDraw.Draw(img)
    draw_shapes(d, shapes)
    d.rectangle([0, 0, N * S - 1, N * S - 1], outline=P["rule"], width=2 * S)
    img.resize((256, 256), Image.LANCZOS).save(os.path.join(OUT_DIR, "icon-256x256.png"), optimize=True)
    img.resize((128, 128), Image.LANCZOS).save(os.path.join(OUT_DIR, "icon-128x128.png"), optimize=True)

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{N}" height="{N}" viewBox="0 0 {N} {N}" '
        f'role="img" aria-label="Maestro: The Inline Admin Menu Editor">'
        f'<rect width="{N}" height="{N}" fill="{P["paper"]}"/>'
        f'<rect x="1" y="1" width="{N - 2}" height="{N - 2}" fill="none" stroke="{P["rule"]}" stroke-width="2"/>'
        f'{svg_shapes(shapes)}</svg>\n'
    )
    with open(os.path.join(OUT_DIR, "icon.svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    build_banner()
    build_icon()
    print("Wrote banners and icons to", OUT_DIR)
