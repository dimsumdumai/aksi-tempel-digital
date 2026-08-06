import bcryptjs from 'bcryptjs';
import {createHmac} from 'node:crypto';
import {clean,db,json,token,tokenHash} from '../_lib.js';

// bcryptjs v3 ESM interop: default export might be the module object
const bcrypt=(typeof bcryptjs.compare==='function')?bcryptjs:(bcryptjs.default||bcryptjs);

const CAPTCHA_SECRET='aksi-tempel-captcha-2024';
const captchaAnswer=ans=>String(ans).trim();
const verifyCaptcha=(tk,ans)=>{if(!tk||!ans)return false;return createHmac('sha256',CAPTCHA_SECRET).update(captchaAnswer(ans)).digest('hex').slice(0,16)===tk};

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const body=bodyOf(req),username=clean(body.username,80).toLowerCase();
    if(!verifyCaptcha(body.captcha_token,body.captcha_answer)) return json(res,400,{error:'Jawaban captcha tidak sesuai.'});
    const client=db();
    const {data, error:dbErr}=await client.from('app_users').select('username,name,role,position,password_hash,active').eq('username',username).maybeSingle();
    if(dbErr) return json(res,500,{error:'DB error',detail:dbErr.message});
    if(!data) return json(res,401,{error:'User not found',debug_username:username});
    if(!data.active) return json(res,401,{error:'User inactive'});
    const pwOk=await bcrypt.compare(clean(body.password,200),data.password_hash);
    if(!pwOk) return json(res,401,{error:'Password mismatch',debug_stored_hash:data.password_hash?.slice(0,10)});
    if(!pwOk) return json(res,401,{error:'Username atau password tidak sesuai.'});
    const raw=token(),expiresAt=new Date(Date.now()+8*60*60*1000).toISOString();
    await client.from('app_sessions').delete().eq('username',username).lt('expires_at',new Date().toISOString());
    const {error}=await client.from('app_sessions').insert({token_hash:tokenHash(raw),username,expires_at:expiresAt});
    if(error) throw error;
    return json(res,200,{token:raw,user:{username:data.username,name:data.name,role:data.role,position:data.position}});
  }catch(error){console.error('Login error',error);return json(res,500,{error:'Layanan sedang bermasalah.'});}
}
