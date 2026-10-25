import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
type Target = {id:string;user_id:string;target_type:'domain'|'ip';target_value:string;frequency_minutes:number};
const valid = (t:Target,v:string) => t==='domain' ? /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(v) : /^[0-9a-fA-F:.]{3,45}$/.test(v);
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(req.method!=='POST') return new Response('Method not allowed',{status:405,headers:cors});
 const secret=Deno.env.get('MONITORING_CRON_SECRET');
 if(!secret || req.headers.get('authorization')!==`Bearer ${secret}`) return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{...cors,'Content-Type':'application/json'}});
 const url=Deno.env.get('SUPABASE_URL'), key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!key) return new Response(JSON.stringify({error:'Server configuration incomplete'}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:due,error}=await db.from('investigation_targets').select('id,user_id,target_type,target_value,frequency_minutes').eq('monitor_enabled',true).lte('next_run_at',new Date().toISOString()).in('target_type',['domain','ip']).order('next_run_at').limit(50);
 if(error) return new Response(JSON.stringify({error:'Unable to load targets'}),{status:500,headers:{...cors,'Content-Type':'application/json'}});
 const outcomes=[];
 for(const target of (due??[]) as Target[]) {
  let status:'ok'|'not_found'|'error'='error', summary='Public RDAP lookup failed.', details:Record<string,unknown>={};
  try {
   if(!valid(target.target_type,target.target_value)) throw new Error('Invalid target format');
   const response=await fetch(`https://rdap.org/${target.target_type==='domain'?'domain':'ip'}/${encodeURIComponent(target.target_value)}`,{headers:{accept:'application/rdap+json, application/json'},signal:AbortSignal.timeout(10000)});
   if(response.status===404){status='not_found';summary='No public RDAP record was found at check time.';}
   else if(!response.ok) throw new Error(`RDAP provider HTTP ${response.status}`);
   else {
    const body=await response.json() as Record<string,unknown>; status='ok';
    const statuses=Array.isArray(body.status)?body.status.filter((x):x is string=>typeof x==='string'):[];
    details={objectClassName:body.objectClassName??null,handle:body.handle??null,ldhName:body.ldhName??null,startAddress:body.startAddress??null,endAddress:body.endAddress??null,status:statuses,events:Array.isArray(body.events)?body.events.slice(0,12):[]};
    summary=`Public RDAP record found.${statuses.length?' Status: '+statuses.join(', ')+'.':''}`;
   }
  } catch(e) { summary=e instanceof Error?e.message.slice(0,500):'Unknown lookup error'; }
  const checked=new Date(), next=new Date(checked.getTime()+Math.max(60,target.frequency_minutes||360)*60000);
  await db.from('monitoring_runs').insert({target_id:target.id,user_id:target.user_id,status,summary,details,checked_at:checked.toISOString()});
  await db.from('investigation_targets').update({last_run_at:checked.toISOString(),last_status:status,next_run_at:next.toISOString()}).eq('id',target.id);
  outcomes.push({id:target.id,status});
 }
 return new Response(JSON.stringify({processed:outcomes.length,outcomes}),{headers:{...cors,'Content-Type':'application/json'}});
});
