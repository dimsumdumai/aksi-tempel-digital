import bcrypt from 'bcryptjs';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {clean,currentUser,db,json,normalizeArrear,token,tokenHash} from './_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
const CAPTCHA_SECRET='aksi-tempel-captcha-2024';
const captchaAnswer=ans=>String(ans).trim();
const captchaToken=(ans)=>{const v=captchaAnswer(ans);return createHmac('sha256',CAPTCHA_SECRET).update(v).digest('hex').slice(0,16)};
const verifyCaptcha=(token,ans)=>{if(!token||!ans)return false;return createHmac('sha256',CAPTCHA_SECRET).update(captchaAnswer(ans)).digest('hex').slice(0,16)===token};

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const path='/api/'+(Array.isArray(req.query.path)?req.query.path.join('/'):req.query.path||'');
  try{
    const client=db();

    // Captcha
    if(path==='/api/auth/captcha'&&req.method==='GET'){
      const ops=['+','-'];
      const op=ops[Math.floor(Math.random()*ops.length)];
      const a=Math.floor(Math.random()*20)+1;
      const b=Math.floor(Math.random()*20)+1;
      const answer=op==='+'?a+b:a-b;
      return json(res,200,{question:`${a} ${op} ${b} = ?`,token:captchaToken(String(answer)),hint:'Jawab soal matematika di atas'});
    }

    // Login
    if(path==='/api/auth/login'&&req.method==='POST'){
      const body=bodyOf(req),username=clean(body.username,80).toLowerCase();
      if(!verifyCaptcha(body.captcha_token,body.captcha_answer)) return json(res,400,{error:'Jawaban captcha tidak sesuai.'});
      const {data}=await client.from('app_users').select('username,name,role,position,password_hash,active').eq('username',username).maybeSingle();
      if(!data?.active||!(await bcrypt.compare(clean(body.password,200),data.password_hash))) return json(res,401,{error:'Username atau password tidak sesuai.'});
      const raw=token(),expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
      await client.from('app_sessions').delete().eq('username',username).lt('expires_at',new Date().toISOString());
      const {error}=await client.from('app_sessions').insert({token_hash:tokenHash(raw),username,expires_at:expiresAt});
      if(error) throw error;
      return json(res,200,{token:raw,user:{username:data.username,name:data.name,role:data.role,position:data.position}});
    }

    // Forgot password (public, no auth required)
    if(path==='/api/auth/forgot-password'&&req.method==='POST'){
      const body=bodyOf(req),username=clean(body.username,80).toLowerCase();
      const {data}=await client.from('app_users').select('username,email,active').eq('username',username).maybeSingle();
      if(!data?.active)return json(res,200,{message:'Jika akun tersebut terdaftar, token reset akan dikirim.'});
      const raw=token(),rawHash=tokenHash(raw),expiresAt=new Date(Date.now()+60*60*1000).toISOString();
      await client.from('password_reset_tokens').delete().eq('username',username);
      const {error}=await client.from('password_reset_tokens').insert({username,token_hash:rawHash,expires_at:expiresAt});
      if(error)throw error;
      return json(res,200,{reset_token:raw,message:'Token reset berhasil dibuat.',email:data.email||'Tidak terdaftar'});
    }

    // Reset password (public)
    if(path==='/api/auth/reset-password'&&req.method==='POST'){
      const body=bodyOf(req),raw=clean(body.reset_token,200),newPassword=clean(body.new_password,200);
      if(!raw||!newPassword)return json(res,400,{error:'Token dan password baru diperlukan.'});
      if(newPassword.length<6)return json(res,400,{error:'Password baru minimal 6 karakter.'});
      const {data:tokenRow}=await client.from('password_reset_tokens').select('username,expires_at').eq('token_hash',tokenHash(raw)).maybeSingle();
      if(!tokenRow||new Date(tokenRow.expires_at)<=new Date())return json(res,400,{error:'Token tidak valid atau sudah kedaluwarsa.'});
      const hash=await bcrypt.hash(newPassword,10);
      const {error:e1}=await client.from('app_users').update({password_hash:hash}).eq('username',tokenRow.username);
      if(e1)throw e1;
      await client.from('password_reset_tokens').delete().eq('username',tokenRow.username);
      return json(res,200,{reset:true});
    }

    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});

    if(path==='/api/auth/me'&&req.method==='GET') return json(res,200,{user});

    // Profile: change password
    if(path==='/api/auth/change-password'&&req.method==='POST'){
      const body=bodyOf(req),oldPassword=clean(body.old_password,200),newPassword=clean(body.new_password,200);
      if(!oldPassword||!newPassword)return json(res,400,{error:'Password lama dan baru wajib diisi.'});
      if(newPassword.length<6)return json(res,400,{error:'Password baru minimal 6 karakter.'});
      const {data}=await client.from('app_users').select('password_hash').eq('username',user.username).single();
      if(!data||!(await bcrypt.compare(oldPassword,data.password_hash)))return json(res,400,{error:'Password lama tidak sesuai.'});
      const hash=await bcrypt.hash(newPassword,10);
      const {error}=await client.from('app_users').update({password_hash:hash}).eq('username',user.username);
      if(error)throw error;return json(res,200,{updated:true});
    }

    // Profile: link email
    if(path==='/api/auth/link-email'&&req.method==='POST'){
      const body=bodyOf(req),email=clean(body.email,200);
      if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Format email tidak valid.'});
      const raw=token(),rawHash=tokenHash(raw),expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
      await client.from('email_verification_tokens').delete().eq('username',user.username);
      const {error}=await client.from('email_verification_tokens').insert({username:user.username,token_hash:rawHash,email,expires_at:expiresAt});
      if(error)throw error;
      return json(res,200,{verification_token:raw,message:'Token verifikasi berhasil dibuat. Gunakan POST /api/auth/verify-email dengan token ini.'});
    }

    // Profile: verify email
    if(path==='/api/auth/verify-email'&&req.method==='POST'){
      const body=bodyOf(req),raw=clean(body.verification_token,200);
      if(!raw)return json(res,400,{error:'Token verifikasi diperlukan.'});
      const {data:tokenRow}=await client.from('email_verification_tokens').select('email,expires_at').eq('username',user.username).eq('token_hash',tokenHash(raw)).maybeSingle();
      if(!tokenRow||new Date(tokenRow.expires_at)<=new Date())return json(res,400,{error:'Token tidak valid atau sudah kedaluwarsa.'});
      const {error:e1}=await client.from('app_users').update({email:tokenRow.email,email_verified:true}).eq('username',user.username);
      if(e1)throw e1;
      await client.from('email_verification_tokens').delete().eq('username',user.username);
      return json(res,200,{email:tokenRow.email,verified:true});
    }

    // Profile: get profile
    if(path==='/api/profile'&&req.method==='GET'){
      const {data}=await client.from('app_users').select('username,name,position,role,email,email_verified,active,created_at').eq('username',user.username).single();
      return json(res,200,{profile:data||{}});
    }

    // User management (admin+)
    if(path==='/api/users'&&req.method==='GET'){
      if(user.role==='user') return json(res,403,{error:'Akses ditolak.'});
      const {data,error}=await client.from('app_users').select('username,name,position,role,active,created_at').order('created_at',{ascending:false});
      if(error)throw error;return json(res,200,{rows:data||[]});
    }
    if(path==='/api/users'&&req.method==='POST'){
      if(user.role!=='super_admin'&&user.role!=='admin') return json(res,403,{error:'Akses ditolak.'});
      const body=bodyOf(req),username=clean(body.username,80).toLowerCase(),name=clean(body.name,100),position=clean(body.position,200),role=clean(body.role,20),password=clean(body.password,200);
      if(!username||!name||!password)return json(res,400,{error:'Username, nama, dan password wajib diisi.'});
      if(!['admin','user'].includes(role))return json(res,400,{error:'Role harus admin atau user.'});
      const password_hash=await bcrypt.hash(password,10);
      const {error}=await client.from('app_users').upsert({username,name,position,role,password_hash,active:true});
      if(error)throw error;return json(res,201,{saved:true});
    }
    if(path==='/api/users'&&req.method==='DELETE'){
      if(user.role!=='super_admin') return json(res,403,{error:'Hanya super admin yang dapat menghapus akun.'});
      const body=bodyOf(req),target=clean(body.username,80);
      if(target===user.username)return json(res,400,{error:'Tidak dapat menghapus akun sendiri.'});
      const {error}=await client.from('app_users').delete().eq('username',target);
      if(error)throw error;return json(res,200,{deleted:true});
    }

    // Arrears
    if(path==='/api/arrears'&&req.method==='GET'){
      let query=client.from('arrears').select('*').order('imported_at',{ascending:false}).limit(user.role==='user'?2000:5000);
      if(user.role==='user') query=query.eq('assigned_to',user.username);
      const {data,error}=await query;if(error)throw error;return json(res,200,{rows:data||[]});
    }
    if(path==='/api/arrears/import'&&req.method==='POST'){
      if(user.role==='user') return json(res,403,{error:'Hanya admin yang dapat mengimpor data.'});
      const source=Array.isArray(bodyOf(req).rows)?bodyOf(req).rows.slice(0,5000):[];
      const rows=source.map(row=>normalizeArrear(row,user)).filter(row=>row.no_polisi);
      for(let i=0;i<rows.length;i+=500){const {error}=await client.from('arrears').insert(rows.slice(i,i+500));if(error)throw error;}
      return json(res,200,{imported:rows.length});
    }
    if(path==='/api/arrears/assign'&&req.method==='POST'){
      if(user.role==='user') return json(res,403,{error:'Hanya admin yang dapat membagikan tugas.'});
      const body=bodyOf(req),ids=(Array.isArray(body.ids)?body.ids:[]).slice(0,1000),assignee=clean(body.assignee,80).toLowerCase();
      const {data:valid}=await client.from('app_users').select('username').eq('username',assignee).eq('role','user').eq('active',true).maybeSingle();
      if(!valid) return json(res,400,{error:'Petugas tidak valid.'});
      if(ids.length){const {error}=await client.from('arrears').update({assigned_to:assignee,assigned_by:user.username,assigned_at:new Date().toISOString(),status:'Ditugaskan'}).in('id',ids);if(error)throw error;}
      return json(res,200,{assigned:ids.length});
    }

    // Sightings
    if(path==='/api/sightings'&&req.method==='GET'){
      let query=client.from('sightings').select('*').order('captured_at',{ascending:false}).limit(user.role==='user'?1000:2000);
      if(user.role==='user') query=query.eq('created_by',user.username);
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
      if(match){evidenceKey=user.username+'/'+new Date().toISOString().slice(0,10)+'/'+id+'.jpg';const {error}=await client.storage.from('vehicle-evidence').upload(evidenceKey,Buffer.from(match[2],'base64'),{contentType:match[1],upsert:false});if(error)throw error;}
      const vehicleData={nama_pemilik_terakhir:clean(body.nama_pemilik_terakhir),nomor_hp:clean(body.nomor_hp,40),alamat_pemilik_terakhir:clean(body.alamat_pemilik_terakhir,1000),tgl_mati_yad:clean(body.tgl_mati_yad,80),deskripsi_jenis_kendaraan:clean(body.deskripsi_jenis_kendaraan,250),samsat_asal_nama:clean(body.samsat_asal_nama,250),prioritas:clean(body.prioritas,80)};
      const {error}=await client.from('sightings').insert({id,notice_id:noticeId,no_polisi:plate,created_by:user.username,petugas_name:user.name,lokasi:clean(body.lokasi,1000),captured_at:body.captured_at||new Date().toISOString(),status:clean(body.status,80)||'Belum Dihubungi',print_status:clean(body.print_status,80)||'Belum Dicetak',evidence_key:evidenceKey,vehicle_data:vehicleData});
      if(error)throw error;return json(res,201,{saved:true,evidence:!!evidenceKey});
    }
    if(path==='/api/sightings'&&req.method==='PATCH'){
      const body=bodyOf(req),id=clean(body.id,80);
      if(!id) return json(res,400,{error:'ID temuan diperlukan.'});
      const fields={};if(body.status)fields.status=clean(body.status,80);if(body.print_status)fields.print_status=clean(body.print_status,80);
      if(!Object.keys(fields).length) return json(res,400,{error:'Tidak ada field yang diupdate.'});
      const {error}=await client.from('sightings').update(fields).eq('id',id);if(error)throw error;
      return json(res,200,{updated:true});
    }
    if(path==='/api/sightings'&&req.method==='DELETE'){
      if(user.role!=='super_admin') return json(res,403,{error:'Hanya super admin yang dapat menghapus temuan.'});
      const body=bodyOf(req),id=clean(body.id,80);
      if(!id)return json(res,400,{error:'ID diperlukan.'});
      const {error}=await client.from('sightings').delete().eq('id',id);if(error)throw error;
      return json(res,200,{deleted:true});
    }
    return json(res,404,{error:'Layanan tidak ditemukan.'});
  }catch(error){console.error('API error',error?.code||error?.name||'unknown');return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
