#!/bin/sh
# Lemo-Opuscar HD-2D kit: point the upstream installer at the bundled library.
#   sh setup.sh                    library ready? prints which packages are installed and LIB=<path>
#   sh setup.sh deps [voice] [music]
#   sh setup.sh demo hd-2d          (already bundled; harmless)
# The kit is self-contained: no clone and no update. If kit/ is missing, the
# upstream installer is used unchanged (it clones ~/lemo-opuscar).
set -e
HERE=$(CDPATH= cd "$(dirname "$0")" && pwd -P)

ROOT=
d=$HERE
while :; do
  if [ -f "$d/kit/AGENTS.md" ] && [ -d "$d/kit/core/render" ]; then ROOT=$d; break; fi
  [ "$d" = "/" ] && break
  d=$(dirname "$d")
done

if [ -n "$ROOT" ]; then
  [ -f "$ROOT/scripts/setup-upstream.sh" ] || { echo "✗ missing $ROOT/scripts/setup-upstream.sh"; exit 1; }
  LEMO_OPUSCAR_HOME="$ROOT/kit" exec sh "$ROOT/scripts/setup-upstream.sh" "$@"
fi

if [ -f "$HERE/setup-upstream.sh" ]; then exec sh "$HERE/setup-upstream.sh" "$@"; fi
echo "✗ the bundled kit/ folder is missing; re-extract hd2d-kit-skill-v2.zip"
exit 1
