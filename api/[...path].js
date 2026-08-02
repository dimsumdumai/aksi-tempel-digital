import bcrypt from 'bcryptjs';
import {clean,currentUser,db,json,normalizeArrear,token,tokenHash} from './_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const path='/api/'+(Array.isArray(req.query.path)?req.query.path.join('/'):req.query.path||'');
  try{
    const client=db();
    if(path==='/api/auth/login'&&req.method==='POST'){
      const body=bodyOf(req),username=clean(body.username,80).toLowerCase();
      const {data}=await client.from('app_users').select('username,name,role,password_hash,active').eq('username',username).maybeSingle();
      if(!data?.active||!(await bcrypt.compare(clean(body.password,200),data.password_hash))) return json(res,401,{error:'Username atau password tidak sesuai.'});
      const raw=token(),expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
      await client.from('app_sessions').delete().eq('username',username).lt('expires_at',new Date().toISOString());
      const {error}=await client.from('app_sessions').insert({token_hash:tokenHash(raw),username,expires_at:expiresAt});
      if(error) throw error;
      return json(res,200,{token:raw,user:{username:data.username,name:data.name,role:data.role}});
    }
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    if(path==='/api/auth/me'&&req.method==='GET') return json(res,200,{user});
    if(path==='/api/arrears'&&req.method==='GET'){
      let query=client.from('arrears').select('*').order('imported_at',{ascending:false}).limit(user.role==='admin'?5000:2000);
      if(user.role!=='admin') query=query.eq('assigned_to',user.username);
      const {data,error}=await query;if(error)throw error;return json(res,200,{rows:data||[]});
    }
    if(path==='/api/arrears/import'&&req.method==='POST'){
      if(user.role!=='admin') return json(res,403,{error:'Khusus admin.'});
      const source=Array.isArray(bodyOf(req).rows)?bodyOf(req).rows.slice(0,5000):[];
      const rows=source.map(row=>normalizeArrear(row,user)).filter(row=>row.no_polisi);
      for(let i=0;i<rows.length;i+=500){const {error}=await client.from('arrears').insert(rows.slice(i,i+500));if(error)throw error;}
      return json(res,200,{imported:rows.length});
    }
    if(path==='/api/arrears/assign'&&req.method==='POST'){
      if(user.role!=='admin') return json(res,403,{error:'Khusus admin.'});
      const body=bodyOf(req),ids=(Array.isArray(body.ids)?body.ids:[]).slice(0,1000),assignee=clean(body.assignee,80).toLowerCase();
      const {data:valid}=await client.from('app_users').select('username').eq('username',assignee).eq('role','user').eq('active',true).maybeSingle();
      if(!valid) return json(res,400,{error:'Petugas tidak valid.'});
      if(ids.length){const {error}=await client.from('arrears').update({assigned_to:assignee,assigned_by:user.username,assigned_at:new Date().toISOString(),status:'Ditugaskan'}).in('id',ids);if(error)throw error;}
      return json(res,200,{assigned:ids.length});
    }
    if(path==='/api/sightings'&&req.method==='GET'){
      let query=client.from('sightings').select('*').order('captured_at',{ascending:false}).limit(user.role==='admin'?2000:1000);
      if(user.role!=='admin') query=query.eq('created_by',user.username);
      const {data,error}=await query;if(error)throw error;
      const rows=await Promise.all((data||[]).map(async row=>{
        let foto='';if(row.evidence_key){const {data:signed}=await client.storage.from('vehicle-evidence').createSignedUrl(row.evidence_key,3600);foto=signed?.signedUrl||'';}
        return {...row,...(row.vehicle_data||{}),petugas:row.petugas_name,lokasi:row.lokasi,foto,date:row.captured_at.slice(0,10),time:new Date(row.captured_at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})};
      }));
      return json(res,200,{rows});
    }
    if(path==='/api/sightings'&&req.method==='POST'){
      const body=bodyOf(req),id=clean(body.id,80),noticeId=clean(body.notice_id,120),plate=clean(body.no_polisi,24).toUpperCase();
      if(!id||!noticeId||!plate||!clean(body.lokasi)) return json(res,400,{error:'Data temuan belum lengkap.'});
      let evidenceKey=null;
      const match=clean(body.foto,7000000).match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      if(match){evidenceKey=`${user.username}/${new Date().toISOString().slice(0,10)}/${id}.jpg`;const {error}=await client.storage.from('vehicle-evidence').upload(evidenceKey,Buffer.from(match[2],'base64'),{contentType:match[1],upsert:false});if(error)throw error;}
      const vehicleData={nama_pemilik_terakhir:clean(body.nama_pemilik_terakhir),nomor_hp:clean(body.nomor_hp,40),alamat_pemilik_terakhir:clean(body.alamat_pemilik_terakhir,1000),tgl_mati_yad:clean(body.tgl_mati_yad,80),deskripsi_jenis_kendaraan:clean(body.deskripsi_jenis_kendaraan,250),samsat_asal_nama:clean(body.samsat_asal_nama,250),prioritas:clean(body.prioritas,80)};
      const {error}=await client.from('sightings').insert({id,notice_id:noticeId,no_polisi:plate,created_by:user.username,petugas_name:user.name,lokasi:clean(body.lokasi,1000),captured_at:body.captured_at||new Date().toISOString(),status:clean(body.status,80)||'Belum Dihubungi',print_status:clean(body.print_status,80)||'Belum Dicetak',evidence_key:evidenceKey,vehicle_data:vehicleData});
      if(error)throw error;return json(res,201,{saved:true,evidence:!!evidenceKey});
    }
    return json(res,404,{error:'Layanan tidak ditemukan.'});
  }catch(error){console.error('API error',error?.code||error?.name||'unknown');return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
