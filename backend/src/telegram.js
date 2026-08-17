import 'dotenv/config';
import { updateVehicleTax, insertReport, insertLog, getVehicle } from './db.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function tg(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function handleTelegramUpdate(update, db) {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query, db);
    return;
  }

  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  const user = msg.from;

  insertLog(db, {
    telegram_chat_id: chatId,
    telegram_user_name: user?.first_name || '',
    command: text.split(' ')[0] || 'text',
    message: text,
  });

  if (text === '/start' || text === '/help') {
    await tg('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text:
        'Selamat datang di <b>Aksi Tempel Digital</b>\n\n' +
        'Ketik perintah:\n' +
        '/cari [nomor polisi]  → cek pajak kendaraan\n\n' +
        'Contoh:\n' +
        '/cari BM 1658 OH\n\n' +
        'Setelah data ditampilkan, pilih layanan:\n' +
        '• <b>Tahunan</b> → perpanjangan STNK tahunan\n' +
        '• <b>5 Tahunan</b> → perpanjangan STNK + plat nomor\n' +
        '• <b>BBN</b> → balik nama kendaraan',
    });
    return;
  }

  if (text.startsWith('/cari ')) {
    const plate = text
      .replace('/cari', '')
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .trim();

    if (plate.length < 3) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Nomor polisi tidak valid. Ketik /cari diikuti nomor polisi.',
      });
      return;
    }

    const vehicle = getVehicle(db, plate);

    if (!vehicle) {
      await tg('sendMessage', {
        chat_id: chatId,
        parse_mode: 'HTML',
        text:
          `Kendaraan <b>${plate}</b> belum terdaftar di database.\n\n` +
          'Ketik /cari diikuti nomor polisi yang benar.',
      });
      return;
    }

    insertReport(db, {
      plate_number: plate,
      service_type: 'pencarian',
      officer_name: user?.first_name || '',
      officer_telegram_id: user?.id || 0,
      latitude: 0,
      longitude: 0,
      address: '',
      photo_file_id: '',
      notes: `Dicari oleh ${user?.first_name || ''}`,
    });

    const totalEstimate =
      vehicle.pkb_pokok +
      vehicle.pkb_opsen +
      vehicle.pkb_denda +
      vehicle.pkb_denda_opsen +
      vehicle.swdkllj +
      vehicle.swdkllj_denda +
      vehicle.pnbp_stnk +
      vehicle.pnbp_tnkb;

    const dueDate = vehicle.tax_due_date || '-';
    const lastPaid = vehicle.last_payment_date || '-';
    const lastPaidAmount = vehicle.last_payment_amount
      ? `Rp. ${vehicle.last_payment_amount.toLocaleString('id-ID')}`
      : '-';
    const lastPaidLocation = vehicle.last_payment_location || '-';

    const taxStatusEmoji =
      vehicle.tax_status === 'aktif' ? '✅' : vehicle.tax_status === 'jatuh_tempo' ? '⚠️' : '❌';

    const daysUntilDue = vehicle.tax_due_date
      ? Math.floor(
          (new Date(vehicle.tax_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    const daysText = daysUntilDue > 0 ? `${daysUntilDue} hari lagi` : 'sudah lewat';

    const textInfo =
      `Informasi Kendaraan\n` +
      `NRKB: <b>${plate}</b>\n` +
      `Nama: <b>${vehicle.owner_name || '-'}</b>\n` +
      `Alamat: ${vehicle.address || '-'}\n` +
      `Merk: ${vehicle.brand || '-'}\n` +
      `Type: ${vehicle.type || '-'}\n` +
      `Golongan: ${vehicle.vehicle_class || '-'}\n` +
      `Jenis: ${vehicle.vehicle_type || '-'}\n` +
      `Tahun Buat: ${vehicle.year || '-'}\n` +
      `Warna TNKB: ${vehicle.plate_color || '-'}\n` +
      `Warna Kendaraan: ${vehicle.color || '-'}\n\n` +
      `Informasi Pembayaran Sebelumnya\n` +
      `Lokasi Bayar: ${lastPaidLocation}\n` +
      `Tanggal Bayar: ${lastPaid}\n` +
      `Total Bayar: ${lastPaidAmount}\n\n` +
      `Estimasi Pajak yang harus dibayar\n` +
      `Tanggal Jatuh Tempo: <b>${dueDate}</b>\n` +
      `Status Pajak: <b>${vehicle.tax_status || '-'} ${taxStatusEmoji} hingga ${daysText}</b>\n` +
      `Total Estimasi Pembayaran: <b>Rp. ${totalEstimate.toLocaleString('id-ID')}</b>\n\n` +
      `Rincian pembayaran sebagai berikut\n` +
      `Pajak Kendaraan Bermotor (PKB)\n` +
      `• Pokok PKB: Rp. ${vehicle.pkb_pokok.toLocaleString('id-ID')}\n` +
      `• Pokok PKB Opsen: Rp. ${vehicle.pkb_opsen.toLocaleString('id-ID')}\n` +
      `• Denda PKB: Rp. ${vehicle.pkb_denda.toLocaleString('id-ID')}\n` +
      `• Denda PKB Opsen: Rp. ${vehicle.pkb_denda_opsen.toLocaleString('id-ID')}\n\n` +
      `SWDKLLJ\n` +
      `• Pokok SWDKLLJ: Rp. ${vehicle.swdkllj.toLocaleString('id-ID')}\n` +
      `• Denda SWDKLLJ: Rp. ${vehicle.swdkllj_denda.toLocaleString('id-ID')}\n\n` +
      `Biaya Administrasi\n` +
      `• PNBP STNK: Rp. ${vehicle.pnbp_stnk.toLocaleString('id-ID')}\n` +
      `• PNBP TNKB: Rp. ${vehicle.pnbp_tnkb.toLocaleString('id-ID')}\n\n` +
      `Nilai Estimasi adalah perkiraan dan dapat berubah.\n` +
      `Silakan hubungi petugas Samsat terdekat untuk informasi lebih lanjut.\n\n` +
      `Pilih layanan:`;

    await tg('sendMessage', {
      chat_id: chatId,
      parse_mode: 'HTML',
      text: textInfo,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📅 Tahunan', callback_data: `tahunan:${plate}` },
            { text: '🪪 5 Tahunan', callback_data: `5tahunan:${plate}` },
          ],
          [{ text: '📝 BBN', callback_data: `bbn:${plate}` }],
        ],
      },
    });
    return;
  }

  await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text:
      'Ketik <b>/cari</b> diikuti nomor polisi kendaraan untuk mencari data pajak.',
  });
}

async function handleCallbackQuery(callbackQuery, db) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data || '';
  const [service, plate] = data.split(':');

  await tg('answerCallbackQuery', {
    callback_query_id: callbackQuery.id,
    text: `Layanan ${service === '5tahunan' ? '5 Tahunan' : service === 'bbn' ? 'BBN' : 'Tahunan'} dipilih`,
  });

  insertLog(db, {
    telegram_chat_id: chatId,
    telegram_user_name: callbackQuery.from?.first_name || '',
    command: 'callback',
    message: `${service}:${plate}`,
  });

  if (!plate) {
    await tg('sendMessage', { chat_id: chatId, text: 'Terjadi kesalahan data.' });
    return;
  }

  const vehicle = db.prepare('SELECT * FROM vehicles WHERE plate_number = ?').get(plate);
  if (!vehicle) {
    await tg('sendMessage', { chat_id: chatId, text: 'Data kendaraan tidak ditemukan.' });
    return;
  }

  const typeName =
    service === '5tahunan' ? 'Perpanjangan STNK + Plat (5 Tahunan)' :
    service === 'bbn' ? 'Balik Nama Kendaraan (BBN)' :
    'Perpanjangan STNK Tahunan';

  let extra = '';

  if (service === '5tahunan') {
    extra =
      `\nBiaya tambahan 5 Tahunan:\n` +
      `• Biaya Plat Nomor: Rp. 100.000\n` +
      `• Biaya STNK Baru: Rp. 200.000\n` +
      `• Biaya Fisik Cek: Rp. 50.000\n`;
  } else if (service === 'bbn') {
    extra =
      `\nBiaya tambahan BBN (Balik Nama):\n` +
      `• BBN-KB (4%): Rp. ${Math.round(vehicle.pkb_pokok * 0.04 * 1.1).toLocaleString('id-ID')}\n` +
      `• Biaya administrasi: Rp. 80.000\n` +
      `• Proses balik nama Samsat: Rp. 250.000\n`;
  }

  const totalEstimate =
    vehicle.pkb_pokok +
    vehicle.pkb_opsen +
    vehicle.pkb_denda +
    vehicle.pkb_denda_opsen +
    vehicle.swdkllj +
    vehicle.swdkllj_denda +
    vehicle.pnbp_stnk +
    vehicle.pnbp_tnkb;

  const textInfo =
    `Layanan: <b>${typeName}</b>\n` +
    `NRKB: <b>${plate}</b>\n` +
    `Pemilik: ${vehicle.owner_name || '-'}\n\n` +
    `Rincian Pembayaran:\n` +
    `Pajak Kendaraan Bermotor (PKB)\n` +
    `• Pokok PKB: Rp. ${vehicle.pkb_pokok.toLocaleString('id-ID')}\n` +
    `• Pokok PKB Opsen: Rp. ${vehicle.pkb_opsen.toLocaleString('id-ID')}\n` +
    `• Denda PKB: Rp. ${vehicle.pkb_denda.toLocaleString('id-ID')}\n` +
    `• Denda PKB Opsen: Rp. ${vehicle.pkb_denda_opsen.toLocaleString('id-ID')}\n\n` +
    `SWDKLLJ\n` +
    `• Pokok SWDKLLJ: Rp. ${vehicle.swdkllj.toLocaleString('id-ID')}\n` +
    `• Denda SWDKLLJ: Rp. ${vehicle.swdkllj_denda.toLocaleString('id-ID')}\n\n` +
    `Biaya Administrasi\n` +
    `• PNBP STNK: Rp. ${vehicle.pnbp_stnk.toLocaleString('id-ID')}\n` +
    `• PNBP TNKB: Rp. ${vehicle.pnbp_tnkb.toLocaleString('id-ID')}` +
    extra +
    `\n<b>Total Estimasi: Rp. ${totalEstimate.toLocaleString('id-ID')}</b>\n` +
    `Status Pajak: ${vehicle.tax_status || '-'}\n\n` +
    `Nilai Estimasi adalah perkiraan dan dapat berubah.`;

  insertReport(db, {
    plate_number: plate,
    service_type: service,
    officer_name: callbackQuery.from?.first_name || '',
    officer_telegram_id: callbackQuery.from?.id || 0,
    latitude: 0,
    longitude: 0,
    address: '',
    photo_file_id: '',
    notes: `Layanan ${typeName} dipilih`,
  });

  await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: textInfo,
  });
}
