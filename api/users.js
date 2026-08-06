import bcrypt from 'bcryptjs';
import {clean,currentUser,db,json} from './_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const action=clean(req.query.action,80).toLowerCase();
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});

    // GET /api/users?action=profile - return current user profile
    if(action==='profile'){
      if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
      const {data}=await client.from('app_users').select('username,name,position,role,email,email_verified,active,created_at').eq('username',user.username).single();
      return json(res,200,{profile:data||{}});
    }

    // GET /api/users (no action) - list all users (admin+)
    if(req.method==='GET'){
      if(user.role==='user') return json(res,403,{error:'Akses ditolak.'});
      const {data,error}=await client.from('app_users').select('username,name,position,role,active,created_at').order('created_at',{ascending:false});
      if(error)throw error;
      return json(res,200,{rows:data||[]});
    }

    // POST /api/users (no action) - create/upsert user (admin+)
    if(req.method==='POST'){
      if(user.role!=='super_admin'&&user.role!=='admin') return json(res,403,{error:'Akses ditolak.'});
      const body=bodyOf(req),username=clean(body.username,80).toLowerCase(),name=clean(body.name,100),position=clean(body.position,200),role=clean(body.role,20),password=clean(body.password,200);
      if(!username||!name||!password)return json(res,400,{error:'Username, nama, dan password wajib diisi.'});
      if(!['admin','user'].includes(role))return json(res,400,{error:'Role harus admin atau user.'});
      const password_hash=await bcrypt.hash(password,10);
      const {error}=await client.from('app_users').upsert({username,name,position,role,password_hash,active:true});
      if(error)throw error;
      return json(res,201,{saved:true});
    }

    // DELETE /api/users (no action) - delete user (super_admin only)
    if(req.method==='DELETE'){
      if(user.role!=='super_admin') return json(res,403,{error:'Hanya super admin yang dapat menghapus akun.'});
      const body=bodyOf(req),target=clean(body.username,80);
      if(target===user.username)return json(res,400,{error:'Tidak dapat menghapus akun sendiri.'});
      const {error}=await client.from('app_users').delete().eq('username',target);
      if(error)throw error;
      return json(res,200,{deleted:true});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(error){console.error('Users error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
