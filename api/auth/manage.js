import bcrypt from 'bcryptjs';
import {clean,currentUser,db,json,token,tokenHash} from '../../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const action=clean(req.query.action,80).toLowerCase();
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});

    // GET /api/auth/manage?action=me
    if(action==='me'){
      if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
      return json(res,200,{user});
    }

    // POST /api/auth/manage?action=change-password
    if(action==='change-password'){
      if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
      const body=bodyOf(req),oldPassword=clean(body.old_password,200),newPassword=clean(body.new_password,200);
      if(!oldPassword||!newPassword)return json(res,400,{error:'Password lama dan baru wajib diisi.'});
      if(newPassword.length<6)return json(res,400,{error:'Password baru minimal 6 karakter.'});
      const {data}=await client.from('app_users').select('password_hash').eq('username',user.username).single();
      if(!data||!(await bcrypt.compare(oldPassword,data.password_hash)))return json(res,400,{error:'Password lama tidak sesuai.'});
      const hash=await bcrypt.hash(newPassword,10);
      const {error}=await client.from('app_users').update({password_hash:hash}).eq('username',user.username);
      if(error)throw error;
      return json(res,200,{updated:true});
    }

    // POST /api/auth/manage?action=link-email
    if(action==='link-email'){
      if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
      const body=bodyOf(req),email=clean(body.email,200);
      if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Format email tidak valid.'});
      const raw=token(),rawHash=tokenHash(raw),expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
      await client.from('email_verification_tokens').delete().eq('username',user.username);
      const {error}=await client.from('email_verification_tokens').insert({username:user.username,token_hash:rawHash,email,expires_at:expiresAt});
      if(error)throw error;
      return json(res,200,{verification_token:raw,message:'Token verifikasi berhasil dibuat. Gunakan POST /api/auth/manage?action=verify-email dengan token ini.'});
    }

    // POST /api/auth/manage?action=verify-email
    if(action==='verify-email'){
      if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
      const body=bodyOf(req),raw=clean(body.verification_token,200);
      if(!raw)return json(res,400,{error:'Token verifikasi diperlukan.'});
      const {data:tokenRow}=await client.from('email_verification_tokens').select('email,expires_at').eq('username',user.username).eq('token_hash',tokenHash(raw)).maybeSingle();
      if(!tokenRow||new Date(tokenRow.expires_at)<=new Date())return json(res,400,{error:'Token tidak valid atau sudah kedaluwarsa.'});
      const {error:e1}=await client.from('app_users').update({email:tokenRow.email,email_verified:true}).eq('username',user.username);
      if(e1)throw e1;
      await client.from('email_verification_tokens').delete().eq('username',user.username);
      return json(res,200,{email:tokenRow.email,verified:true});
    }

    return json(res,400,{error:'Aksi tidak dikenali. Gunakan action: me, change-password, link-email, atau verify-email.'});
  }catch(error){console.error('Auth manage error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
