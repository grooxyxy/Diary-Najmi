# Credits and licences

This bundle is a self-contained HD-2D edition of **Lemo-Opuscar** by **Lemomo (LemoLab)**.

- Upstream: https://github.com/lemomo-ai/lemo-opuscar
- Edition: commit `f9e2042` (2026-11-20), one style (`hd-2d`)
- Gallery: https://lemomo-ai.github.io/lemo-opuscar/

## What is in the kit, and under which licence

| Material | Licence |
|---|---|
| Code in `kit/core/`, `kit/tools/` (where present), `kit/styles/hd-2d/demo/`, `scripts/` | MIT (`kit/LICENSES/MIT.txt`) |
| Guides and style documents (`AGENTS.md`, `DIRECTOR.md`, `TECHNIQUE.md`, `MY-STYLES.md`, `STYLE.md`, `DEMO.md`, this README and the skill Markdown) | CC BY-NC 4.0 (`kit/LICENSES/CC-BY-NC-4.0.txt`), plus Lemomo's additional permission to read, follow, copy and adapt them to make your own films, commercial and client films included |
| Demo film, poster, stills and `hd-2d.srt` | CC BY 4.0 (`kit/LICENSES/CC-BY-4.0.txt`) |
| Fonts in `kit/styles/hd-2d/demo/fonts/` | SIL Open Font License 1.1 (licence texts beside the fonts) |
| three.js r170 | MIT |
| playwright-core | Apache-2.0 |

The full licence rules, including third-party exclusions and the commercial licence for the docs, are in `kit/LICENSE`. Read it before redistributing this bundle or the docs.

## Fonts

- **Cinzel** — The Cinzel Project Authors (Natanael Gama). `demo/fonts/h0.woff2` (500), `h1.woff2` (700). OFL 1.1.
- **Cormorant Garamond** — The Cormorant Project Authors (Christian Thalmann). `h2.woff2` (italic 500), `h3.woff2` (500), `h4.woff2` (600). OFL 1.1.

These are the Latin subsets the demo's `fonts.css` expects, added so the demo UI renders out of the box.

## The style's references

The hd-2d style prompt describes the grammar of the HD-2D look (sprite-in-diorama, high three-quarter camera, tilt-shift band, RPG UI). It references *Octopath Traveler* (Square Enix × Acquire) for grammar only. This bundle contains no characters, places, logos, UI ornaments or music from those games, and is not affiliated with or endorsed by Square Enix. Do not use "HD-2D" as a film title or brand.

## Films you make

Films you make with this kit are yours, commercial films included, with no LemoLab credit and no watermark. Third-party material you add keeps its own licence.

## Bundling notes

- `kit/core/assets/polyhaven/` is not included (11.9 MB of models and HDRIs not used by hd-2d); its `SOURCES.md` is kept for attribution.
- The demo's music (Scott Buckley, *Precipice*, CC BY 4.0) is not included; `kit/styles/hd-2d/DEMO.md` gives the source and the edit method.
- The `.claude-plugin/` marketplace metadata and the gallery site are not part of this kit.
