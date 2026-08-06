import bcrypt from 'bcryptjs';
import {clean,db,json,tokenHash} from '../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const body=bodyOf(req),raw=clean(body.reset_token,200),newPassword=clean(body.new_password,200);
    if(!raw||!newPassword)return json(res,400,{error:'Token dan password baru diperlukan.'});
    if(newPassword.length<6)return json(res,400,{error:'Password baru minimal 6 karakter.'});
    const client=db();
    const {data:tokenRow}=await client.from('password_reset_tokens').select('username,expires_at').eq('token_hash',tokenHash(raw)).maybeSingle();
    if(!tokenRow||new Date(tokenRow.expires_at)<=new Date())return json(res,400,{error:'Token tidak valid atau sudah kedaluwarsa.'});
    const hash=await bcrypt.hash(newPassword,10);
    const {error:e1}=await client.from('app_users').update({password_hash:hash}).eq('username',tokenRow.username);
    if(e1)throw e1;
    await client.from('password_reset_tokens').delete().eq('username',tokenRow.username);
    return json(res,200,{reset:true});
  }catch(error){console.error('Reset password error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
