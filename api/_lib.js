import {createHash,randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

export const db=()=>{
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Konfigurasi database production belum lengkap.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};

export const json=(res,status,data)=>res.status(status).json(data);
export const token=()=>randomBytes(32).toString('base64url');
export const tokenHash=value=>createHash('sha256').update(value).digest('hex');
export const clean=(value,max=500)=>String(value??'').trim().slice(0,max);

export async function currentUser(req,client){
  const raw=clean(req.headers.authorization).replace(/^Bearer\s+/i,'');
  if(!raw) return null;
  const {data,error}=await client.from('app_sessions').select('username,expires_at,app_users(username,name,role,active)').eq('token_hash',tokenHash(raw)).maybeSingle();
  const account=data?.app_users;
  if(error||!account?.active||new Date(data.expires_at)<=new Date()) return null;
  return {username:account.username,name:account.name,role:account.role};
}

export const normalizeArrear=(row,user)=>({
  no_polisi:clean(row.no_polisi,24).toUpperCase(),
  nama_pemilik:clean(row.nama_pemilik_terakhir||row.nama_pemilik),
  nomor_hp:clean(row.nomor_hp,40),
  alamat:clean(row.alamat_pemilik_terakhir||row.alamat,1000),
  jatuh_tempo:clean(row.tgl_mati_yad||row.jatuh_tempo,80),
  jenis_kendaraan:clean(row.deskripsi_jenis_kendaraan||row.jenis_kendaraan,250),
  samsat_asal:clean(row.samsat_asal_nama||row.samsat_asal,250),
  prioritas:clean(row.prioritas,80),
  imported_by:user.username
});
