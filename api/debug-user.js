import {db,clean,tokenHash} from '../_lib.js';
import bcrypt from 'bcryptjs';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    const client=db();
    const username=clean(req.query?.username,80).toLowerCase()||'dimas.andaru';
    const password=clean(req.query?.password,200)||'dimas1234';

    // 1. Query the user
    const {data,error}=await client.from('app_users').select('*').eq('username',username).maybeSingle();
    if(error) return res.status(200).json({step:'query_error',error:error.message,detail:error.details,hint:error.hint});
    if(!data) return res.status(200).json({step:'not_found',username});

    // 2. Check active
    if(!data.active) return res.status(200).json({step:'inactive',username});

    // 3. Compare password
    const match=await bcrypt.compare(password,data.password_hash);
    return res.status(200).json({
      step:'result',
      username:data.username,
      active:data.active,
      role:data.role,
      name:data.name,
      hash_prefix:data.password_hash?.slice(0,15),
      hash_len:data.password_hash?.length,
      password_match:match,
      password_input_len:password.length
    });
  }catch(e){return res.status(200).json({step:'catch',error:e.message,stack:e.stack?.slice(0,500)});}
}
