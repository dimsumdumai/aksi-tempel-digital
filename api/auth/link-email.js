import {clean,currentUser,db,json,token,tokenHash} from '../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    const body=bodyOf(req),email=clean(body.email,200);
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(res,400,{error:'Format email tidak valid.'});
    const raw=token(),rawHash=tokenHash(raw),expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
    await client.from('email_verification_tokens').delete().eq('username',user.username);
    const {error}=await client.from('email_verification_tokens').insert({username:user.username,token_hash:rawHash,email,expires_at:expiresAt});
    if(error)throw error;
    return json(res,200,{verification_token:raw,message:'Token verifikasi berhasil dibuat. Gunakan POST /api/auth/verify-email dengan token ini.'});
  }catch(error){console.error('Link email error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
