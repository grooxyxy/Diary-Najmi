#!/usr/bin/env python3
"""Buat voiceover Najmi dengan VoxCPM2 (llama.cpp-omni, CPU).

- Satu WAV per baris: out/voices/<id>.wav (24 kHz mono)
- Satu MP3 gabungan urut naskah: out/voiceover_najmi_lengkap.mp3
- dur.json: durasi tiap baris untuk pipeline animasi
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lines", default="voiceover/lines_najmi_ep03.json")
    parser.add_argument("--voices", default="voiceover/voices.json")
    parser.add_argument("--out-dir", default="voiceover/out")
    parser.add_argument("--cli", required=True, help="Path ke voxcpm2-cli")
    parser.add_argument("--base-lm", required=True, help="Path ke BaseLM GGUF")
    parser.add_argument("--acoustic", required=True, help="Path ke Acoustic GGUF")
    parser.add_argument("--ids", nargs="*", default=None, help="Batasi id tertentu")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    lines = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    cfg = json.loads(Path(args.voices).read_text(encoding="utf-8"))
    bank = cfg["bank"]
    char_map = cfg["characters"]
    timesteps = int(cfg.get("timesteps", 8))
    gap_ms = int(cfg.get("gap_ms", 300))

    if args.ids:
        wanted = set(args.ids)
        lines = [line for line in lines if line["id"] in wanted]
    if not lines:
        raise SystemExit("Tidak ada baris yang diproses (cek --ids).")

    out_dir = Path(args.out_dir)
    wav_dir = out_dir / "voices"
    wav_dir.mkdir(parents=True, exist_ok=True)

    print(f"Membuat {len(lines)} klip dengan VoxCPM2 ...", flush=True)

    durations: dict[str, float] = {}
    for index, line in enumerate(lines, start=1):
        line_id = line["id"]
        who = line.get("who", "")
        profile_id = char_map.get(who) or char_map.get(who.upper()) or "najmi"
        profile = bank[profile_id]

        prompt = f"({profile['description']}){line['text']}"
        raw = wav_dir / f"__raw_{line_id}.wav"
        final = wav_dir / f"{line_id}.wav"

        run(
            [
                str(args.cli),
                "-t", prompt,
                "-o", str(raw),
                "--cpu",
                "--timesteps", str(timesteps),
                "--seed", str(int(profile["seed"])),
                str(args.base_lm),
                str(args.acoustic),
            ]
        )

        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw)]
        if line.get("lowpass_7k"):
            cmd += ["-af", "lowpass=f=7000"]
        cmd += ["-ar", "24000", "-ac", "1", str(final)]
        run(cmd)
        raw.unlink(missing_ok=True)

        durations[line_id] = ffprobe_duration(final)
        print(
            f"[{index}/{len(lines)}] {line_id} ({who}) -> {profile_id} "
            f"{durations[line_id]}s",
            flush=True,
        )

    silence = wav_dir / "__silence.wav"
    run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
            "-t", f"{gap_ms / 1000:.3f}",
            "-ar", "24000", "-ac", "1", str(silence),
        ]
    )

    concat_list = out_dir / "__concat.txt"
    entries: list[str] = []
    for index, line in enumerate(lines):
        entries.append(f"file 'voices/{line['id']}.wav'")
        if index < len(lines) - 1:
            entries.append("file 'voices/__silence.wav'")
    concat_list.write_text("\n".join(entries) + "\n", encoding="utf-8")

    merged_wav = out_dir / "__merged.wav"
    run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "concat", "-safe", "0",
            "-i", str(concat_list),
            "-c:a", "pcm_s16le", str(merged_wav),
        ]
    )
    merged_mp3 = out_dir / "voiceover_najmi_lengkap.mp3"
    run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(merged_wav),
            "-codec:a", "libmp3lame", "-q:a", "2", str(merged_mp3),
        ]
    )
    concat_list.unlink(missing_ok=True)
    silence.unlink(missing_ok=True)
    merged_wav.unlink(missing_ok=True)

    (out_dir / "dur.json").write_text(
        json.dumps(durations, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(
        f"Selesai: {len(durations)} klip, "
        f"{ffprobe_duration(merged_mp3)} detik total -> {merged_mp3}",
        flush=True,
    )


if __name__ == "__main__":
    main()
