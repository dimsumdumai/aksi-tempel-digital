import {clean,currentUser,db,json,normalizeArrear} from './_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const action=clean(req.query.action,80).toLowerCase();
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});

    // POST /api/arrears?action=import
    if(action==='import'){
      if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
      if(user.role==='user') return json(res,403,{error:'Hanya admin yang dapat mengimpor data.'});
      const source=Array.isArray(bodyOf(req).rows)?bodyOf(req).rows.slice(0,5000):[];
      const rows=source.map(row=>normalizeArrear(row,user)).filter(row=>row.no_polisi);
      for(let i=0;i<rows.length;i+=500){const {error}=await client.from('arrears').insert(rows.slice(i,i+500));if(error)throw error;}
      return json(res,200,{imported:rows.length});
    }

    // POST /api/arrears?action=assign
    if(action==='assign'){
      if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
      if(user.role==='user') return json(res,403,{error:'Hanya admin yang dapat membagikan tugas.'});
      const body=bodyOf(req),ids=(Array.isArray(body.ids)?body.ids:[]).slice(0,1000),assignee=clean(body.assignee,80).toLowerCase();
      const {data:valid}=await client.from('app_users').select('username').eq('username',assignee).eq('role','user').eq('active',true).maybeSingle();
      if(!valid) return json(res,400,{error:'Petugas tidak valid.'});
      if(ids.length){const {error}=await client.from('arrears').update({assigned_to:assignee,assigned_by:user.username,assigned_at:new Date().toISOString(),status:'Ditugaskan'}).in('id',ids);if(error)throw error;}
      return json(res,200,{assigned:ids.length});
    }

    // GET /api/arrears (no action) - list arrears
    if(req.method==='GET'){
      let query=client.from('arrears').select('*').order('imported_at',{ascending:false}).limit(user.role==='user'?2000:5000);
      if(user.role==='user') query=query.eq('assigned_to',user.username);
      const {data,error}=await query;
      if(error)throw error;
      return json(res,200,{rows:data||[]});
    }

    return json(res,405,{error:'Method not allowed'});
  }catch(error){console.error('Arrears error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
