# Voiceover Najmi — Edge TTS (Bahasa Indonesia)

Folder ini berisi pipeline voiceover Episode 03. Semua file ada di sini supaya tidak bercampur dengan aset animasi. Satu-satunya file di luar folder adalah `.github/workflows/voiceover.yml` — GitHub mewajibkan workflow berada di path itu, dan isinya hanya memanggil script di folder ini.

## Kenapa pindah dari OmniVoice ke Edge TTS

OmniVoice (mesin VoiceStudio) memang mendukung `language: id`, tetapi mode **voice design**-nya dilatih di bahasa Inggris/Mandarin. Hasilnya: pelafalan Indonesia terdengar seperti Inggris. Di samping itu mapping `NAJMI` sebelumnya salah memakai profil `zephlyn` (perempuan).

Edge TTS memakai suara neural **Indonesia asli**:

- `id-ID-ArdiNeural` — pria
- `id-ID-GadisNeural` — wanita

Keduanya gratis, tanpa API key, tanpa unduh model. Tiap tokoh dibedakan lewat `rate` (kecepatan) dan `pitch` (nada), jadi tetap ada bank suara tanpa mengorbankan pelafalan. **Najmi sekarang bersuara pria.**

## Isi folder

| File | Fungsi |
|---|---|
| `lines_najmi_ep03.json` | 32 baris dialog/narasi (id, who, text, lowpass_7k, file) — dari `Apoc` |
| `voiceover_najmi_portal_di_kamar_v2.txt` | naskah sumber |
| `voices.json` | 16 profil suara + mapping karakter → profil, jeda antar baris |
| `generate_voiceover.py` | generate MP3 per baris, lalu gabungkan sesuai urutan naskah |
| `out/voices/<id>.mp3` | klip per baris (24 kHz mono;dialog di-low-pass 7 kHz) |
| `out/voiceover_najmi_lengkap.mp3` | **satu MP3 gabungan, urut sesuai naskah VO** |
| `out/dur.json` | durasi tiap id, kompatibel dengan `import_voice.py` |

## Cara jalan

1. Push perubahan ke file di `voiceover/` → workflow jalan otomatis.
2. Atau **Actions → Voiceover Najmi (Edge TTS) → Run workflow**. Isi `ids` untuk generate sebagian, misalnya `n01 j01 d01`; kosongkan untuk semua.
3. Download artifact `suara-najmi-<sha>.zip`. File utama: `voiceover_najmi_lengkap.mp3`.

## Mengubah suara

Buka `voices.json`:
- `characters` — petakan tokoh ke profil mana.
- `bank` — tiap profil punya `voice`, `rate` (mis. `-8%` lebih pelan, `+10%` lebih cepat), dan `pitch` (mis. `-9Hz` lebih rendah, `+9Hz` lebih tinggi).
- `gap_ms` — jeda antar baris di MP3 gabungan (default `300`).

Contoh: kalau Dimas kurang gugup, naikkan `rate` jadi `+18%` dan `pitch` `+14Hz`.

## Catatan

- Edge TTS adalah layanan online gratis dari Microsoft (bukan model lokal). Tidak ada data yang disimpan di luar runner GitHub.
- `dur.json` menggantikan `t_est` di naskah untuk timing animasi.
- Jeda antar baris bisa diubah lewat `gap_ms`; kalau mau tanpa jeda, set `0`.

## Lisensi & etika

`edge-tts` adalah pustaka MIT; suara berasal dari layanan Microsoft Edge. Gunakan sesuai ketentuan layanan mereka, dan jangan meniru suara orang tertentu tanpa izin.
