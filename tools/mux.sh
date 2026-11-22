#!/usr/bin/env bash
# Gabung potongan video (out/seg_*.mp4) + audio/mix.wav -> out/sehari-jadi-pedagang.mp4 (loudnorm dua-lintasan ke -14 LUFS; ffmpeg ≥ 6)
set -euo pipefail
cd "$(dirname "$0")/.."; OUT=${1:-out/sehari-jadi-pedagang.mp4}; mkdir -p out
ls out/seg_*.mp4 | sort | sed "s|^|file '$PWD/|; s|$|'|" > out/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -c copy out/video_all.mp4
M=$(ffmpeg -hide_banner -nostats -i audio/mix.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$M" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
AF="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000"
EXTRA=(); [ "${SHORTEST:-}" = 1 ] && EXTRA=(-shortest)
ffmpeg -y -loglevel error -i out/video_all.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v copy -af "$AF" -c:a aac -b:a 192k "${EXTRA[@]}" -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size -of default=nw=1 "$OUT"
