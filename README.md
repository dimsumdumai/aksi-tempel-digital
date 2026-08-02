# Aksi Tempel Digital

Aplikasi React/Vite untuk digitalisasi kegiatan Aksi Tempel-Tempel:
- OCR foto plat nomor menggunakan Tesseract.js.
- Pencocokan otomatis dengan database GASPOL Excel.
- Petugas dummy: Dimas, Siti, Imelda, Lina, Luisi.
- Lokasi manual atau koordinat GPS browser.
- Rekap per hari, monitoring status, WhatsApp individual, ekspor Excel.
- Penyimpanan temuan di localStorage browser.

## Menjalankan
```bash
npm install
npm run dev
```
Buka alamat lokal yang ditampilkan Vite.

## Catatan
Database sumber berada di `public/database-gaspoll.xlsx` dan dibaca saat aplikasi dibuka. Untuk produksi multi-user, localStorage perlu diganti backend/database terpusat serta autentikasi pengguna.

## Pembaruan OCR v2

- Reset hasil OCR lama setiap foto baru dipilih.
- Preprocessing grayscale, peningkatan kontras, threshold hitam-putih, dan pembesaran gambar.
- Pemindaian gambar penuh, area tengah, serta beberapa area grid untuk foto kolase/uji coba.
- Whitelist karakter khusus plat nomor dan page segmentation satu baris.
- Normalisasi karakter yang sering tertukar, seperti O/0, I/1, S/5, dan B/8.
- Pencocokan exact serta fuzzy maksimal dua karakter terhadap database GASPOL.

Untuk hasil terbaik gunakan satu foto untuk satu plat. Foto kolase tetap dicoba melalui beberapa area crop otomatis, tetapi prosesnya akan lebih lama.
