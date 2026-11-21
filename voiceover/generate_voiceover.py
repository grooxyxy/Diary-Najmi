#!/usr/bin/env python3
"""Buat voiceover Najmi dengan Edge TTS (suara Indonesia asli).

- Satu MP3 per baris: out/voices/<id>.mp3
- Satu MP3 gabungan urut naskah: out/voiceover_najmi_lengkap.mp3
- dur.json: durasi tiap baris (sumber timing untuk animasi)
"""

from __future__ import annotations

import argparse
import asyncio
import json
import subprocess
from pathlib import Path

import edge_tts


def run(cmd: list[str], cwd: Path | None = None) -> None:
    subprocess.run(cmd, check=True, cwd=cwd)


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()), 3)


async def synthesize(
    text: str, voice: str, rate: str, pitch: str, output: Path
) -> None:
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await comm.save(str(output))


async def main_async(args: argparse.Namespace) -> None:
    lines = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    cfg = json.loads(Path(args.voices).read_text(encoding="utf-8"))
    bank = cfg["bank"]
    char_map = cfg["characters"]
    gap_ms = int(cfg.get("gap_ms", 300))

    if args.ids:
        wanted = set(args.ids)
        lines = [line for line in lines if line["id"] in wanted]
    if not lines:
        raise SystemExit("Tidak ada baris yang diproses (cek --ids).")

    out_dir = Path(args.out_dir)
    wav_dir = out_dir / "voices"
    wav_dir.mkdir(parents=True, exist_ok=True)

    print(f"Membuat {len(lines)} klip dengan Edge TTS ...", flush=True)

    durations: dict[str, float] = {}
    for index, line in enumerate(lines, start=1):
        line_id = line["id"]
        who = line.get("who", "")
        profile_id = char_map.get(who) or char_map.get(who.upper()) or "najmi"
        profile = bank[profile_id]

        raw = wav_dir / f"__raw_{line_id}.mp3"
        final = wav_dir / f"{line_id}.mp3"

        await synthesize(
            line["text"],
            profile["voice"],
            profile.get("rate", "+0%"),
            profile.get("pitch", "+0Hz"),
            raw,
        )

        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw)]
        if line.get("lowpass_7k"):
            cmd += ["-af", "lowpass=f=7000"]
        cmd += ["-ar", "24000", "-ac", "1", "-q:a", "2", str(final)]
        run(cmd)
        raw.unlink(missing_ok=True)

        durations[line_id] = ffprobe_duration(final)
        print(
            f"[{index}/{len(lines)}] {line_id} ({who}) -> {profile_id} "
            f"[{profile['voice']} {profile.get('rate')} {profile.get('pitch')}] "
            f"{durations[line_id]}s",
            flush=True,
        )

    # Jeda antar baris
    silence = wav_dir / "__silence.mp3"
    run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-t", f"{gap_ms / 1000:.3f}",
            "-ar", "24000", "-ac", "1", "-q:a", "2", str(silence),
        ]
    )

    # Daftar concat sesuai urutan naskah
    concat_list = out_dir / "__concat.txt"
    entries: list[str] = []
    for index, line in enumerate(lines):
        entries.append(f"file 'voices/{line['id']}.mp3'")
        if index < len(lines) - 1:
            entries.append(f"file 'voices/__silence.mp3'")
    concat_list.write_text("\n".join(entries) + "\n", encoding="utf-8")

    merged = out_dir / "voiceover_najmi_lengkap.mp3"
    run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c:a", "libmp3lame", "-q:a", "2", str(merged),
        ]
    )
    concat_list.unlink(missing_ok=True)
    silence.unlink(missing_ok=True)

    (out_dir / "dur.json").write_text(
        json.dumps(durations, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(
        f"Selesai: {len(durations)} klip, "
        f"{ffprobe_duration(merged)} detik total -> {merged}",
        flush=True,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lines", default="voiceover/lines_najmi_ep03.json")
    parser.add_argument("--voices", default="voiceover/voices.json")
    parser.add_argument("--out-dir", default="voiceover/out")
    parser.add_argument("--ids", nargs="*", default=None, help="Batasi id tertentu")
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(main_async(parse_args()))
