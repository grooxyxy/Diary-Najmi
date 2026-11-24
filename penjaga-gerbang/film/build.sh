#!/bin/sh
# Render lokal (Mac/Linux): sh film/build.sh [draft|standard|full] [shards]   — hasil: film/out/film.mp4 (+ film.srt)
# Butuh: node 20+, ffmpeg 7+, python3 + numpy + scipy, Chrome/Chromium untuk playwright (npx playwright-core install chromium)
set -e; cd "$(dirname "$0")"; ROOT=$(cd .. && pwd); PRESET=${1:-draft}; SH=${2:-1}
case "$PRESET" in
  draft)    SIZE=960x540;  FPS=12; Q='taps=16&sm=1024';;
  standard) SIZE=1280x720; FPS=24; Q='taps=28&sm=2048';;
  full)     SIZE=1920x1080; FPS=24; Q='taps=40&sm=2048';;
  *) echo "preset: draft|standard|full"; exit 2;;
esac
[ -d "$ROOT/kit/node_modules" ] || (cd "$ROOT/kit" && npm ci)
python3 tools/align.py && python3 tools/mix.py
i=0; while [ $i -lt $SH ]; do node tools/render_shard.mjs . --fps $FPS --size $SIZE --q "$Q" --shard $i/$SH --workers ${WORKERS:-2} --out out/shard_$(printf %02d $i).mp4; i=$((i+1)); done
ls out/shard_*.mp4 | sed "s/^/file '/;s/$/'/" | sed "s#file 'out/#file '#" > out/shards.txt
(cd out && ffmpeg -y -loglevel error -f concat -safe 0 -i shards.txt -c copy video.mp4)
sh "$ROOT/kit/core/render/mux.sh" out/video.mp4 out/mix.wav out/film.mp4 $FPS 1
echo "SELESAI → film/out/film.mp4  dan  film/out/film.srt"
