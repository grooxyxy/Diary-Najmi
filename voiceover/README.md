# Voiceover Najmi — VoxCPM2

Folder ini berisi pipeline voiceover Episode 03. Semua file ada di sini supaya tidak bercampur dengan aset animasi. Satu-satunya file di luar folder adalah `.github/workflows/voiceover.yml` — GitHub mewajibkan workflow berada di path itu, dan isinya hanya memanggil script di folder ini.

## Mesin: VoxCPM2

| | |
|---|---|
| Model | `openbmb/VoxCPM2` (2B tokenizer-free diffusion TTS) |
| Lisensi | **Apache-2.0** — boleh komersial |
| Bahasa | 30 bahasa termasuk **Bahasa Indonesia** |
| Kualitas | 48 kHz, voice design dari deskripsi teks, cloning dari referensi |
| Runtime | GGUF Q8_0 + Acoustic F16 lewat `llama.cpp-omni` (`voxcpm2-cli`), **CPU** di runner GitHub |

Kenapa bukan Edge TTS/OmniVoice lagi: Edge TTS terdengar robot, sementara voice design OmniVoice dilatih di EN/ZH sehingga aksennya Inggris. VoxCPM2 punya **voice design berbahasa bebas** dan dukungan Indonesia yang baik, tanpa layanan berbayar.

## Bank suara

`voices.json` berisi 16 profil. Tiap profil punya:
- `description` — deskripsi suara dalam kurung, diletakkan di awal teks (voice design VoxCPM2)
- `seed` — biar hasil konsisten

Mapping `characters` menentukan suara tiap tokoh:
- **Najmi & Narator: pria** (profil `najmi` dan `narator`)
- Dimas: pria muda gugup · Siska: wanita tajam · Pak Hendra: pria berat · Bu Rina: wanita hangat · Arka: remaja energik · Sera: wanita berwibawa

## Isi folder

| File | Fungsi |
|---|---|
| `lines_najmi_ep03.json` | 32 baris dialog/narasi — dari `Apoc` |
| `voiceover_najmi_portal_di_kamar_v2.txt` | naskah sumber |
| `voices.json` | deskripsi suara + mapping tokoh + jeda |
| `generate_voiceover.py` | panggil CLI per baris, gabungkan urut naskah, tulis `dur.json` |
| `out/voices/<id>.wav` | klip per baris (24 kHz mono; dialog di-low-pass 7 kHz) |
| `out/voiceover_najmi_lengkap.mp3` | **satu MP3 gabungan, urut sesuai naskah VO** |
| `out/dur.json` | durasi tiap id untuk timing animasi |

## Cara jalan

1. Push perubahan ke file di `voiceover/` → workflow jalan otomatis.
2. Atau **Actions → Voiceover Najmi (VoxCPM2) → Run workflow**. Isi `ids` untuk generate sebagian; kosongkan untuk semua.
3. Download artifact `suara-najmi-<sha>.zip`. File utama: `voiceover_najmi_lengkap.mp3`.

## Kustomisasi

Edit `voiceover/voices.json`:
- `characters` → ganti tokoh ke profil lain
- `bank.<profil>.description` → ubah karakter suara, misalnya `"A cheerful Indonesian teenage girl, bright voice"`
- `bank.<profil>.seed` → coba variasi lain dari deskripsi yang sama
- `gap_ms` → jeda antar baris di MP3 gabungan (default `300`)
- `timesteps` → makin tinggi makin halus tapi makin lama (default `8`, nilai model default `10`)

## Catatan operasional

- Run pertama mengunduh GGUF ±3,5 GB dan meng-compile `voxcpm2-cli`. Cache HuggingFace disimpan antar run, jadi run berikutnya jauh lebih cepat.
- Inference CPU untuk 32 klip bisa memakan waktu beberapa menit. Workflow pakai timeout 120 menit.
- Voice design kadang butuh 2–3 percobaan (`seed` berbeda) untuk mendapat karakter yang pas. Ini normal untuk model generatif.
- `dur.json` menggantikan `t_est` di naskah untuk timing animasi; jeda bisa diubah lewat `gap_ms`.

## Lisensi & etika

Model dan kode VoxCPM2: Apache-2.0 (komersial dipsilkan). `llama.cpp-omni`: MIT. Tetap gunakan suara secara etis — jangan meniru suara orang tanpa izin.
