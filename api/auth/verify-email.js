import {clean,currentUser,db,json,tokenHash} from '../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    const body=bodyOf(req),raw=clean(body.verification_token,200);
    if(!raw)return json(res,400,{error:'Token verifikasi diperlukan.'});
    const {data:tokenRow}=await client.from('email_verification_tokens').select('email,expires_at').eq('username',user.username).eq('token_hash',tokenHash(raw)).maybeSingle();
    if(!tokenRow||new Date(tokenRow.expires_at)<=new Date())return json(res,400,{error:'Token tidak valid atau sudah kedaluwarsa.'});
    const {error:e1}=await client.from('app_users').update({email:tokenRow.email,email_verified:true}).eq('username',user.username);
    if(e1)throw e1;
    await client.from('email_verification_tokens').delete().eq('username',user.username);
    return json(res,200,{email:tokenRow.email,verified:true});
  }catch(error){console.error('Verify email error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
