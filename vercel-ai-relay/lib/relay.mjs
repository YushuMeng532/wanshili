export const origin='https://yushumeng532.github.io';
const upstream='https://wanshili-ai.wanshili-trial-532.workers.dev';
export function createRelay(path,request=fetch){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.origin!==origin)return res.status(403).json({error:'forbidden'});
  res.setHeader('Access-Control-Allow-Origin',origin);
  if(req.method==='OPTIONS'){
   res.setHeader('Access-Control-Allow-Methods','POST');
   res.setHeader('Access-Control-Allow-Headers','Content-Type');
   res.setHeader('Access-Control-Max-Age','600');
   return res.status(204).end();
  }
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(400).json({error:'invalid'});
  let body;
  try{const parsed=typeof req.body==='string'?JSON.parse(req.body):req.body;
   if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();
   body=JSON.stringify(parsed);
   if(Buffer.byteLength(body)>4096)throw Error();
  }catch{return res.status(400).json({error:'invalid'});}
  const signal=AbortSignal.timeout(20000);
  try{
   const result=await request(upstream+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body,signal,redirect:'error'});
   const text=await result.text();
   if(text.length>16000)throw Error();
   const data=JSON.parse(text);
   return res.status(result.status).json(data);
  }catch{return res.status(signal.aborted?504:502).json({error:signal.aborted?'upstream_timeout':'unavailable'});}
 };
}
