#!/usr/bin/env bash
# Gabungkan segmen out/<id>.mp4 (urutan tayang) + audio/vo.wav + teks audio/vo.id.srt
# -> out/najmi-ep01.mp4 (dengan teks) dan out/najmi-ep01-notext.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
ORDER=$(node -e "import('./najmi-3d-vector/anim.js').then(m=>console.log(m.ORDER.join(' ')))")
: > out/list.txt
for id in $ORDER; do [ -f "out/$id.mp4" ] || { echo "segmen hilang: $id" >&2; exit 1; }; echo "file '$id.mp4'" >> out/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i out/list.txt -c copy out/video-only.mp4
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 audio/vo.wav)
FADE="fade=t=in:d=0.5,fade=t=out:st=$(awk "BEGIN{print $DUR-1.2}"):d=1.2"   # "cut to black" di akhir
ENC=(-c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -t "$DUR" -movflags +faststart)
ffmpeg -y -loglevel error -i out/video-only.mp4 -i audio/vo.wav -vf "$FADE" -af apad "${ENC[@]}" out/najmi-ep01-notext.mp4
# FontSize/Outline/MarginV dalam skala PlayRes 288 (libass default) -> otomatis mengikuti resolusi video
ffmpeg -y -loglevel error -i out/video-only.mp4 -i audio/vo.wav \
  -vf "$FADE,subtitles=audio/vo.id.srt:force_style='FontName=DejaVu Sans,Bold=1,FontSize=10,Outline=1.5,Shadow=0,MarginV=40,Alignment=2'" \
  -af apad "${ENC[@]}" out/najmi-ep01.mp4
ls -la out/*.mp4
