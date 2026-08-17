import {clean,currentUser,db,json} from './_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid.'});

    const raw=clean(decodeURIComponent(req.query.plate||''),30).toUpperCase();
    if(!raw) return json(res,400,{error:'Nomor polisi wajib diisi.'});

    // Strip all non-alphanumeric to get the key: "BM 1658 OH" → "BM1658OH"
    const key=raw.replace(/[^A-Z0-9]/g,'');
    if(!key) return json(res,400,{error:'Nomor polisi tidak valid.'});

    // Try multiple common formats stored in DB
    const num=key.replace(/^BM/,'').replace(/[A-Z]{1,3}$/,'');
    const suf=key.replace(/^BM\d{1,4}/,'');
    const formats=[
      'BM '+num+' '+suf,
      'BM-'+num+'-'+suf,
      'BM'+num+suf,
      'BM '+num+'-'+suf,
      'BM-'+num+' '+suf,
    ];
    const conditions=formats.map(f=>'no_polisi.eq.'+f).join(',');

    const {data,error}=await client.from('arrears').select('*').or(conditions).limit(1).maybeSingle();
    if(error) throw error;
    if(!data) return json(res,404,{error:'Data kendaraan tidak ditemukan untuk plat '+raw});
    return json(res,200,data);
  }catch(error){
    console.error('Vehicle lookup error:',error);
    return json(res,500,{error:'Gagal mencari kendaraan.'});
  }
}
