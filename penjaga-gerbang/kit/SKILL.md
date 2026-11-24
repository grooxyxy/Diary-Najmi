---
name: lemo-opuscar-hd-2d
description: Direct and produce a short film made entirely in code in the Lemo-Opuscar "2.5D Pixel Art" (hd-2d) style: flat pixel sprites inside a lit, fogged 3D diorama, high three-quarter camera, tilt-shift band, pixel speech-bubble dialogue and serif narration captions. Use when the user asks for a video, film, short, promo, explainer or animation in HD-2D / 2.5D pixel art (gaya HD-2D, pixel 2.5D, pixel diorama, Octopath-like), or when they name this kit.
---

# Lemo-Opuscar — HD-2D kit

A self-contained edition of the Lemo-Opuscar library (github.com/lemomo-ai/lemo-opuscar) with one style: **hd-2d, 2.5D Pixel Art** (also called the HD-2D look). The skill, the guides, the core tools and the style's demo are all in this folder. The library needs no download.

**Default and only style: `hd-2d`.** If the user asks for another style or for the full style list, say plainly that this kit carries hd-2d only; offer to make the film in hd-2d, or point them to the full library at the URL above. Never invent a style or mix in a style whose files aren't here.

## 1. Get the library

It is `kit/`, next to this file. Resolve it once and keep the path:

```sh
LIB=$(CDPATH= cd "<skill base directory>/kit" && pwd -P)
```

`sh "<skill base directory>/scripts/setup.sh"` does this, checks the system tools and prints `LIB=<path>` on its last line. Use the printed path. Do not clone or update the library; the kit is fixed. (The wrapper only falls back to the upstream clone when `kit/` is absent.)

## 2. Install the core tools early

Start `sh "<skill base directory>/scripts/setup.sh" deps` right away, in the background if you can: it takes a few minutes the first time. Add `deps voice` or `deps music` later, only if the film needs them (`$LIB/TECHNIQUE.md` §1). Report missing system tools in your one round of questions; don't install system software yourself.

System tools the user must have: **Node 20+**, **ffmpeg 7+**, **Python 3.11+ or uv**. A 3D style wants a GPU; in a VM or CI runner set `LEMO_ANGLE=swiftshader` (`$LIB/core/README.md`). hd-2d draws in code and needs **no image generator**.

## 3. Follow the library

Read `$LIB/AGENTS.md` and do what it says, starting with **Start** (the user's own styles in `~/lemo-my-styles/`; when they started the skill without writing anything, the language question first, then the ways in). Then `$LIB/DIRECTOR.md` for directing and `$LIB/TECHNIQUE.md` for building.

- **Style prompt:** `$LIB/styles/hd-2d/STYLE.md` — keep all of it.
- **Demo reference:** `$LIB/styles/hd-2d/DEMO.md` and the code in `$LIB/styles/hd-2d/demo/`. The demo is bundled. Read it only **after** your own `TREATMENT.md` exists, and use it for techniques only: never its story, shots, props or timeline.
- **Text on screen:** narration captions (style B) and pixel speech bubbles (style C) live in `$LIB/styles/hd-2d/demo/captions.js`; the old gold-framed RPG dialogue box is retired. Load `/core/fonts/fonts.css` for the bundled IM Fell English.
- **Page contract, render/audio commands:** `$LIB/core/README.md`.
- **Render and vertical guides:** `references/render.md` and `references/vertikal-9x16.md` in this skill folder.
- **Output:** 1920×1080 at 60 fps unless the user asks for another size or frame rate (the demo's native rate is 60 fps; `--size 1080x1920` for vertical).

## What changes in skill mode

| | |
|---|---|
| Project folder | `<name>/` in the folder the user started from (lowercase letters, digits, hyphens; avoid `#` and `?` in the path). Wherever the guides say `films/<name>/`, read this folder |
| Running tools | from `$LIB`, with the project's absolute path: `cd "$LIB" && node core/render/still.mjs "<project>" 1.5 3` |
| Library files in pages | absolute URLs: `/core/lib.js`, `/node_modules/three/…` (the project is served at `/@film/`) |
| Library files in scripts and `build.sh` | `$LIB/…`, with `LIB=<path>` at the top of `build.sh`; never `../..` |
| Demo source | already in `$LIB/styles/hd-2d/demo/`; not meant to be rendered as the user's film |
| Updates | none: the kit is a fixed copy. A newer upstream edition is at the GitHub URL above |

Deliver what `$LIB/DIRECTOR.md` §11 lists, in the project folder, and tell the user where it is. Films the user makes are theirs: no LemoLab credit and no watermark. The demo's "LemoLab × Claude" end-credit line belongs to the library's demo only; when you adapt `ui.js`, delete it.
