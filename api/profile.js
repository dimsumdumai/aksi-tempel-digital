import {currentUser,db,json} from './_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    const {data}=await client.from('app_users').select('username,name,position,role,email,email_verified,active,created_at').eq('username',user.username).single();
    return json(res,200,{profile:data||{}});
  }catch(error){console.error('Profile error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
