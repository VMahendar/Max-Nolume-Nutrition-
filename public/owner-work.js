import {api} from './commerce-api.js';
const form=document.getElementById('ownerWorkForm'),message=document.getElementById('ownerWorkMessage'),history=document.getElementById('ownerWorkHistory');
let key=crypto.randomUUID();
function prompt(entry){return `Max Volume Nutrition — owner change request ${entry.id}\n\n${entry.request}\n\nRepository: VMahendar/Max-Volume-Nutrition-\nHosting: Render workspace Max Volume Nutrition (tea-dbjqt8nlk1mc73a26c10) only. My Work is an owner dashboard section, not Render's My Workspace.\nInspect the current code and implement this request without overwriting working features. Preserve retail prices, private dealer pricing, authentication, and the public launch schedule unless this request explicitly changes them. Test the result and show the reviewable changes. Report deployment status accurately; do not claim a request is implemented or deployed just because it was saved here. Keep credentials server-side.`;}
async function copy(entry,button){
 try{await navigator.clipboard.writeText(prompt(entry));button.textContent='Copied';message.textContent='Copied. Open your ChatGPT or Codex conversation and paste the request. Saving or copying does not start work automatically.';}
 catch{const area=document.createElement('textarea');area.readOnly=true;area.value=prompt(entry);area.setAttribute('aria-label','Request to copy manually');button.after(area);area.focus();area.select();message.textContent='Select and copy the request below, then paste it into ChatGPT or Codex.';}
}
async function load(){
 const data=await api('/api/admin/my-work');
 history.replaceChildren(...data.requests.map(entry=>{
  const article=document.createElement('article'),date=document.createElement('small'),text=document.createElement('p'),button=document.createElement('button');
  article.className='owner-work-entry';date.textContent=new Date(entry.created).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' · Saved · awaiting handoff';text.textContent=entry.request;button.type='button';button.textContent='Copy for ChatGPT / Codex';button.onclick=()=>copy(entry,button);article.append(date,text,button);return article;
 }));
 if(!data.requests.length)history.textContent='Your saved requests will appear here.';
}
form.addEventListener('input',()=>{key=crypto.randomUUID();});
form.onsubmit=async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;form.inert=true;
 try{await api('/api/admin/my-work',{request:form.elements.request.value,requestKey:key});form.reset();key=crypto.randomUUID();message.textContent='Request saved privately. Copy it below and paste it into ChatGPT or Codex to start the work.';await load();}
 catch(error){message.textContent=error.message+' Your text has been kept; you can retry.';}
 finally{button.disabled=false;form.inert=false;}
};
load().catch(()=>{form.hidden=true;history.replaceChildren();message.textContent='Sign in with an administrator account to view My Work.';});
addEventListener('pagehide',()=>{form.reset();history.replaceChildren();});
addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
