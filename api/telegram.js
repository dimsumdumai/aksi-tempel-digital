import {db} from './_lib.js';

const telegramUrl=method=>`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
const esc=value=>String(value??'-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const normalizePlate=value=>{
  let plate=String(value||'').trim().toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ');
  if(!plate.startsWith('BM ')) plate='BM '+plate.replace(/^BM\s*/,'');
  return plate.trim();
};

async function sendTelegram(chatId,text){
  const response=await fetch(telegramUrl('sendMessage'),{
    method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})
  });
  if(!response.ok) console.error('Telegram send error',await response.text());
}

function vehicleMessage(v){
  const total=Number(v.pkb_pokok||0)+Number(v.pkb_opsen||0)+Number(v.pkb_denda||0)+Number(v.pkb_denda_opsen||0)+Number(v.swdkllj||0)+Number(v.swdkllj_denda||0)+Number(v.pnbp_stnk||0)+Number(v.pnbp_tnkb||0);
  return [
    '🚗 <b>DATA KENDARAAN</b>',
    '',
    `<b>Nomor Polisi:</b> ${esc(v.plate_number)}`,
    `<b>Nama Pemilik:</b> ${esc(v.owner_name)}`,
    `<b>Alamat:</b> ${esc(v.address)}`,
    `<b>Merk/Type:</b> ${esc(v.brand)} ${esc(v.type)}`,
    `<b>Tahun:</b> ${esc(v.year)}`,
    `<b>Warna:</b> ${esc(v.color)}`,
    `<b>Jenis:</b> ${esc(v.vehicle_type||v.vehicle_class)}`,
    '',
    `<b>Status Pajak:</b> ${esc(v.tax_status)}`,
    `<b>Jatuh Tempo:</b> ${esc(v.tax_due_date)}`,
    `<b>Pembayaran Terakhir:</b> ${esc(v.last_payment_date)}`,
    `<b>Total Komponen:</b> Rp ${total.toLocaleString('id-ID')}`,
    '',
    'Sumber: Database Aksi Tempel Digital'
  ].join('\n');
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(200).json({ok:true,service:'telegram-webhook'});
  const secret=process.env.TELEGRAM_WEBHOOK_SECRET;
  if(secret && req.headers['x-telegram-bot-api-secret-token']!==secret) return res.status(401).json({error:'Unauthorized'});

  try{
    const update=req.body||{};
    const message=update.message;
    if(!message?.chat?.id) return res.status(200).json({ok:true});
    const chatId=message.chat.id;
    const text=String(message.text||'').trim();
    const command=text.replace(/^\/\w+(?:@\w+)?\s*/,'').trim();
    const isLookup=/^\/(cek|check|cari)\b/i.test(text)||/^[A-Za-z]{1,3}\s*\d{1,4}\s*[A-Za-z]{1,3}$/i.test(text);

    if(/^\/(start|help)(?:@\w+)?/i.test(text)){
      await sendTelegram(chatId,'<b>Aksi Tempel Digital</b>\n\nKirim nomor polisi untuk melihat data kendaraan.\nContoh: <code>/cek 1658 OH</code> atau cukup <code>1658 OH</code>');
      return res.status(200).json({ok:true});
    }
    if(!isLookup){
      await sendTelegram(chatId,'Format belum dikenali. Kirim nomor polisi, contoh: <code>/cek 1658 OH</code>');
      return res.status(200).json({ok:true});
    }

    const plate=normalizePlate(command||text);
    const client=db();
    const {data,error}=await client.from('operasi_vehicles').select('*').eq('plate_number',plate).maybeSingle();
    await client.from('operasi_bot_logs').insert({telegram_chat_id:chatId,telegram_user_name:message.from?.username||message.from?.first_name||'',command:text,message:plate});
    if(error) throw error;
    if(!data) await sendTelegram(chatId,`❌ Data kendaraan <b>${esc(plate)}</b> tidak ditemukan.`);
    else await sendTelegram(chatId,vehicleMessage(data));
    return res.status(200).json({ok:true});
  }catch(error){
    console.error('Telegram webhook error:',error);
    return res.status(200).json({ok:true});
  }
}
