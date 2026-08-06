import {clean,currentUser,db,json} from '../../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    if(user.role==='user') return json(res,403,{error:'Hanya admin yang dapat membagikan tugas.'});
    const body=bodyOf(req),ids=(Array.isArray(body.ids)?body.ids:[]).slice(0,1000),assignee=clean(body.assignee,80).toLowerCase();
    const {data:valid}=await client.from('app_users').select('username').eq('username',assignee).eq('role','user').eq('active',true).maybeSingle();
    if(!valid) return json(res,400,{error:'Petugas tidak valid.'});
    if(ids.length){const {error}=await client.from('arrears').update({assigned_to:assignee,assigned_by:user.username,assigned_at:new Date().toISOString(),status:'Ditugaskan'}).in('id',ids);if(error)throw error;}
    return json(res,200,{assigned:ids.length});
  }catch(error){console.error('Arrears assign error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
