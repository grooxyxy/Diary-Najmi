#!/usr/bin/env python3
"""Buat satu file WAV per baris dialog dari lines_najmi_ep03.json.

Mesin: OmniVoice (k2-fsa/OmniVoice) — default engine VoiceStudio,
600+ bahasa termasuk Bahasa Indonesia, voice design tanpa audio referensi.
Output: voices/<id>.wav (24 kHz mono) + dur.json, siap dipakai import_voice.py
atau langsung oleh pipeline animasi.
"""

from __future__ import annotations

import argparse
import json
import random
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
import torch


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lines", default="voiceover/lines_najmi_ep03.json")
    parser.add_argument("--voices", default="voiceover/voices.json")
    parser.add_argument("--out-dir", default="voiceover/out")
    parser.add_argument(
        "--model", default="k2-fsa/OmniVoice", help="Repo/model OmniVoice di HF"
    )
    parser.add_argument("--ids", nargs="*", default=None, help="Batasi id tertentu")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    lines = json.loads(Path(args.lines).read_text(encoding="utf-8"))
    cfg = json.loads(Path(args.voices).read_text(encoding="utf-8"))
    bank = cfg["bank"]
    char_map = cfg["characters"]
    language = cfg.get("language", "id")
    num_step = int(cfg.get("num_step", 16))
    default_speed = float(cfg.get("default_speed", 1.0))

    if args.ids:
        wanted = set(args.ids)
        lines = [line for line in lines if line["id"] in wanted]

    out_dir = Path(args.out_dir)
    wav_dir = out_dir / "voices"
    wav_dir.mkdir(parents=True, exist_ok=True)

    print(f"Memuat {args.model} di CPU (float32) ...", flush=True)
    from omnivoice.models.omnivoice import OmniVoice

    model = OmniVoice.from_pretrained(
        args.model, device_map="cpu", dtype=torch.float32
    )
    sr = int(model.sampling_rate)
    print(f"Sample rate model: {sr} Hz", flush=True)

    durations: dict[str, float] = {}

    for index, line in enumerate(lines, start=1):
        line_id = line["id"]
        who = line.get("who", "")
        voice_id = char_map.get(who) or char_map.get(who.upper()) or "zephlyn"
        voice = bank[voice_id]
        seed = int(voice.get("seed", 0))

        torch.manual_seed(seed)
        random.seed(seed)
        np.random.seed(seed)

        speed = float(line.get("speed", default_speed))
        print(
            f"[{index}/{len(lines)}] {line_id} ({who}) -> {voice_id} "
            f"— {voice['label']}",
            flush=True,
        )

        audios = model.generate(
            text=[line["text"]],
            language=[language],
            instruct=[voice["instruct"]],
            speed=[speed],
            num_step=num_step,
        )
        audio = np.asarray(audios[0]).reshape(-1)

        raw_path = wav_dir / f"__raw_{line_id}.wav"
        final_path = wav_dir / f"{line_id}.wav"
        sf.write(raw_path, audio, sr)

        cmd = [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(raw_path),
            "-ar", "24000", "-ac", "1",
        ]
        if line.get("lowpass_7k"):
            cmd += ["-af", "lowpass=f=7000"]
        cmd.append(str(final_path))
        subprocess.run(cmd, check=True)
        raw_path.unlink()

        info = sf.info(final_path)
        durations[line_id] = round(info.frames / info.samplerate, 3)

    (out_dir / "dur.json").write_text(
        json.dumps(durations, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    total = sum(durations.values())
    print(f"Selesai: {len(durations)} klip, total {total:.1f} detik", flush=True)
    print(f"Output: {out_dir}", flush=True)


if __name__ == "__main__":
    main()
