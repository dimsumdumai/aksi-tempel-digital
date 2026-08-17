import {clean,currentUser,db,json} from './_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid.'});

    // GET /api/entries-report
    if(req.method==='GET'){
      const {data:entries,error:e1}=await client.from('operasi_entries').select('id, nopol_code, nopol_suffix, owner_name, vehicle_type, nik, phone, status, scan_source, created_at, created_by').order('created_at',{ascending:false}).limit(200);
      if(e1) throw e1;

      const {data:vehicles,error:e2}=await client.from('operasi_vehicles').select('plate_number, owner_name, tax_status, pkb_pokok, pkb_opsen, swdkllj').order('plate_number');
      if(e2) throw e2;

      return json(res,200,{entries:entries||[],vehicles:vehicles||[]});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(error){
    console.error('Report error:',error);
    return json(res,500,{error:'Gagal memuat laporan.'});
  }
}
