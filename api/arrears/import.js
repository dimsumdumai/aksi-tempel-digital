import {clean,currentUser,db,json,normalizeArrear} from '../../_lib.js';

const bodyOf=req=>typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const client=db();
    const user=await currentUser(req,client);
    if(!user) return json(res,401,{error:'Sesi tidak valid. Silakan masuk kembali.'});
    if(user.role==='user') return json(res,403,{error:'Hanya admin yang dapat mengimpor data.'});
    const source=Array.isArray(bodyOf(req).rows)?bodyOf(req).rows.slice(0,5000):[];
    const rows=source.map(row=>normalizeArrear(row,user)).filter(row=>row.no_polisi);
    for(let i=0;i<rows.length;i+=500){const {error}=await client.from('arrears').insert(rows.slice(i,i+500));if(error)throw error;}
    return json(res,200,{imported:rows.length});
  }catch(error){console.error('Arrears import error',error);return json(res,500,{error:'Layanan sedang bermasalah. Silakan coba kembali.'});}
}
