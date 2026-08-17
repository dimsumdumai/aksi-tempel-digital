# Aksi Tempel Digital — Backend Telegram

Backend ini menghubungkan bot Telegram `@dimasjrbot` dengan database kendaraan dan dashboard monitoring.

## 1. Persiapan

Pastikan Node.js 18+ tersedia, lalu masuk ke folder backend:

```bash
cd backend
npm install
cp .env.example .env
```

Buka `.env`, lalu isi token yang diberikan BotFather:

```env
TELEGRAM_BOT_TOKEN=token_rahasia_dari_botfather
WEBHOOK_SECRET=buat_string_rahasia
PORT=3000
```

Jangan mengirim token ke chat atau memasukkannya ke frontend.

## 2. Isi database contoh

```bash
npm run seed
```

Data contoh yang tersedia antara lain `BM 1658 OH`, `BM 9929 FN`, `BM 1234 AA`, `BM 5678 CD`, dan `BM 7890 EF`.

## 3. Jalankan server

```bash
npm start
```

Dashboard dapat dibuka di:

```text
http://localhost:3000/dashboard
```

## 4. Hubungkan webhook Telegram

Webhook memerlukan URL HTTPS yang dapat diakses Telegram. Saat pengujian lokal, gunakan tunnel HTTPS seperti Cloudflare Tunnel atau ngrok.

Setelah URL tersedia, jalankan request berikut, dengan mengganti nilai yang sesuai:

```bash
curl -X POST "https://api.telegram.org/botTOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://domain-anda.com/api/telegram/webhook","secret_token":"WEBHOOK_SECRET"}'
```

Jika server berjalan di belakang reverse proxy, pastikan request diteruskan ke port 3000.

## 5. Cara menggunakan bot

Kirim ke `@dimasjrbot`:

```text
/cari BM 1658 OH
```

Bot menampilkan informasi kendaraan dan pilihan:

- Tahunan
- 5 Tahunan
- BBN

Data yang ditampilkan adalah data database aplikasi. Untuk produksi, sumber data harus dihubungkan ke API resmi atau sistem Samsat yang memiliki izin. Data contoh pada seed hanya untuk pengujian.

## Catatan keamanan

Batasi akses bot dengan daftar Telegram user ID petugas. Gunakan HTTPS. Jangan menyimpan token di Git. Tambahkan audit log dan persetujuan penggunaan data sebelum mengirim notifikasi edukasi melalui WhatsApp.
