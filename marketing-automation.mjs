import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {activeCampaigns} from './promotions.mjs';
const DAY=86400000;
export function initializeMarketing(C){
 C.db.exec("CREATE TABLE IF NOT EXISTS marketing_outbox(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,event_id TEXT NOT NULL,consent TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',created TEXT NOT NULL,attempted TEXT,accepted TEXT,provider_id TEXT,error TEXT); CREATE INDEX IF NOT EXISTS marketing_outbox_status ON marketing_outbox(status,created);");
 if(C.setting('marketingAutomation')===null)C.set('marketingAutomation',{enabled:false,announcements:[]});
}
export function marketingReadiness(env=process.env){
 const reasons=[];
 if(env.MARKETING_AUTOMATION_ENABLED!=='true')reasons.push('Enable MARKETING_AUTOMATION_ENABLED after provider setup.');
 if(env.NODE_ENV!=='production'||env.STAGING_MODE!=='false')reasons.push('Live WhatsApp delivery is disabled on staging/test data.');
 let valid=false;try{const u=new URL(env.MARKETING_PUBLIC_ORIGIN);valid=u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash;}catch{}
 if(!valid)reasons.push('Set MARKETING_PUBLIC_ORIGIN to the approved HTTPS store origin.');
 if((env.MARKETING_LINK_SECRET||'').length<32)reasons.push('Set a random MARKETING_LINK_SECRET of 32+ characters.');
 if(!(env.WHATSAPP_ACCESS_TOKEN&&/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')&&/^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_VERSION||'')&&env.WHATSAPP_MARKETING_TEMPLATE&&env.WHATSAPP_TEMPLATE_LANGUAGE))reasons.push('Connect WhatsApp Cloud API with an approved marketing template.');
 return {ready:reasons.length===0,channel:'whatsapp',reasons};
}
export function enqueueMarketing(C,now=Date.now()){
 const {db}=C,config=C.setting('marketingAutomation')||{};
 const campaigns=[...activeCampaigns(C.setting('campaigns'),'web',now),...activeCampaigns(C.setting('campaigns'),'app',now)];
 const events=[...new Map(campaigns.map(c=>[c.id,{id:c.id+':'+c.startsAt,kind:'campaign',title:c.title,text:c.description+' Use '+c.code+'. '+c.terms,endsAt:c.endsAt}])).values()];
 for(const a of config.announcements||[])if(a.enabled&&Date.parse(a.startsAt)<=now&&now<Date.parse(a.endsAt))events.push({id:a.id+':'+a.startsAt,kind:'announcement',title:a.title,text:a.text,endsAt:a.endsAt});
 let added=0;
 for(const p of db.prepare('SELECT m.*,u.name FROM marketing_preferences m JOIN users u ON u.id=m.user_id WHERE m.consented_at IS NOT NULL AND m.whatsapp_opt_in=1').all()){
  if(!/^\d{10,15}$/.test(p.phone))continue;
  const trade=!!db.prepare("SELECT 1 FROM dealers WHERE user_id=? AND status='approved'").get(p.user_id);
  const jobs=p.festival_opt_in?events.filter(e=>!trade||e.kind!=='campaign'):[];
  if(p.cadence_days>0){
   const paid=db.prepare("SELECT MAX(created) AS last FROM orders WHERE user_id=? AND status='paid'").get(p.user_id)?.last;
   const anchor=Math.max(...[p.consented_at,p.last_reorder_contact_at,paid].filter(Boolean).map(Date.parse));
   const period=Math.floor((now-anchor)/(p.cadence_days*DAY));
   const last=db.prepare("SELECT MAX(COALESCE(accepted,attempted)) AS last FROM marketing_outbox WHERE user_id=? AND kind='reorder' AND status IN ('accepted','sending','unknown')").get(p.user_id)?.last;
   if(period>=1&&(!last||now-Date.parse(last)>=p.cadence_days*DAY))jobs.push({id:'reorder:'+anchor+':'+period,kind:'reorder',title:'Your supplement routine',text:'Your '+p.cadence_days+'-day reminder from Max Volume Nutrition. Check your current supplies and browse our latest retail collection.',endsAt:new Date(now+DAY).toISOString()});
  }
  for(const event of jobs){
   const id=createHash('sha256').update([p.user_id,p.consented_at,event.id].join('|')).digest('hex');
   added+=db.prepare('INSERT OR IGNORE INTO marketing_outbox(id,user_id,kind,event_id,consent,payload,created) VALUES(?,?,?,?,?,?,?)').run(id,p.user_id,event.kind,event.id,p.consented_at,JSON.stringify(event),new Date(now).toISOString()).changes;
  }
 }
 return added;
}
export function unsubscribeToken(userId,consent,secret,expires=Date.now()+90*DAY){
 const data=Buffer.from(JSON.stringify({u:userId,c:consent,e:expires})).toString('base64url');
 return data+'.'+createHmac('sha256',secret).update(data).digest('hex');
}
export function verifyUnsubscribe(token,secret,now=Date.now()){
 if(!secret||typeof token!=='string'||token.length>1500)throw Error('Invalid unsubscribe link.');
 const [data,sig]=token.split('.'),expected=createHmac('sha256',secret).update(data||'').digest('hex');
 if(!/^[a-f0-9]{64}$/.test(sig||'')||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error('Invalid unsubscribe link.');
 const decoded=JSON.parse(Buffer.from(data,'base64url').toString());if(!decoded.u||!decoded.c||decoded.e<now)throw Error('Unsubscribe link has expired.');return decoded;
}
export async function deliverMarketing(C,{env=process.env,now=Date.now(),fetchImpl=fetch,max=25}={}){
 if(!marketingReadiness(env).ready||C.setting('marketingAutomation')?.enabled!==true)return {accepted:0,blocked:true};
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kolkata',hour:'2-digit',hourCycle:'h23'}).format(now));
 if(hour<9||hour>=20)return {accepted:0,quietHours:true};
 const {db}=C;let accepted=0;
 db.prepare("UPDATE marketing_outbox SET status='unknown',error='Interrupted send; verify provider before retry' WHERE status='sending' AND attempted<?").run(new Date(now-600000).toISOString());
 for(const job of db.prepare("SELECT * FROM marketing_outbox WHERE status='queued' ORDER BY created LIMIT ?").all(max)){
  if(C.setting('marketingAutomation')?.enabled!==true)break;
  const p=db.prepare('SELECT m.*,u.name FROM marketing_preferences m JOIN users u ON u.id=m.user_id WHERE m.user_id=?').get(job.user_id),event=JSON.parse(job.payload);
  let active=true;
  if(job.kind==='campaign'){
   const current=[...activeCampaigns(C.setting('campaigns'),'web',now),...activeCampaigns(C.setting('campaigns'),'app',now)].find(c=>c.id+':'+c.startsAt===job.event_id);
   active=!!current&&!db.prepare("SELECT 1 FROM dealers WHERE user_id=? AND status='approved'").get(job.user_id);
   if(current)Object.assign(event,{title:current.title,text:current.description+' Use '+current.code+'. '+current.terms,endsAt:current.endsAt});
  }
  if(job.kind==='announcement'){
   const current=(C.setting('marketingAutomation')?.announcements||[]).find(a=>a.enabled&&a.id+':'+a.startsAt===job.event_id&&Date.parse(a.startsAt)<=now&&now<Date.parse(a.endsAt));
   active=!!current;if(current)Object.assign(event,{title:current.title,text:current.text,endsAt:current.endsAt});
  }
  if(job.kind==='reorder'&&p?.cadence_days>0){
   const paid=db.prepare("SELECT MAX(created) AS last FROM orders WHERE user_id=? AND status='paid'").get(job.user_id)?.last;
   const previous=db.prepare("SELECT MAX(COALESCE(accepted,attempted)) AS last FROM marketing_outbox WHERE user_id=? AND kind='reorder' AND status IN ('accepted','sending','unknown')").get(job.user_id)?.last;
   const anchor=Math.max(...[p.consented_at,p.last_reorder_contact_at,paid,previous].filter(Boolean).map(Date.parse));
   active=now>=anchor+p.cadence_days*DAY;
  }
  const consent=p?.consented_at===job.consent&&p.whatsapp_opt_in&&/^\d{10,15}$/.test(p.phone)&&(job.kind==='reorder'?p.cadence_days>0:p.festival_opt_in);
  if(!consent||!active||Date.parse(event.endsAt)<=now){db.prepare("UPDATE marketing_outbox SET status='cancelled',error='Consent or event no longer valid' WHERE id=?").run(job.id);continue;}
  const last=db.prepare("SELECT MAX(COALESCE(accepted,attempted)) AS last FROM marketing_outbox WHERE user_id=? AND status IN ('accepted','sending','unknown')").get(job.user_id)?.last;
  if(last&&now-Date.parse(last)<DAY)continue;
  if(db.prepare("UPDATE marketing_outbox SET status='sending',attempted=? WHERE id=? AND status='queued'").run(new Date(now).toISOString(),job.id).changes!==1)continue;
  const base=env.MARKETING_PUBLIC_ORIGIN.replace(/\/$/,''),unsubscribe=base+'/unsubscribe.html?token='+unsubscribeToken(p.user_id,p.consented_at,env.MARKETING_LINK_SECRET),link=base+'/mobile-app.html'+(job.kind==='campaign'?'#offers':job.kind==='announcement'?'#brands':'');
  try{
   const response=await fetchImpl('https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID+'/messages',{method:'POST',headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:p.phone,type:'template',template:{name:env.WHATSAPP_MARKETING_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[p.name,event.title+'. '+event.text,link,unsubscribe].map(text=>({type:'text',text}))}]}}),signal:AbortSignal.timeout(15000)});
   const data=await response.json(),id=data.messages?.[0]?.id;
   if(!response.ok){db.prepare('UPDATE marketing_outbox SET status=?,error=? WHERE id=?').run(response.status>=500?'unknown':'failed','Provider HTTP '+response.status,job.id);continue;}
   if(!id){db.prepare("UPDATE marketing_outbox SET status='unknown',error='Provider acceptance could not be confirmed' WHERE id=?").run(job.id);continue;}
   db.prepare("UPDATE marketing_outbox SET status='accepted',accepted=?,provider_id=?,error=NULL WHERE id=?").run(new Date(now).toISOString(),String(id).slice(0,300),job.id);accepted++;
  }catch{db.prepare("UPDATE marketing_outbox SET status='unknown',error='Network outcome unknown; verify provider before retry' WHERE id=?").run(job.id);}
 }
 return {accepted};
}
export function startMarketingScheduler(C,env=process.env){
 let busy=false,stopped=false;
 const tick=async()=>{if(stopped||busy||!marketingReadiness(env).ready||C.setting('marketingAutomation')?.enabled!==true)return;busy=true;try{enqueueMarketing(C);await deliverMarketing(C,{env});}catch{console.error('WhatsApp scheduler failed; inspect the administrator queue.');}finally{busy=false}};
 const interval=setInterval(()=>void tick(),300000);interval.unref();const initial=setTimeout(()=>void tick(),60000);initial.unref();
 return ()=>{stopped=true;clearInterval(interval);clearTimeout(initial)};
}
