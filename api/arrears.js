import {currentUser,db,json} from './_lib.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    let query=client.from('arrears').select('*').order('imported_at',{ascending:false}).limit(user.role==='user'?2000:5000);
    if(user.role==='user') query=query.eq('assigned_to',user.username);
    const {data,error}=await query;
    if(error)throw error;
    return json(res,200,{rows:data||[]});
  }catch(error){console.error('Arrears error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
