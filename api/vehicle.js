import {clean,currentUser,db,json} from './_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid.'});

    const plate=clean(decodeURIComponent(req.query.plate||''),30).toUpperCase();
    if(!plate) return json(res,400,{error:'Nomor polisi wajib diisi.'});

    const {data,error}=await client.from('operasi_vehicles').select('*').eq('plate_number',plate).maybeSingle();
    if(error) throw error;
    if(!data) return json(res,404,{error:'Data kendaraan tidak ditemukan'});
    return json(res,200,data);
  }catch(error){
    console.error('Vehicle lookup error:',error);
    return json(res,500,{error:'Gagal mencari kendaraan.'});
  }
}
