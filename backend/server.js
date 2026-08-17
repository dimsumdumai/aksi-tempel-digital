import 'dotenv/config';
import express from 'express';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, insertEntry, getEntries, getReports, getVehicle, getAllVehicles } from './src/db.js';
import { handleTelegramUpdate } from './src/telegram.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || `${__dirname}/data/aksi-tempel.db`;
mkdirSync(dirname(dbPath), { recursive: true });

const db = await initDatabase(dbPath);
console.log('Database SQLite siap');

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'aksi-tempel-digital', time: new Date().toISOString() });
});

app.post('/api/telegram/webhook', async (req, res) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.get('x-telegram-bot-api-secret-token') !== secret) {
    return res.sendStatus(401);
  }
  res.sendStatus(200);
  try {
    await handleTelegramUpdate(req.body, db);
  } catch (error) {
    console.error('Telegram update error:', error);
  }
});

app.get('/api/reports', (_req, res) => {
  res.json(getReports(db));
});

app.get('/', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/dashboard', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'dashboard.html'));
});

app.get('/operasi', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'operasi.html'));
});

app.get('/operasi-v2', (_req, res) => {
  res.sendFile(join(__dirname, 'public', 'operasi-v2.html'));
});

app.get('/api/entries', (_req, res) => {
  res.json(getEntries(db));
});

app.post('/api/entries', (req, res) => {
  const { nopol_code, nopol_suffix, owner_name, vehicle_type, nik, phone, latitude, longitude, address, scan_source, notes } = req.body;

  if (!nopol_code || !nopol_suffix || !owner_name || !vehicle_type || !nik || !phone) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  try {
    const result = insertEntry(db, {
      nopol_code: nopol_code.toUpperCase(),
      nopol_suffix: nopol_suffix.toUpperCase(),
      owner_name,
      vehicle_type,
      nik,
      phone,
      address: address || '',
      scan_source: scan_source || '',
      latitude: latitude || 0,
      longitude: longitude || 0,
      notes: notes || ''
    });

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vehicles/:plate', (req, res) => {
  const plate = req.params.plate.replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim();
  const vehicle = getVehicle(db, plate);
  if (!vehicle) return res.status(404).json({ error: 'Data kendaraan tidak ditemukan' });
  res.json(vehicle);
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Aksi Tempel Digital berjalan di http://localhost:${PORT}`);
});
