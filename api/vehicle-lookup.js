import {clean,db,json} from './_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const raw=clean(decodeURIComponent(req.query.plate||''),30).toUpperCase();
    if(!raw) return json(res,400,{error:'Nomor polisi wajib diisi.'});

    // Normalize: user input "1658 OH" → "BM 1658 OH"
    let plate=raw;
    if(!plate.startsWith('BM')){
      plate='BM '+plate;
    }
    // Normalize spacing: "BM  1658  OH" → "BM 1658 OH"
    plate=plate.replace(/\s+/g,' ').trim();

    const {data,error}=await client.from('operasi_vehicles').select('*').eq('plate_number',plate).maybeSingle();
    if(error) throw error;
    if(!data) return json(res,404,{error:'Data kendaraan tidak ditemukan untuk plat '+plate});
    return json(res,200,data);
  }catch(error){
    console.error('Vehicle lookup error:',error);
    return json(res,500,{error:'Gagal mencari kendaraan.'});
  }
}
