# Voiceover Najmi — VoiceStudio / OmniVoice

Folder ini berisi pipeline voiceover untuk Episode 03. Semua file ada di sini supaya tidak bercampur dengan aset animasi. Satu-satunya file di luar folder adalah `.github/workflows/voiceover.yml` — GitHub mewajibkan workflow berada di path itu, tetapi isinya hanya memanggil script di folder ini.

## Mesin yang dipakai

**OmniVoice** (`k2-fsa/OmniVoice`) — mesin default **VoiceStudio**, alternatif ElevenLabs open-source.

- 646 bahasa, termasuk **Bahasa Indonesia** (`language: id`).
- **Voice design**: suara dibentuk dari atribut (gender, age, pitch, style) + seed. Tidak perlu audio referensi, tidak perlu API key, tidak perlu akun.
- Di `voices.json` ada **24 profil suara** siap pakai (zephlyn, dimas_gugup, siska_tajam, pak_hendra, bu_rina, arka_energik, sera_wibawa, + 16 alternatif). Tinggal ganti mapping `characters` untuk mencoba suara lain.
- Code OmniVoice Apache-2.0. **Bobot model CC-BY-NC (non-komercial)** — periksa kembali sebelum dipakai untuk proyek komersial. Voice design juga dilatih di EN/ZH, jadi hasil Indonesia kadang perlu beberapa percobaan; untuk hasil paling stabil bisa pakai mode cloning dengan audio referensi.

## Isi folder

| File | Fungsi |
|---|---|
| `lines_najmi_ep03.json` | 30 baris dialog/narasi (id, who, text, lowpass_7k, file) — disalin dari `Apoc` |
| `voiceover_najmi_portal_di_kamar_v2.txt` | naskah sumber |
| `voices.json` | bank suara + mapping karakter → profil suara + kecepatan |
| `generate_voiceover.py` | generate satu WAV per id, lowpass 7 kHz untuk tokoh, tulis `dur.json` |
| `out/voices/<id>.wav` | hasil (dibuat workflow, 24 kHz mono) |
| `out/dur.json` | durasi tiap id, format sama seperti keluaran `import_voice.py` |

## Cara jalan

1. Push perubahan ke `voiceover/lines_najmi_ep03.json`, `voices.json`, atau `generate_voiceover.py` → workflow jalan otomatis.
2. Atau buka **Actions → Voiceover Najmi (VoiceStudio / OmniVoice) → Run workflow**. Isi `ids` kalau hanya mau generate sebagian, misalnya `n01 j01 d01`; kosongkan untuk semua.
3. Setelah selesai, download artifact `suara-najmi-<sha>.zip`. Isinya `voices/` dan `dur.json`.

Output sudah 24 kHz mono dan `dur.json`-nya kompatibel dengan `import_voice.py`, jadi bisa langsung dipakai pipeline kit HD-2D.

## Catatan operasional

- Run pertama mengunduh bobot ±2,4 GB dari HuggingFace. Cache `~/.cache/huggingface` disimpan antar run supaya run berikutnya jauh lebih cepat.
- Inference di CPU sengaja memakai `float32` (bukan `float16` seperti CLI bawaan) agar stabil di runner gratis. `num_step: 16` dipakai untuk mempercepat; naikkan ke `32` di `voices.json` kalau mau kualitas lebih tinggi.
- `speed` default `0.86` mengikuti catatan naskah (narasi lambat). Bisa diubah per karakter lewat `voices.json` atau per baris lewat field `speed` di `lines_najmi_ep03.json`.
- Seed di tiap profil membuat suara lebih konsisten antar generate, meski voice design tetap punya variasi alami.

## Lisensi & etika

- Kode VoiceStudio: AGPL-3.0; kode OmniVoice: Apache-2.0.
- Bobot OmniVoice: CC-BY-NC → **non-komercial**. Untuk kebutuhan komersial, ganti dengan engine berlisensi komersial di VoiceStudio (mis. VoxCPM2, Apache-2.0).
- Jangan kloning suara orang tanpa izin.
