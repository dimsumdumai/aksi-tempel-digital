import bcrypt from 'bcryptjs';
import {clean,db,json,token,tokenHash} from '../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const body=bodyOf(req),username=clean(body.username,80).toLowerCase();
    const client=db();
    const {data}=await client.from('app_users').select('username,email,active').eq('username',username).maybeSingle();
    if(!data?.active)return json(res,200,{message:'Jika akun tersebut terdaftar, token reset akan dikirim.'});
    const raw=token(),rawHash=tokenHash(raw),expiresAt=new Date(Date.now()+60*60*1000).toISOString();
    await client.from('password_reset_tokens').delete().eq('username',username);
    const {error}=await client.from('password_reset_tokens').insert({username,token_hash:rawHash,expires_at:expiresAt});
    if(error)throw error;
    return json(res,200,{reset_token:raw,message:'Token reset berhasil dibuat.',email:data.email||'Tidak terdaftar'});
  }catch(error){console.error('Forgot password error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
