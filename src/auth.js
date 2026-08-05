export const ACCOUNTS = [
  {username:'dimas.andaru', name:'Dimas Andaru', position:'PJ Samsat Pekanbaru Kota', role:'super_admin'},
  {username:'andi.raharja', name:'Andi Raharja', position:'Kabag Operasional', role:'admin'},
  {username:'hamzah.arridho', name:'Hamzah Arridho', position:'Kasubag SW', role:'admin'},
  {username:'luisi.handayani', name:'Luisi Handayani', position:'Staff SW & Humas', role:'admin'},
  {username:'siti.izriskiah', name:'Siti Izriskiah', position:'PJ Samsat Pekanbaru Selatan', role:'user'},
  {username:'imelda.kusumastuti', name:'Imelda Kusumastuti', position:'PA Samsat Rumbai', role:'user'},
  {username:'rahmalina', name:'Rahmalina', position:'Staff Adm. Tk. I Samsat Panam', role:'user'}
];

const SESSION_KEY='aksi-tempel-session';
const TOKEN_KEY='aksi-tempel-api-token';

export const isSuperAdmin=u=>u?.role==='super_admin';
export const isAdmin=u=>isSuperAdmin(u)||u?.role==='admin';
export const isUser=u=>!isAdmin(u);

export const getCaptcha=async()=>{try{const r=await fetch('/api/auth/captcha');if(r.ok)return await r.json()}catch{}return null};

export const authenticate=async(username,password,captcha_token,captcha_answer)=>{
  const normalized=username.trim().toLowerCase();
  try{
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:normalized,password,captcha_token,captcha_answer})});
    if(response.ok){
      const data=await response.json();
      sessionStorage.setItem(TOKEN_KEY,data.token);
      return data.user
    }
  }catch{}
  return null
};

export const apiToken=()=>sessionStorage.getItem(TOKEN_KEY)||'';
export const apiFetch=(path,options={})=>fetch(path,{...options,headers:{...(options.headers||{}),authorization:'Bearer '+apiToken()}});
export const loadSession=()=>{try{const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');return ACCOUNTS.find(a=>a.username===saved?.username)||null}catch{return null}};
export const saveSession=(account)=>sessionStorage.setItem(SESSION_KEY,JSON.stringify({username:account.username,role:account.role}));
export const clearSession=()=>{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem(TOKEN_KEY)};
