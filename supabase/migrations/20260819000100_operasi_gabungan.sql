-- Migration: tambah tabel operasi gabungan + kendaraan backend
-- Jalankan di Supabase SQL Editor

-- Tabel entri operasi gabungan
CREATE TABLE IF NOT EXISTS public.operasi_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nopol_code TEXT NOT NULL,
  nopol_suffix TEXT NOT NULL,
  nopol_full TEXT GENERATED ALWAYS AS ('BM ' || nopol_code || ' ' || nopol_suffix) STORED,
  owner_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  nik TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  scan_source TEXT DEFAULT '',
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'baru',
  notes TEXT DEFAULT '',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operasi_entries_nopol ON public.operasi_entries(nopol_full);
CREATE INDEX IF NOT EXISTS idx_operasi_entries_created ON public.operasi_entries(created_at DESC);

-- Tabel kendaraan untuk bot Telegram
CREATE TABLE IF NOT EXISTS public.operasi_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_number TEXT UNIQUE NOT NULL,
  owner_name TEXT,
  address TEXT,
  brand TEXT,
  type TEXT,
  year INTEGER,
  color TEXT,
  plate_color TEXT,
  vehicle_class TEXT,
  vehicle_type TEXT,
  tax_status TEXT DEFAULT 'unknown',
  tax_due_date TEXT,
  last_payment_date TEXT,
  last_payment_amount INTEGER DEFAULT 0,
  last_payment_location TEXT,
  pkb_pokok INTEGER DEFAULT 0,
  pkb_opsen INTEGER DEFAULT 0,
  pkb_denda INTEGER DEFAULT 0,
  pkb_denda_opsen INTEGER DEFAULT 0,
  swdkllj INTEGER DEFAULT 0,
  swdkllj_denda INTEGER DEFAULT 0,
  pnbp_stnk INTEGER DEFAULT 0,
  pnbp_tnkb INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operasi_vehicles_plate ON public.operasi_vehicles(plate_number);

-- Tabel log bot Telegram
CREATE TABLE IF NOT EXISTS public.operasi_bot_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_chat_id BIGINT,
  telegram_user_name TEXT,
  command TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel laporan bot Telegram
CREATE TABLE IF NOT EXISTS public.operasi_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate_number TEXT NOT NULL,
  service_type TEXT NOT NULL,
  officer_name TEXT,
  officer_telegram_id BIGINT,
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  address TEXT DEFAULT '',
  photo_file_id TEXT,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'baru',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operasi_reports_plate ON public.operasi_reports(plate_number);

-- Seed data kendaraan contoh
INSERT INTO public.operasi_vehicles (plate_number, owner_name, address, brand, type, year, color, plate_color, vehicle_class, vehicle_type, tax_status, tax_due_date, last_payment_date, last_payment_amount, last_payment_location, pkb_pokok, pkb_opsen, pkb_denda, pkb_denda_opsen, swdkllj, swdkllj_denda, pnbp_stnk, pnbp_tnkb)
VALUES
  ('BM 1658 OH', 'PT. JASA RAHARJA PERSERO', 'JL. JEND. SUDIRMAN PEKANBARU RIAU', 'TOYOTA', 'KIJANG INNOVA 2.0 V M/T', 2016, 'SILVER METALIK', 'PUTIH', 'MINIBUS', 'MOBIL PENUMPANG', 'aktif', '2027-03-11', '04 Maret 2026 pukul 08:20:15', 4182797, 'UPT PENGELOLAAN PENDAPATAN PEKANBARU KOTA, KELAS A', 2252891, 1486908, 0, 0, 143000, 0, 0, 0),
  ('BM 9929 FN', 'PT. BENGKALIS SEJAHTERA', 'JL. AHMAD YANI BENGKALIS RIAU', 'SUZUKI', 'ERTIGA GL M/T', 2020, 'MERAH', 'PUTIH', 'MINIBUS', 'MOBIL PENUMPANG', 'aktif', '2027-08-01', '05 Agustus 2025 pukul 10:45:00', 3850000, 'UPT PENGELOLAAN PENDAPATAN BENGKALIS', 1980000, 1280000, 0, 0, 143000, 0, 0, 0),
  ('BM 1234 AA', 'SITI RAHMAWATI', 'JL. GATOT SUBROTO PEKANBARU RIAU', 'HONDA', 'BRIO SATYA S M/T', 2022, 'PUTIH', 'HITAM', 'SEDAN', 'MOBIL PENUMPANG', 'belum_lunas', '2025-12-01', '01 Desember 2024 pukul 14:10:00', 2750000, 'SAMSAT PEKANBARU', 1250000, 812000, 125000, 81200, 143000, 32000, 0, 0),
  ('BM 5678 CD', 'BUDI SETIAWAN', 'JL. DIPONEGORO PEKANBARU RIAU', 'MITSUBISHI', 'XPANDER ULTIMATE CVT', 2021, 'HITAM METALIK', 'HITAM', 'MINIBUS', 'MOBIL PENUMPANG', 'jatuh_tempo', '2026-09-15', '15 September 2025 pukul 09:30:00', 4100000, 'UPT PENGELOLAAN PENDAPATAN PEKANBARU KOTA', 2580000, 1677000, 0, 0, 143000, 0, 0, 0),
  ('BM 7890 EF', 'Pemerintah Kota Pekanbaru', 'JL. JEND. SUDIRMAN PEKANBARU RIAU', 'TOYOTA', 'AVANZA 1.5 G CVT', 2023, 'PUTIH', 'HITAM', 'MINIBUS', 'MOBIL PENUMPANG', 'aktif', '2027-01-20', '20 Januari 2026 pukul 11:15:00', 3950000, 'SAMSAT CENTRAL PEKANBARU', 2350000, 1527000, 0, 0, 143000, 0, 0, 0)
ON CONFLICT (plate_number) DO NOTHING;

-- RLS (Row Level Security) - semua user login bisa akses
ALTER TABLE public.operasi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operasi_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operasi_bot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operasi_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.operasi_entries FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.operasi_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated read" ON public.operasi_vehicles FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.operasi_vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated read" ON public.operasi_vehicles FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert" ON public.operasi_bot_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated read" ON public.operasi_reports FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.operasi_reports FOR INSERT WITH CHECK (true);
