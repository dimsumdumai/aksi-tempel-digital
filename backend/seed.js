import 'dotenv/config';
import { initDatabase, upsertVehicle, updateVehicleTax } from './src/db.js';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || `${__dirname}/data/aksi-tempel.db`;
mkdirSync(dirname(dbPath), { recursive: true });
const db = await initDatabase(dbPath);

const vehicles = [
  {
    plate_number: 'BM 1658 OH',
    owner_name: 'PT. JASA RAHARJA PERSERO',
    address: 'JL. JEND. SUDIRMAN PEKANBARU RIAU',
    brand: 'TOYOTA',
    type: 'KIJANG INNOVA 2.0 V M/T',
    year: 2016,
    color: 'SILVER METALIK',
    plate_color: 'PUTIH',
    vehicle_class: 'MINIBUS',
    vehicle_type: 'MOBIL PENUMPANG',
  },
  {
    plate_number: 'BM 9929 FN',
    owner_name: 'PT. BENGKALIS SEJAHTERA',
    address: 'JL. AHMAD YANI BENGKALIS RIAU',
    brand: 'SUZUKI',
    type: 'ERTIGA GL M/T',
    year: 2020,
    color: 'MERAH',
    plate_color: 'PUTIH',
    vehicle_class: 'MINIBUS',
    vehicle_type: 'MOBIL PENUMPANG',
  },
  {
    plate_number: 'BM 1234 AA',
    owner_name: 'SITI RAHMAWATI',
    address: 'JL. GATOT SUBROTO PEKANBARU RIAU',
    brand: 'HONDA',
    type: 'BRIO SATYA S M/T',
    year: 2022,
    color: 'PUTIH',
    plate_color: 'HITAM',
    vehicle_class: 'SEDAN',
    vehicle_type: 'MOBIL PENUMPANG',
  },
  {
    plate_number: 'BM 5678 CD',
    owner_name: 'BUDI SETIAWAN',
    address: 'JL. DIPONEGORO PEKANBARU RIAU',
    brand: 'MITSUBISHI',
    type: 'XPANDER ULTIMATE CVT',
    year: 2021,
    color: 'HITAM METALIK',
    plate_color: 'HITAM',
    vehicle_class: 'MINIBUS',
    vehicle_type: 'MOBIL PENUMPANG',
  },
  {
    plate_number: 'BM 7890 EF',
    owner_name: 'Pemerintah Kota Pekanbaru',
    address: 'JL. JEND. SUDIRMAN PEKANBARU RIAU',
    brand: 'TOYOTA',
    type: 'AVANZA 1.5 G CVT',
    year: 2023,
    color: 'PUTIH',
    plate_color: 'HITAM',
    vehicle_class: 'MINIBUS',
    vehicle_type: 'MOBIL PENUMPANG',
  },
];

const taxes = {
  'BM 1658 OH': {
    tax_status: 'aktif',
    tax_due_date: '2027-03-11',
    last_payment_date: '04 Maret 2026 pukul 08:20:15',
    last_payment_amount: 4182797,
    last_payment_location: 'UPT PENGELOLAAN PENDAPATAN PEKANBARU KOTA, KELAS A',
    pkb_pokok: 2252891,
    pkb_opsen: 1486908,
    pkb_denda: 0,
    pkb_denda_opsen: 0,
    swdkllj: 143000,
    swdkllj_denda: 0,
    pnbp_stnk: 0,
    pnbp_tnkb: 0,
  },
  'BM 9929 FN': {
    tax_status: 'aktif',
    tax_due_date: '2027-08-01',
    last_payment_date: '05 Agustus 2025 pukul 10:45:00',
    last_payment_amount: 3850000,
    last_payment_location: 'UPT PENGELOLAAN PENDAPATAN BENGKALIS',
    pkb_pokok: 1980000,
    pkb_opsen: 1280000,
    pkb_denda: 0,
    pkb_denda_opsen: 0,
    swdkllj: 143000,
    swdkllj_denda: 0,
    pnbp_stnk: 0,
    pnbp_tnkb: 0,
  },
  'BM 1234 AA': {
    tax_status: 'belum_lunas',
    tax_due_date: '2025-12-01',
    last_payment_date: '01 Desember 2024 pukul 14:10:00',
    last_payment_amount: 2750000,
    last_payment_location: 'SAMSAT PEKANBARU',
    pkb_pokok: 1250000,
    pkb_opsen: 812000,
    pkb_denda: 125000,
    pkb_denda_opsen: 81200,
    swdkllj: 143000,
    swdkllj_denda: 32000,
    pnbp_stnk: 0,
    pnbp_tnkb: 0,
  },
  'BM 5678 CD': {
    tax_status: 'jatuh_tempo',
    tax_due_date: '2026-09-15',
    last_payment_date: '15 September 2025 pukul 09:30:00',
    last_payment_amount: 4100000,
    last_payment_location: 'UPT PENGELOLAAN PENDAPATAN PEKANBARU KOTA',
    pkb_pokok: 2580000,
    pkb_opsen: 1677000,
    pkb_denda: 0,
    pkb_denda_opsen: 0,
    swdkllj: 143000,
    swdkllj_denda: 0,
    pnbp_stnk: 0,
    pnbp_tnkb: 0,
  },
  'BM 7890 EF': {
    tax_status: 'aktif',
    tax_due_date: '2027-01-20',
    last_payment_date: '20 Januari 2026 pukul 11:15:00',
    last_payment_amount: 3950000,
    last_payment_location: 'SAMSAT CENTRAL PEKANBARU',
    pkb_pokok: 2350000,
    pkb_opsen: 1527000,
    pkb_denda: 0,
    pkb_denda_opsen: 0,
    swdkllj: 143000,
    swdkllj_denda: 0,
    pnbp_stnk: 0,
    pnbp_tnkb: 0,
  },
};

console.log('Menyiapkan database kendaraan...\n');

for (const v of vehicles) {
  upsertVehicle(db, v);
  const t = taxes[v.plate_number];
  if (t) updateVehicleTax(db, v.plate_number, t);
  console.log(`✓ ${v.plate_number} - ${v.brand} ${v.type}`);
}

console.log('\nSelesai! Database siap digunakan.');
console.log(`Database tersimpan di: ${dbPath}`);
