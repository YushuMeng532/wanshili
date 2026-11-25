export default async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 try{
  const r=await fetch('https://wanshili-ai.wanshili-trial-532.workers.dev/api/plan',{headers:{Origin:'https://yushumeng532.github.io'},signal:AbortSignal.timeout(5000),redirect:'error'});
  return res.status(r.status===405?200:503).json({reachable:r.status===405,upstreamStatus:r.status});
 }catch{return res.status(503).json({reachable:false});}
}
