export const ACCOUNTS = [
  {username:'andi.raharja', name:'Andi Raharja', aliases:['Andi'], role:'admin'},
  {username:'hamzah.arridho', name:'Hamzah Arridho', aliases:['Hamzah'], role:'admin'},
  {username:'dimas.andaru', name:'Dimas Andaru', aliases:['Dimas'], role:'admin'},
  {username:'luisi.dian', name:'Luisi Dian', aliases:['Luisi'], role:'admin'},
  {username:'siti.izriskiah', name:'Siti Izriskiah', aliases:['Siti'], role:'user'},
  {username:'imelda.kusumastuti', name:'Imelda Kusumastuti', aliases:['Imelda'], role:'user'},
  {username:'rahmalina', name:'Rahmalina', aliases:['Lina'], role:'user'}
];
const SESSION_KEY='aksi-tempel-session';
export const authenticate=async(username,password)=>{const normalized=username.trim().toLowerCase();try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:normalized,password})});if(response.ok){const data=await response.json();sessionStorage.setItem('aksi-tempel-api-token',data.token);return {...data.user,aliases:ACCOUNTS.find(a=>a.username===data.user.username)?.aliases||[]}}}catch{}return null};
export const apiToken=()=>sessionStorage.getItem('aksi-tempel-api-token')||'';
export const apiFetch=(path,options={})=>fetch(path,{...options,headers:{...(options.headers||{}),authorization:`Bearer ${apiToken()}`}});
export const loadSession=()=>{try{const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');return ACCOUNTS.find(a=>a.username===saved?.username)||null}catch{return null}};
export const saveSession=(account)=>sessionStorage.setItem(SESSION_KEY,JSON.stringify({username:account.username}));
export const clearSession=()=>{sessionStorage.removeItem(SESSION_KEY);sessionStorage.removeItem('aksi-tempel-api-token')};
