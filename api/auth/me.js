import {currentUser,db,json} from '../_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    return json(res,200,{user});
  }catch(error){console.error('Get me error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
