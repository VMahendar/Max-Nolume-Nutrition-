import {api} from './commerce-api.js';
const summary=document.getElementById('leadInboxSummary');
const rows=document.getElementById('leadInboxRows');
const message=document.getElementById('leadInboxMessage');
const refresh=document.getElementById('refreshLeadInbox');
let busy=false;
function el(tag,txt){const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);return e;}
function td(...nodes){const cell=document.createElement('td');for(const node of nodes)cell.append(node);return cell;}
function timeLocal(iso){return iso?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso)).replace(' ','T'):'';}
async function load(){
 if(busy)return;busy=true;refresh.disabled=true;
 try{
  const data=await api('/api/admin/leads');
  summary.textContent=data.total+' recorded enquiries · '+data.new+' new · '+data.due+' follow-ups due'+(data.total>data.showing?' · showing latest '+data.showing:'')+'. Follow-ups and messages are manual until sending is connected.';
  rows.replaceChildren();
  if(!data.rows.length){const p=el('p','No website enquiries recorded yet. This inbox is separate from WhatsApp chats that were never submitted through the website.');rows.append(p);return;}
  const table=el('table'),thead=el('thead'),header=el('tr');
  for(const label of ['Received','Customer / business','Request','Follow-up and action'])header.append(el('th',label));
  thead.append(header);table.append(thead);
  const tbody=el('tbody');
  for(const item of data.rows){
   const tr=el('tr'),created=el('small',new Date(item.created).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}));
   tr.append(td(el('strong',item.id),el('div',item.kind.toUpperCase()),created));
   const contact=el('div');contact.append(el('strong',item.name));if(item.business)contact.append(el('div',item.business));
   contact.append(el('div',item.phone),el('div',item.region+(item.city?' · '+item.city:'')));
   tr.append(td(contact));
   const description=el('div');
   if(item.kind==='wholesale'){description.textContent=(item.detail.businessType||'')+' · '+(item.detail.requirements||'');if(item.detail.gstin)description.append(el('div','GSTIN: '+item.detail.gstin));}
   else{for(const line of item.detail.lines||[])description.append(el('div',line.product+' · '+line.pack+' × '+line.quantity));description.append(el('small','Quoted total not final; confirm stock, offers and delivery.'));}
   tr.append(td(description));
   const controls=el('div');controls.className='lead-controls';
   const status=el('select');status.setAttribute('aria-label','Status for '+item.id);
   for(const name of ['new','contacted','quoted','converted','closed']){const opt=el('option',name);opt.value=name;opt.selected=item.status===name;status.append(opt);}
   const follow=el('input');follow.type='datetime-local';follow.value=timeLocal(item.followUpAt);follow.setAttribute('aria-label','Follow-up time for '+item.id);
   const note=el('textarea');note.rows=2;note.maxLength=1000;note.placeholder='Private notes and next action';note.value=item.ownerNote||'';note.setAttribute('aria-label','Notes for '+item.id);
   const buttons=el('div');buttons.className='lead-buttons';
   const send=el('a','Open WhatsApp');send.href='https://wa.me/'+encodeURIComponent(item.phone)+'?text='+encodeURIComponent('Hello '+item.name+', thank you for contacting Max Volume Nutrition about your '+(item.kind==='retail'?'order request':'wholesale enquiry')+'. How can we assist?');send.target='_blank';send.rel='noopener noreferrer';
   const save=el('button','Save follow-up');save.type='button';save.onclick=async()=>{
    save.disabled=true;message.textContent='Saving…';
    try{
     await api('/api/admin/leads',{id:item.id,status:status.value,followUpAt:follow.value?new Date(follow.value).toISOString():null,ownerNote:note.value});
     message.textContent='Follow-up saved. No message was sent.';
     await loadAfterSave();
    }catch(error){message.textContent=error.message;}finally{save.disabled=false;}
   };
   buttons.append(send,save);controls.append(status,follow,note,buttons);tr.append(td(controls));tbody.append(tr);
  }
  table.append(tbody);rows.append(table);message.textContent='';
 }catch(error){message.textContent=error.message;}finally{busy=false;refresh.disabled=false;}
}
async function loadAfterSave(){busy=false;await load();}
refresh.onclick=()=>void load();
document.addEventListener('admin-overview',()=>void load());
