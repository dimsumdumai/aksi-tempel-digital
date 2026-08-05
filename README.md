# Aksi Tempel Digital

Aplikasi React/Vite untuk digitalisasi kegiatan **Aksi Tempel-Tempel Tim Pembina Samsat Provinsi Riau** — identifikasi kendaraan dengan kewajiban pajak belum lunas (PKB/SWDKLLJ) melalui pemindaian plat nomor secara langsung di lapangan.

## Fitur Utama

- **OCR plat nomor otomatis** dengan Tesseract.js — preprocessing grayscale, kontras, threshold, dan multi-region crop untuk akurasi lebih baik di kondisi lapangan.
- **Pencocokan otomatis** dengan database tunggakan GASPOL, termasuk fuzzy matching (edit distance) untuk toleransi kesalahan OCR.
- **Geolokasi GPS** via browser atau input manual.
- **Rekap harian, dashboard, dan posisi kendaraan terakhir** — visualisasi kinerja petugas dan lokasi temuan.
- **Cetak notice thermal** ke printer Zebra iMZ320 dengan format CPCL atau ZPL, melalui bridge native iOS/Android atau fallback sistem browser.
- **Penyampaian edukasi via WhatsApp** — tautan wa.me dengan template pesan.
- **Manajemen data tunggakan** — admin dapat mengimpor data Excel dan membagikan ke petugas lapangan.

## Stack

- **Frontend**: React 19 + Vite 8
- **Backend**: Vercel-style serverless functions (api/[...path].js) + Supabase (PostgreSQL + Storage)
- **OCR**: Tesseract.js 7
- **Auth**: bcryptjs + token session hash, kedaluwarsa 8 jam
- **Printer**: Zebra iMZ320 (CPCL/ZPL) melalui window.ZebraPrinterBridge

## Menjalankan Lokal

```bash
npm install
npm run dev
```

Server Vite berjalan di http://localhost:5173. Untuk mengarahkan panggilan /api/* ke backend lokal, jalankan juga `npx vercel dev` di terminal lain, atau set `VITE_API_PROXY` ke URL server lokal Anda.

**Tanpa backend** (mode DEV): aplikasi otomatis membaca database dari `public/database-gaspoll.xlsx` dan menyimpan temuan di `localStorage`. Mode ini cocok untuk demonstrasi offline.

## Environment Variables

Salin `.env.example` ke `.env.local` dan isi nilainya:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-in-vercel-only
```

`SUPABASE_SERVICE_ROLE_KEY` hanya boleh tersimpan di environment Vercel, tidak di-commit ke repository.

## Struktur Project

```
src/main.jsx           Komponen React utama dan seluruh UI
src/auth.js            Autentikasi dan session management
src/printerService.js  Generator CPCL/ZPL untuk printer Zebra
src/styles.css         Seluruh styling
api/[...path].js       API handler (auth, arrears, sightings)
api/_lib.js            Shared utilities (Supabase client, sanitasi)
supabase/migrations/   Skema database PostgreSQL
scripts/               Build dan deployment scripts
```

## Pembaruan OCR v2

- Reset hasil OCR lama setiap foto baru dipilih.
- Preprocessing grayscale, peningkatan kontras, threshold hitam-putih, dan pembesaran gambar.
- Pemindaian gambar penuh, area tengah, serta beberapa area grid untuk foto kolase/uji coba.
- Whitelist karakter khusus plat nomor dan page segmentation satu baris.
- Normalisasi karakter yang sering tertukar, seperti O/0, I/1, S/5, dan B/8.
- Pencocokan exact serta fuzzy maksimal dua karakter terhadap database GASPOL.

Untuk hasil terbaik gunakan satu foto untuk satu plat. Foto kolase tetap dicoba melalui beberapa area crop otomatis, tetapi prosesnya akan lebih lama.
