import {createHmac} from 'node:crypto';

const CAPTCHA_SECRET='aksi-tempel-captcha-2024';
const captchaAnswer=ans=>String(ans).trim();
const captchaToken=(ans)=>{const v=captchaAnswer(ans);return createHmac('sha256',CAPTCHA_SECRET).update(v).digest('hex').slice(0,16)};

export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const ops=['+','-'];
  const op=ops[Math.floor(Math.random()*ops.length)];
  const a=Math.floor(Math.random()*20)+1;
  const b=Math.floor(Math.random()*20)+1;
  const answer=op==='+'?a+b:a-b;
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({question:`${a} ${op} ${b} = ?`,token:captchaToken(String(answer)),hint:'Jawab soal matematika di atas'});
}
