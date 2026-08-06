import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as XLSX from 'xlsx';
import './styles.css';
import {isSuperAdmin,isAdmin,isUser,apiFetch,authenticate,clearSession,loadSession,saveSession} from './auth';
import {LoginScreen,CaptureView,DailyView,DashboardView,VehicleHistoryView,NoticeView,ArrearsView,ThermalNotice,ThermalQr,UserManagementView,ProfileSettingsView} from './views';
import {buildNoticeId,downloadPrinterPayload} from './printerService';

const makeIcon=s=>(p)=><span className={p?.className||'icon'} aria-hidden="true">{s}</span>;
const Camera=makeIcon('\u{1F4F7}'),ClipboardList=makeIcon('\u{258F}'),BarChart3=makeIcon('\u{25A5}'),Printer=makeIcon('\u{1F5A8}'),History=makeIcon('\u{25F7}'),Database=makeIcon('\u{25A6}'),UserPlus=makeIcon('\u{2695}'),Settings=makeIcon('\u{2699}');
const today=()=>new Date().toISOString().slice(0,10);
const phone62=v=>{let s=String(v||'').replace(/\D/g,'');if(!s||s==='0')return'';if(s.startsWith('0'))s='62'+s.slice(1);else if(!s.startsWith('62'))s='62'+s;return s};
const waText=r=>'Yth. Bapak/Ibu pemilik kendaraan '+r.no_polisi+'. Berdasarkan kegiatan Aksi Tempel-Tempel Jasa Raharja, kendaraan teridentifikasi memiliki kewajiban yang perlu ditindaklanjuti. Mohon melakukan pengecekan dan pembayaran melalui layanan Samsat resmi. Terima kasih.';
const loadEntries=()=>JSON.parse(localStorage.getItem('aksi-tempel-entries')||'[]');
const saveEntries=v=>localStorage.setItem('aksi-tempel-entries',JSON.stringify(v));

function App(){
 const [session,setSession]=useState(loadSession);
 const [db,setDb]=useState([]),[loadingDb,setLoadingDb]=useState(true),[entries,setEntries]=useState(loadEntries);
 const [date,setDate]=useState(today()),[tab,setTab]=useState('capture');
 const [selectedNotice,setSelectedNotice]=useState(null),[printerLanguage,setPrinterLanguage]=useState('CPCL');

 useEffect(()=>{if(!session){setLoadingDb(false);return}setLoadingDb(true);const load=async()=>{if(import.meta.env.DEV){const r=await fetch('/database-gaspoll.xlsx');if(!r.ok)throw new Error('Database lokal tidak ditemukan');const wb=XLSX.read(await r.arrayBuffer(),{type:'array',cellDates:true});return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''})}const r=await apiFetch('/api/arrears');const data=await r.json();if(!r.ok)throw new Error(data.error);return(data.rows||[]).map(x=>({...x,nama_pemilik_terakhir:x.nama_pemilik,alamat_pemilik_terakhir:x.alamat,tgl_mati_yad:x.jatuh_tempo,deskripsi_jenis_kendaraan:x.jenis_kendaraan,samsat_asal_nama:x.samsat_asal}))};load().then(setDb).catch(console.error).finally(()=>setLoadingDb(false))},[session]);
 useEffect(()=>saveEntries(entries),[entries]);
 useEffect(()=>{if(!session||import.meta.env.DEV)return;apiFetch('/api/sightings').then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setEntries(local=>{const map=new Map((data.rows||[]).map(row=>[row.id,row]));local.forEach(row=>map.set(row.id,{...map.get(row.id),...row}));return[...map.values()]})}).catch(console.error)},[session]);

 const match=useMemo(()=>{return null},[]);
 const visibleEntries=useMemo(()=>{if(isAdmin(session))return entries;return entries.filter(e=>e.created_by===session?.username||(!e.created_by&&(e.petugas===session?.name)))},[entries,session]);
 const dayEntries=useMemo(()=>visibleEntries.filter(e=>e.date===date),[visibleEntries,date]);

 function handleCapture({date:d,location,plate,photo,match:m}){
  const base=m||{};const now=new Date();
  const row={id:crypto.randomUUID(),notice_id:buildNoticeId(now),date:d,time:now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),captured_at:now.toISOString(),created_by:session.username,petugas:session.name,lokasi:location,foto:photo,no_polisi:plate,nama_pemilik_terakhir:base.nama_pemilik_terakhir||'Tidak ditemukan',nomor_hp:base.nomor_hp||'',alamat_pemilik_terakhir:base.alamat_pemilik_terakhir||'',tgl_mati_yad:base.tgl_mati_yad?String(base.tgl_mati_yad).slice(0,10):'',deskripsi_jenis_kendaraan:base.deskripsi_jenis_kendaraan||'',samsat_asal_nama:base.samsat_asal_nama||'',prioritas:base.prioritas||'',flag_nomor_hp_valid:base.flag_nomor_hp_valid||'',status:'Belum Dihubungi',print_status:'Belum Dicetak'};
  setEntries(v=>[row,...v]);if(!import.meta.env.DEV)apiFetch('/api/sightings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(row)}).catch(console.error);
  setSelectedNotice(row);setTab('notice')
 }
 function setStatus(id,status){setEntries(v=>v.map(e=>e.id===id?{...e,status}:e));if(!import.meta.env.DEV)apiFetch('/api/sightings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,status})}).catch(console.error)}
 function remove(id){if(!isSuperAdmin(session))return setEntries(v=>v.filter(e=>e.id!==id));if(!confirm('Hapus temuan ini dari server?'))return;apiFetch('/api/sightings',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id})}).then(r=>r.json()).then(()=>{setEntries(v=>v.filter(e=>e.id!==id))}).catch(console.error)}
 function blast(r){const hp=phone62(r.nomor_hp);if(!hp)return alert('Nomor WhatsApp tidak tersedia/valid.');window.open('https://wa.me/'+hp+'?text='+encodeURIComponent(waText(r)),'_blank');setStatus(r.id,'WA Dibuka')}
 function openNotice(r){const notice={...r,notice_id:r.notice_id||buildNoticeId(new Date(r.captured_at||Date.now()))};if(!r.notice_id)setEntries(v=>v.map(e=>e.id===r.id?notice:e));setSelectedNotice(notice);setTab('notice')}
 function markPrinted(id,status='Dicetak'){setEntries(v=>v.map(e=>e.id===id?{...e,print_status:status}:e));setSelectedNotice(v=>v?.id===id?{...v,print_status:status}:v);if(!import.meta.env.DEV)apiFetch('/api/sightings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,print_status:status})}).catch(console.error)}
 async function zebraPrint(mode='bridge'){if(!selectedNotice)return;const{sendToZebraBridge,buildCpcl,buildZpl,sendViaWebBluetooth}=await import('./printerService');if(mode==='ble'){const raw=printerLanguage==='ZPL'?buildZpl(selectedNotice):buildCpcl(selectedNotice);try{await sendViaWebBluetooth(raw);markPrinted(selectedNotice.id,'Dicetak '+printerLanguage);alert('Perintah cetak berhasil dikirim ke Zebra via Bluetooth.')}catch(e){alert('Cetak Bluetooth gagal: '+(e?.message||e))}}else{const result=await sendToZebraBridge(selectedNotice,printerLanguage);if(result.ok){markPrinted(selectedNotice.id,'Dicetak '+printerLanguage);alert('Perintah cetak berhasil dikirim ke Zebra.')}else alert('Bridge Zebra belum tersedia pada perangkat ini.')}}
 function browserPrint(){window.print();if(selectedNotice)markPrinted(selectedNotice.id,'Dicetak via Browser')}
 function exportExcel(){const data=dayEntries.map(({foto,...e})=>e);const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Rekap Harian');XLSX.writeFile(wb,'aksi-tempel-'+date+'.xlsx')}
 const logout=()=>{clearSession();setSession(null);setSelectedNotice(null)};

 if(!session)return <LoginScreen onLogin={a=>{saveSession(a);setSession(a)}}/>;

 const navItems=[
  {id:'capture',label:'Ambil Data',icon:<Camera/>,roles:['super_admin','admin','user']},
  {id:'daily',label:'Rekap Harian',icon:<ClipboardList/>,roles:['super_admin','admin','user']},
  {id:'dashboard',label:'Dashboard',icon:<BarChart3/>,roles:['super_admin','admin']},
  {id:'vehicles',label:'Posisi Terakhir',icon:<History/>,roles:['super_admin','admin','user']},
  {id:'notice',label:'Cetak Notice',icon:<Printer/>,roles:['super_admin','admin','user']},
  {id:'arrears',label:'Data Tunggakan',icon:<Database/>,roles:['super_admin','admin']},
  {id:'users',label:'Kelola Akun',icon:<UserPlus/>,roles:['super_admin','admin']},
  {id:'settings',label:'Profil & Setting',icon:<Settings/>,roles:['super_admin','admin','user']},
 ];
 const tabs=navItems.filter(item=>item.roles.includes(session.role));

 const tabTitles={capture:'Input Aksi Tempel',daily:'Rekap Harian',dashboard:'Dashboard Monitoring',vehicles:'Posisi Kendaraan Terakhir',notice:'Notice Tim Pembina Samsat',arrears:session.role==='super_admin'?'Kelola Data Tunggakan':'Data Tunggakan',users:'Kelola Akun Petugas',settings:'Profil & Pengaturan'};

 return<div className="app">
  <aside>
   <div className="brand"><div className="logo">AT</div><div><b>AKSI TEMPEL</b><span>Digital Monitoring</span></div></div>
   <nav>{tabs.map(t=><button key={t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.icon}{t.label}</button>)}</nav>
   <div className="account-box"><b>{session.name}</b><span>{session.role==='super_admin'?'Super Admin':session.role==='admin'?'Administrator':'Petugas Lapangan'}</span><button onClick={logout}>Keluar</button></div>
   <div className="dbstate"><Database/><div><b>{loadingDb?'Memuat...':db.length.toLocaleString('id-ID')}</b><span>Database kendaraan</span></div></div>
  </aside>
  <main>
   <header className="screen-header"><div><h1>{tabTitles[tab]||'Aksi Tempel'}</h1><p>OCR, bukti foto, histori kendaraan, dan tindak lanjut lapangan</p></div><div className="datebox"><span className="icon">{'\u{1F4C5}'}</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div></header>
   {tab==='capture'&&<CaptureView onCapture={handleCapture} db={db} loadingDb={loadingDb}/>}
   {tab==='daily'&&<DailyView date={date} setDate={setDate} entries={visibleEntries} session={session} setStatus={isUser(session)?()=>{}:setStatus} remove={remove} blast={isAdmin(session)?blast:()=>{}} openNotice={openNotice} exportExcel={exportExcel}/>}
   {tab==='dashboard'&&<DashboardView entries={visibleEntries} session={session}/>}
   {tab==='vehicles'&&<VehicleHistoryView entries={visibleEntries} openNotice={openNotice}/>}
   {tab==='notice'&&<NoticeView notice={selectedNotice} entries={visibleEntries} select={setSelectedNotice} language={printerLanguage} setLanguage={setPrinterLanguage} browserPrint={browserPrint} zebraPrint={zebraPrint} download={()=>selectedNotice&&downloadPrinterPayload(selectedNotice,printerLanguage)}/>}
   {tab==='arrears'&&<ArrearsView session={session}/>}
   {tab==='users'&&<UserManagementView/>}
   {tab==='settings'&&<ProfileSettingsView session={session} onLogout={logout}/>}
  </main>
 </div>
}

createRoot(document.getElementById('root')).render(<App/>);
