import {clean,currentUser,db,json} from './_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid.'});

    if(req.method==='GET'){
      const isReport=req.query.report==='1';
      if(isReport){
        const {data:entries,error:e1}=await client.from('operasi_entries').select('id, nopol_code, nopol_suffix, owner_name, vehicle_type, nik, phone, status, scan_source, created_at, created_by').order('created_at',{ascending:false}).limit(200);
        if(e1) throw e1;
        const {data:vehicles,error:e2}=await client.from('operasi_vehicles').select('plate_number, owner_name, tax_status, pkb_pokok, pkb_opsen, swdkllj').order('plate_number');
        if(e2) throw e2;
        return json(res,200,{entries:entries||[],vehicles:vehicles||[]});
      }
      const {data,error}=await client.from('operasi_entries').select('*').order('created_at',{ascending:false}).limit(200);
      if(error) throw error;
      return json(res,200,data||[]);
    }

    if(req.method==='POST'){
      const b=bodyOf(req);
      const nopol_code=clean(b.nopol_code,10).toUpperCase();
      const nopol_suffix=clean(b.nopol_suffix,5).toUpperCase();
      const owner_name=clean(b.owner_name,200);
      const vehicle_type=clean(b.vehicle_type,50);
      const nik=clean(b.nik,20);
      const phone=clean(b.phone,30);
      const address=clean(b.address,500);
      const scan_source=clean(b.scan_source,50);
      const notes=clean(b.notes,500);
      const latitude=b.latitude||0;
      const longitude=b.longitude||0;

      if(!nopol_code||!nopol_suffix||!owner_name||!vehicle_type||!nik||!phone){
        return json(res,400,{error:'Semua field wajib diisi'});
      }

      const {data,error}=await client.from('operasi_entries').insert({
        nopol_code,nopol_suffix,owner_name,vehicle_type,nik,phone,
        address,scan_source,notes,latitude,longitude,status:'baru',
        created_by:user.username
      }).select('id').single();

      if(error) throw error;
      return json(res,200,{success:true,id:data.id});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(error){
    console.error('Entries error:',error);
    return json(res,500,{error:'Gagal memproses data.'});
  }
}
