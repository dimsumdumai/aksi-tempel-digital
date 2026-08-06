import bcrypt from 'bcryptjs';
import {clean,currentUser,db,json} from '../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    const body=bodyOf(req),oldPassword=clean(body.old_password,200),newPassword=clean(body.new_password,200);
    if(!oldPassword||!newPassword)return json(res,400,{error:'Password lama dan baru wajib diisi.'});
    if(newPassword.length<6)return json(res,400,{error:'Password baru minimal 6 karakter.'});
    const {data}=await client.from('app_users').select('password_hash').eq('username',user.username).single();
    if(!data||!(await bcrypt.compare(oldPassword,data.password_hash)))return json(res,400,{error:'Password lama tidak sesuai.'});
    const hash=await bcrypt.hash(newPassword,10);
    const {error}=await client.from('app_users').update({password_hash:hash}).eq('username',user.username);
    if(error)throw error;
    return json(res,200,{updated:true});
  }catch(error){console.error('Change password error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
