import {api,money} from './commerce-api.js';
const form=document.getElementById('ownerEntryForm'),message=document.getElementById('deskMessage'),preview=document.getElementById('ownerEntryPreview'),select=form.elements.variantId;
let data,pending=null;
async function load(){
 data=await api('/api/admin/owner-desk');const selected=select.value;select.replaceChildren(...data.products.flatMap(p=>p.variants.map(v=>{const option=document.createElement('option');option.value=v.id;option.textContent=p.name+' · '+v.label+' · '+(v.onHand===null?'Count stock first':v.stock+' available');return option;})));if([...select.options].some(o=>o.value===selected))select.value=selected;
 const low=data.products.flatMap(p=>p.variants).filter(v=>Number.isSafeInteger(v.stock)&&v.stock<=3).length;
 document.getElementById('deskSummary').textContent=low+' pack(s) have 3 or fewer units available. '+data.entries.length+' recent manual stock/sale entries.';
 document.getElementById('deskHistory').replaceChildren(...data.entries.map(entry=>{const line=document.createElement('p');line.textContent=new Date(entry.created).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' · '+(entry.kind==='purchase'?'Stock received':'Manual sale')+' · '+entry.product+' / '+entry.pack+' × '+entry.quantity+' · '+money(entry.totalPaise)+' · '+entry.contact+' · '+entry.reference;return line;}));
}
function clearPreview(){pending=null;preview.hidden=true;}
form.addEventListener('input',clearPreview);
document.getElementById('reloadDesk').onclick=async()=>{try{await load();clearPreview();message.textContent='Current stock refreshed.';}catch(error){message.textContent=error.message;}};
form.onsubmit=event=>{
 event.preventDefault();try{const b=Object.fromEntries(new FormData(form)),variant=data.products.flatMap(p=>p.variants).find(v=>v.id===b.variantId);if(!Number.isSafeInteger(variant?.onHand))throw Error('Set the starting stock in Inventory first.');
  if(!b.contact.trim()||!b.reference.trim())throw Error('Add a supplier/customer name and a unique bill or order reference.');
  const quantity=Number(b.quantity),unitPaise=Math.round(Number(b.unitPrice)*100),after=variant.onHand+(b.kind==='purchase'?quantity:-quantity);if(after<variant.reserved)throw Error('Not enough available stock.');
  pending={kind:b.kind,variantId:b.variantId,quantity,unitPaise,version:variant.version,contact:b.contact.trim(),reference:b.reference.trim(),note:b.note,requestKey:crypto.randomUUID(),confirmed:true};
  document.getElementById('ownerEntrySummary').textContent=(b.kind==='purchase'?'RECEIVE STOCK':'RECORD MANUAL SALE')+'\n'+select.selectedOptions[0].textContent+'\n'+quantity+' units × '+money(unitPaise)+' = '+money(quantity*unitPaise)+'\nPhysical stock: '+variant.onHand+' → '+after+'\n'+pending.contact+' · '+pending.reference+'\n'+(b.kind==='sale'?'Only record completed sales outside this website checkout. Check payment yourself; this does not verify payment or issue a tax invoice.':'Record only stock physically received. Supplier costs stay private.');preview.hidden=false;
 }catch(error){message.textContent=error.message;}
};
document.getElementById('confirmOwnerEntry').onclick=async event=>{
 if(!pending)return;const button=event.currentTarget;button.disabled=true;form.inert=true;
 try{await api('/api/admin/owner-desk',pending);clearPreview();form.reset();message.textContent='Saved once. Stock and the private record have been updated.';await load();document.dispatchEvent(new Event('owner-stock-changed'));}catch(error){message.textContent=error.message+' You can retry the same entry safely, or reload stock before making a new one.';}finally{button.disabled=false;form.inert=false;}
};
load().catch(()=>{form.hidden=true;message.textContent='Sign in as an administrator to use your daily desk.';});
