const clean = (value = '') => String(value).replace(/[\^~]/g, '').trim();
export const TAX_INFO_URL = 'https://bapenda.riau.go.id/dashboard/layanan/infopajak';

// Zebra BLE Service & Characteristic UUIDs (Nordic UART / Zebra ISSC)
const ZEBRA_BLE_SERVICE = '49535343-fe7d-4ae5-8fa9-9fafd205e455';
const ZEBRA_BLE_TX      = '49535343-1e4d-4bd9-ba61-23c647249616';
const ZEBRA_BLE_RX      = '49535343-8841-43f4-a894-3da7fe7df90c';
const BLE_CHUNK_SIZE    = 20;
const BLE_CHUNK_DELAY   = 50;

export const buildNoticeId = (date = new Date()) => {
  const stamp = date.toISOString().replace(/\D/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RIAU-${stamp}-${random}`;
};

export const buildCpcl = (notice) => {
  const n = Object.fromEntries(Object.entries(notice).map(([key, value]) => [key, clean(value)]));
  return `! 0 200 200 1000 1
CENTER
TEXT 4 0 0 25 TIM PEMBINA SAMSAT
TEXT 4 0 0 60 PROVINSI RIAU
LINE 20 100 555 100 2
TEXT 4 0 0 125 PEMBERITAHUAN KEPATUHAN
TEXT 4 0 0 160 PAJAK KENDARAAN BERMOTOR
TEXT 7 0 0 220 ${n.no_polisi}
LEFT
TEXT 0 2 25 295 Terpantau: ${n.date} ${n.time}
TEXT 0 2 25 330 Lokasi: ${n.lokasi}
TEXT 0 2 25 385 Berdasarkan monitoring lapangan, kendaraan
TEXT 0 2 25 415 ini terindikasi belum memenuhi kewajiban
TEXT 0 2 25 445 PKB dan/atau SWDKLLJ sesuai data saat ini.
TEXT 0 2 25 490 Jika telah melakukan pembayaran, abaikan
TEXT 0 2 25 520 pemberitahuan ini. Terima kasih.
CENTER
BARCODE QR 180 565 M 2 U 6
MA,${TAX_INFO_URL}
ENDQR
TEXT 0 2 0 760 SCAN UNTUK CEK INFO PAJAK TERKINI
TEXT 0 2 0 800 BAWA KERTAS INI KE SAMSAT UNTUK MEMBAYAR
TEXT 0 2 0 830 DAN DAPATKAN SOUVENIR DARI TIM PEMBINA SAMSAT
TEXT 0 2 0 870 ID: ${n.notice_id}
TEXT 0 2 0 910 BAPENDA - POLRI - JASA RAHARJA
TEXT 0 2 0 940 TIM PEMBINA SAMSAT PROVINSI RIAU
FORM
PRINT
`;
};

export const buildZpl = (notice) => {
  const n = Object.fromEntries(Object.entries(notice).map(([key, value]) => [key, clean(value)]));
  return `^XA^PW600^LL1000^CI28
^CF0,30^FO30,30^FB540,1,0,C^FDTIM PEMBINA SAMSAT^FS
^FO30,70^FB540,1,0,C^FDPROVINSI RIAU^FS
^FO25,115^GB550,2,2^FS
^CF0,26^FO30,145^FB540,2,5,C^FDPEMBERITAHUAN KEPATUHAN\\&PAJAK KENDARAAN BERMOTOR^FS
^CF0,58^FO30,235^FB540,1,0,C^FD${n.no_polisi}^FS
^CF0,23^FO35,325^FDTerpantau: ${n.date} ${n.time}^FS
^FO35,360^FB525,2,4,L^FDLokasi: ${n.lokasi}^FS
^FO35,425^FB525,5,5,L^FDBerdasarkan monitoring lapangan, kendaraan ini terindikasi belum memenuhi kewajiban PKB dan/atau SWDKLLJ sesuai data saat ini. Jika telah membayar, abaikan pemberitahuan ini.^FS
^FO205,610^BQN,2,5^FDLA,${TAX_INFO_URL}^FS
^CF0,18^FO30,770^FB540,1,0,C^FDSCAN UNTUK CEK INFO PAJAK TERKINI^FS
^CF0,21^FO30,805^FB540,2,3,C^FDBAWA KERTAS INI KE SAMSAT UNTUK MELAKUKAN PEMBAYARAN DAN DAPATKAN SOUVENIR DARI TIM PEMBINA SAMSAT^FS
^CF0,18^FO30,875^FB540,1,0,C^FDID: ${n.notice_id}^FS
^FO30,915^FB540,1,0,C^FDBAPENDA - POLRI - JASA RAHARJA^FS
^FO30,950^FB540,1,0,C^FDTIM PEMBINA SAMSAT PROVINSI RIAU^FS^XZ`;
};

export const downloadPrinterPayload = (notice, language = 'CPCL') => {
  const content = language === 'ZPL' ? buildZpl(notice) : buildCpcl(notice);
  const blob = new Blob([content], {type: 'text/plain;charset=utf-8'});
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${notice.notice_id}.${language.toLowerCase()}`;
  anchor.click();
  URL.revokeObjectURL(href);
};

export const sendToZebraBridge = async (notice, language = 'CPCL') => {
  const raw = language === 'ZPL' ? buildZpl(notice) : buildCpcl(notice);
  if (window.ZebraPrinterBridge?.print) {
    await window.ZebraPrinterBridge.print(raw, language);
    return {ok: true, transport: 'native-bridge'};
  }
  return {ok: false, transport: 'unavailable'};
};

export const getZebraCapability = () => {
  const bridge = window.ZebraPrinterBridge;
  const ua = navigator.userAgent || '';
  return {bridgeAvailable:Boolean(bridge?.connect&&bridge?.print),platform:/iPhone|iPad|iPod/i.test(ua)?'ios':/Android/i.test(ua)?'android':'web'};
};

const parseBridgeResult=(result)=>typeof result==='string'?JSON.parse(result):result;
export const connectZebraBridge=async()=>window.ZebraPrinterBridge?.connect?parseBridgeResult(await window.ZebraPrinterBridge.connect()):{ok:false,status:'bridge-unavailable'};
export const getZebraBridgeStatus=async()=>window.ZebraPrinterBridge?.getStatus?parseBridgeResult(await window.ZebraPrinterBridge.getStatus()):{connected:false,status:'bridge-unavailable'};
export const disconnectZebraBridge=async()=>{if(!window.ZebraPrinterBridge?.disconnect)return {ok:false};await window.ZebraPrinterBridge.disconnect();return {ok:true}};
export const testZebraBridge=async(language='CPCL')=>{if(!window.ZebraPrinterBridge?.print)return {ok:false};const raw=language==='ZPL'?'^XA^PW600^LL220^CF0,30^FO30,30^FB540,1,0,C^FDTEST PRINTER ZEBRA^FS^FO30,90^FB540,2,5,C^FDTIM PEMBINA SAMSAT PROVINSI RIAU\\&KONEKSI BERHASIL^FS^XZ':'! 0 200 200 220 1\nCENTER\nTEXT 4 0 0 30 TEST PRINTER ZEBRA\nTEXT 0 2 0 85 TIM PEMBINA SAMSAT PROVINSI RIAU\nTEXT 0 2 0 125 KONEKSI BERHASIL\nFORM\nPRINT\n';await window.ZebraPrinterBridge.print(raw,language);return {ok:true}};

/* ========== Web Bluetooth (BLE) for Zebra iMZ320 ========== */

let bleDevice = null;
let bleCharacteristic = null;
let bleServer = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const isWebBluetoothAvailable = () => !!(navigator.bluetooth);

const connectWebBluetooth = async () => {
  if (!navigator.bluetooth) throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome Android.');

  bleDevice = await navigator.bluetooth.requestDevice({
    filters: [
      { services: [ZEBRA_BLE_SERVICE] },
      { namePrefix: 'Zebra' },
      { namePrefix: 'MZ' },
      { namePrefix: 'iMZ' },
    ],
    optionalServices: [ZEBRA_BLE_SERVICE]
  });

  bleDevice.addEventListener('gattserverdisconnected', () => {
    bleCharacteristic = null;
    bleServer = null;
  });

  bleServer = await bleDevice.gatt.connect();

  let service;
  try {
    service = await bleServer.getPrimaryService(ZEBRA_BLE_SERVICE);
  } catch {
    // Try generic UART service as fallback
    service = await bleServer.getPrimaryService('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  }

  bleCharacteristic = await service.getCharacteristic(ZEBRA_BLE_TX);

  return { ok: true, name: bleDevice.name || 'Zebra Printer', transport: 'web-bluetooth' };
};

const sendViaWebBluetooth = async (data, onProgress) => {
  if (!bleCharacteristic) throw new Error('Printer belum tersambung via Bluetooth.');

  const bytes = new TextEncoder().encode(data);
  const totalChunks = Math.ceil(bytes.length / BLE_CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * BLE_CHUNK_SIZE;
    const chunk = bytes.slice(start, start + BLE_CHUNK_SIZE);
    await bleCharacteristic.writeValueWithoutResponse(chunk);
    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
    if (i < totalChunks - 1) await sleep(BLE_CHUNK_DELAY);
  }

  return { ok: true };
};

const disconnectWebBluetooth = async () => {
  if (bleDevice?.gatt?.connected) {
    bleDevice.gatt.disconnect();
  }
  bleCharacteristic = null;
  bleServer = null;
  bleDevice = null;
  return { ok: true };
};

const getWebBluetoothStatus = () => ({
  connected: !!(bleDevice?.gatt?.connected),
  name: bleDevice?.name || null
});

export { isWebBluetoothAvailable, connectWebBluetooth, sendViaWebBluetooth, disconnectWebBluetooth, getWebBluetoothStatus };
