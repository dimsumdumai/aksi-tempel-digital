export const ACCOUNTS = [
  {username:'andi.raharja', password:'Riau!Andi#4827', name:'Andi Raharja', aliases:['Andi'], role:'admin'},
  {username:'hamzah.arridho', password:'Riau!Hamzah#6194', name:'Hamzah Arridho', aliases:['Hamzah'], role:'admin'},
  {username:'dimas.andaru', password:'Riau!Dimas#7351', name:'Dimas Andaru', aliases:['Dimas'], role:'admin'},
  {username:'luisi.dian', password:'Riau!Luisi#8642', name:'Luisi Dian', aliases:['Luisi'], role:'admin'},
  {username:'siti.izriskiah', password:'Aksi!Siti#2946', name:'Siti Izriskiah', aliases:['Siti'], role:'user'},
  {username:'imelda.kusumastuti', password:'Aksi!Imelda#5173', name:'Imelda Kusumastuti', aliases:['Imelda'], role:'user'},
  {username:'rahmalina', password:'Aksi!Lina#4088', name:'Rahmalina', aliases:['Lina'], role:'user'}
];

const SESSION_KEY='aksi-tempel-session';
export const authenticate=(username,password)=>ACCOUNTS.find(account=>account.username===username.trim().toLowerCase()&&account.password===password)||null;
export const loadSession=()=>{try{const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');return ACCOUNTS.find(a=>a.username===saved?.username)||null}catch{return null}};
export const saveSession=(account)=>sessionStorage.setItem(SESSION_KEY,JSON.stringify({username:account.username}));
export const clearSession=()=>sessionStorage.removeItem(SESSION_KEY);
