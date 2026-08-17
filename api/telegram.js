import {db} from './_lib.js';

const telegramUrl=method=>`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
const esc=value=>String(value??'-').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const normalizePlate=value=>{
  let plate=String(value||'').trim().toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ');
  if(!plate.startsWith('BM ')) plate='BM '+plate.replace(/^BM\s*/,'');
  return plate.trim();
};

async function sendTelegram(chatId,text){
  const response=await fetch(telegramUrl('sendMessage'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})});
  if(!response.ok) console.error('Telegram send error',await response.text());
}

function arrearsMessage(v){
  return [
    '🚗 <b>DATA KENDARAAN</b>','',
    `<b>Nomor Polisi:</b> ${esc(v.no_polisi)}`,
    `<b>Nama Pemilik:</b> ${esc(v.nama_pemilik)}`,
    `<b>No. WhatsApp:</b> ${esc(v.nomor_hp)}`,
    `<b>Alamat:</b> ${esc(v.alamat)}`,
    `<b>Jenis Kendaraan:</b> ${esc(v.jenis_kendaraan)}`,
    `<b>Samsat Asal:</b> ${esc(v.samsat_asal)}`,
    `<b>Jatuh Tempo:</b> ${esc(v.jatuh_tempo)}`,
    `<b>Prioritas:</b> ${esc(v.prioritas)}`,
    `<b>Status:</b> ${esc(v.status)}`,
    '', 'Sumber: Database Data Tunggakan Aksi Tempel Digital'
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
    const isLookup=/^\/(cek|check|cari)\b/i.test(text)||/^\d{1,4}\s*[A-Za-z]{1,3}$/i.test(text)||/^BM\s+\d{1,4}\s*[A-Za-z]{1,3}$/i.test(text);
    if(/^\/(start|help)(?:@\w+)?/i.test(text)){
      await sendTelegram(chatId,'<b>Aksi Tempel Digital</b>\n\nKirim nomor polisi untuk melihat data tunggakan.\nContoh: <code>/cek 1658 OH</code> atau cukup <code>1658 OH</code>');
      return res.status(200).json({ok:true});
    }
    if(!isLookup){
      await sendTelegram(chatId,'Format belum dikenali. Kirim nomor polisi, contoh: <code>/cek 1658 OH</code>');
      return res.status(200).json({ok:true});
    }
    const plate=normalizePlate(command||text);
    const client=db();
    const {data,error}=await client.from('arrears').select('*').eq('no_polisi',plate).maybeSingle();
    if(error) throw error;
    await client.from('operasi_bot_logs').insert({telegram_chat_id:chatId,telegram_user_name:message.from?.username||message.from?.first_name||'',command:text,message:plate}).catch(()=>{});
    if(!data) await sendTelegram(chatId,`❌ Data kendaraan <b>${esc(plate)}</b> tidak ditemukan.`);
    else await sendTelegram(chatId,arrearsMessage(data));
    return res.status(200).json({ok:true});
  }catch(error){
    console.error('Telegram webhook error:',error);
    return res.status(200).json({ok:true});
  }
}
