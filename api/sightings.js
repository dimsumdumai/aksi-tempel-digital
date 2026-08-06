import {clean,currentUser,db,json} from './_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});

    // GET: list sightings with signed URLs
    if(req.method==='GET'){
      let query=client.from('sightings').select('*').order('captured_at',{ascending:false}).limit(user.role==='user'?1000:2000);
      if(user.role==='user') query=query.eq('created_by',user.username);
      const {data,error}=await query;
      if(error)throw error;
      const rows=await Promise.all((data||[]).map(async row=>{
        let foto='';if(row.evidence_key){const {data:signed}=await client.storage.from('vehicle-evidence').createSignedUrl(row.evidence_key,3600);foto=signed?.signedUrl||'';}
        return {...row,...(row.vehicle_data||{}),petugas:row.petugas_name,lokasi:row.lokasi,foto,date:row.captured_at.slice(0,10),time:new Date(row.captured_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})};
      }));
      return json(res,200,{rows});
    }

    // POST: create sighting with evidence upload
    if(req.method==='POST'){
      const body=bodyOf(req),id=clean(body.id,80),noticeId=clean(body.notice_id,120),plate=clean(body.no_polisi,24).toUpperCase();
      if(!id||!noticeId||!plate||!clean(body.lokasi)) return json(res,400,{error:'Data temuan belum lengkap.'});
      let evidenceKey=null;
      const match=clean(body.foto,7000000).match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      if(match){evidenceKey=user.username+'/'+new Date().toISOString().slice(0,10)+'/'+id+'.jpg';const {error}=await client.storage.from('vehicle-evidence').upload(evidenceKey,Buffer.from(match[2],'base64'),{contentType:match[1],upsert:false});if(error)throw error;}
      const vehicleData={nama_pemilik_terakhir:clean(body.nama_pemilik_terakhir),nomor_hp:clean(body.nomor_hp,40),alamat_pemilik_terakhir:clean(body.alamat_pemilik_terakhir,1000),tgl_mati_yad:clean(body.tgl_mati_yad,80),deskripsi_jenis_kendaraan:clean(body.deskripsi_jenis_kendaraan,250),samsat_asal_nama:clean(body.samsat_asal_nama,250),prioritas:clean(body.prioritas,80)};
      const {error}=await client.from('sightings').insert({id,notice_id:noticeId,no_polisi:plate,created_by:user.username,petugas_name:user.name,lokasi:clean(body.lokasi,1000),captured_at:body.captured_at||new Date().toISOString(),status:clean(body.status,80)||'Belum Dihubungi',print_status:clean(body.print_status,80)||'Belum Dicetak',evidence_key:evidenceKey,vehicle_data:vehicleData});
      if(error)throw error;
      return json(res,201,{saved:true,evidence:!!evidenceKey});
    }

    // PATCH: update status/print_status
    if(req.method==='PATCH'){
      const body=bodyOf(req),id=clean(body.id,80);
      if(!id) return json(res,400,{error:'ID temuan diperlukan.'});
      const fields={};if(body.status)fields.status=clean(body.status,80);if(body.print_status)fields.print_status=clean(body.print_status,80);
      if(!Object.keys(fields).length) return json(res,400,{error:'Tidak ada field yang diupdate.'});
      const {error}=await client.from('sightings').update(fields).eq('id',id);
      if(error)throw error;
      return json(res,200,{updated:true});
    }

    // DELETE: super_admin only
    if(req.method==='DELETE'){
      if(user.role!=='super_admin') return json(res,403,{error:'Hanya super admin yang dapat menghapus temuan.'});
      const body=bodyOf(req),id=clean(body.id,80);
      if(!id)return json(res,400,{error:'ID diperlukan.'});
      const {error}=await client.from('sightings').delete().eq('id',id);
      if(error)throw error;
      return json(res,200,{deleted:true});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(error){console.error('Sightings error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
