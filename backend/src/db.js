import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

let db = null;
let dbPath = '';

function save() {
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
}

const handler = {
  get(target, prop) {
    if (prop === 'save') return save;
    if (prop === '_db') return db;
    return target[prop];
  }
};

export async function initDatabase(path) {
  dbPath = path;
  const SQL = await initSqlJs();

  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');

  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plate_number TEXT NOT NULL,
      service_type TEXT NOT NULL,
      officer_name TEXT,
      officer_telegram_id INTEGER,
      latitude REAL,
      longitude REAL,
      address TEXT,
      photo_file_id TEXT,
      notes TEXT,
      status TEXT DEFAULT 'baru',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_chat_id INTEGER,
      telegram_user_name TEXT,
      command TEXT NOT NULL,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nopol_code TEXT NOT NULL,
      nopol_suffix TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      nik TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT DEFAULT '',
      scan_source TEXT DEFAULT '',
      latitude REAL DEFAULT 0,
      longitude REAL DEFAULT 0,
      status TEXT DEFAULT 'baru',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return new Proxy({}, handler);
}

function query(sql, params = {}) {
  const stmt = db.prepare(sql);
  if (Object.keys(params).length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params = {}) {
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0];
  const changes = db.getRowsModified();
  save();
  return { lastInsertRowid: id, changes };
}

function runAll(sql, params = {}) {
  db.run(sql, params);
  save();
}

export function upsertVehicle(database, data) {
  runAll(`
    INSERT INTO vehicles (plate_number, owner_name, address, brand, type, year, color, plate_color, vehicle_class, vehicle_type)
    VALUES ($plate_number, $owner_name, $address, $brand, $type, $year, $color, $plate_color, $vehicle_class, $vehicle_type)
  `, {
    $plate_number: data.plate_number,
    $owner_name: data.owner_name,
    $address: data.address,
    $brand: data.brand,
    $type: data.type,
    $year: data.year,
    $color: data.color,
    $plate_color: data.plate_color,
    $vehicle_class: data.vehicle_class,
    $vehicle_type: data.vehicle_type
  });

  runAll(`
    UPDATE vehicles SET
      owner_name = $owner_name, address = $address, brand = $brand, type = $type,
      year = $year, color = $color, plate_color = $plate_color,
      vehicle_class = $vehicle_class, vehicle_type = $vehicle_type, updated_at = datetime('now')
    WHERE plate_number = $plate_number AND id IS NOT NULL
  `, {
    $plate_number: data.plate_number,
    $owner_name: data.owner_name,
    $address: data.address,
    $brand: data.brand,
    $type: data.type,
    $year: data.year,
    $color: data.color,
    $plate_color: data.plate_color,
    $vehicle_class: data.vehicle_class,
    $vehicle_type: data.vehicle_type
  });
}

export function updateVehicleTax(database, plateNumber, taxData) {
  runAll(`
    UPDATE vehicles SET
      tax_status = $tax_status, tax_due_date = $tax_due_date,
      last_payment_date = $last_payment_date, last_payment_amount = $last_payment_amount,
      last_payment_location = $last_payment_location,
      pkb_pokok = $pkb_pokok, pkb_opsen = $pkb_opsen,
      pkb_denda = $pkb_denda, pkb_denda_opsen = $pkb_denda_opsen,
      swdkllj = $swdkllj, swdkllj_denda = $swdkllj_denda,
      pnbp_stnk = $pnbp_stnk, pnbp_tnkb = $pnbp_tnkb,
      updated_at = datetime('now')
    WHERE plate_number = $plate_number
  `, {
    $plate_number: plateNumber,
    $tax_status: taxData.tax_status,
    $tax_due_date: taxData.tax_due_date,
    $last_payment_date: taxData.last_payment_date,
    $last_payment_amount: taxData.last_payment_amount,
    $last_payment_location: taxData.last_payment_location,
    $pkb_pokok: taxData.pkb_pokok,
    $pkb_opsen: taxData.pkb_opsen,
    $pkb_denda: taxData.pkb_denda,
    $pkb_denda_opsen: taxData.pkb_denda_opsen,
    $swdkllj: taxData.swdkllj,
    $swdkllj_denda: taxData.swdkllj_denda,
    $pnbp_stnk: taxData.pnbp_stnk,
    $pnbp_tnkb: taxData.pnbp_tnkb
  });
}

export function insertReport(database, data) {
  return run(`
    INSERT INTO reports (plate_number, service_type, officer_name, officer_telegram_id, latitude, longitude, address, photo_file_id, notes)
    VALUES ($plate_number, $service_type, $officer_name, $officer_telegram_id, $latitude, $longitude, $address, $photo_file_id, $notes)
  `, {
    $plate_number: data.plate_number,
    $service_type: data.service_type,
    $officer_name: data.officer_name,
    $officer_telegram_id: data.officer_telegram_id,
    $latitude: data.latitude,
    $longitude: data.longitude,
    $address: data.address,
    $photo_file_id: data.photo_file_id,
    $notes: data.notes
  });
}

export function insertLog(database, data) {
  runAll(`
    INSERT INTO bot_logs (telegram_chat_id, telegram_user_name, command, message)
    VALUES ($telegram_chat_id, $telegram_user_name, $command, $message)
  `, {
    $telegram_chat_id: data.telegram_chat_id,
    $telegram_user_name: data.telegram_user_name,
    $command: data.command,
    $message: data.message
  });
}

export function insertEntry(database, data) {
  return run(`
    INSERT INTO entries (nopol_code, nopol_suffix, owner_name, vehicle_type, nik, phone, address, scan_source, latitude, longitude, notes)
    VALUES ($nopol_code, $nopol_suffix, $owner_name, $vehicle_type, $nik, $phone, $address, $scan_source, $latitude, $longitude, $notes)
  `, {
    $nopol_code: data.nopol_code,
    $nopol_suffix: data.nopol_suffix,
    $owner_name: data.owner_name,
    $vehicle_type: data.vehicle_type,
    $nik: data.nik,
    $phone: data.phone,
    $address: data.address || '',
    $scan_source: data.scan_source || '',
    $latitude: data.latitude || 0,
    $longitude: data.longitude || 0,
    $notes: data.notes || ''
  });
}

export function getEntries(database) {
  return query('SELECT * FROM entries ORDER BY created_at DESC');
}

export function getReports(database) {
  return query('SELECT id, plate_number, service_type, status, officer_name, latitude, longitude, created_at FROM reports ORDER BY created_at DESC LIMIT 200');
}

export function getVehicle(database, plate) {
  const rows = query('SELECT * FROM vehicles WHERE plate_number = $plate', { $plate: plate });
  return rows[0] || null;
}

export function getAllVehicles(database) {
  return query('SELECT * FROM vehicles');
}
