# Bundled HD-2D kit

This is a frozen, self-contained copy of the Lemo-Opuscar library for the **hd-2d** style.

- Upstream: https://github.com/lemomo-ai/lemo-opuscar — commit `f9e2042`, 2026-11-20.
- Included: the guides, `core/` tools, `styles/hd-2d/` (prompt, demo, poster, stills, subtitles) and the demo fonts.
- Text on screen: narration captions (style B) and pixel speech bubbles (style C) via `styles/hd-2d/demo/captions.js`; the old gold-framed RPG dialogue box is retired.
- Not included: the other 98 styles, the upstream `tools/` folder (big-asset fetch/probe scripts), `core/assets/polyhaven/` models and HDRIs (hd-2d does not use them; `SOURCES.md` is kept), and the demo's licensed music.
- Setup: `sh <skill>/scripts/setup.sh` sets `LEMO_OPUSCAR_HOME` to this folder and prints `LIB=<path>`. Do not clone or update.
- Render and vertical-video notes live in the skill folder: `references/render.md` and `references/vertikal-9x16.md`.
- For the full library, use the upstream URL above.
