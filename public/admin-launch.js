import {api} from './commerce-api.js';

const summary=document.getElementById('launchStatus');
const container=document.getElementById('launchCheckList');
const refresh=document.getElementById('launchRefresh');
let inflight=false;
async function loadLaunch(){
 if(inflight)return;
 inflight=true;refresh.disabled=true;
 try{
  const result=await api('/api/admin/launch-readiness');
  const pass=result.checks.filter(check=>check.ready).length;
  summary.textContent='Mode: '+result.mode.toUpperCase()+' · '+pass+'/'+result.total+' readiness checks passed. Payment: '+(result.paymentsCurrentlyEnabled?'configured':'disabled')+' · Shipping: '+(result.shippingCurrentlyEnabled?'configured':'disabled')+'. '+(result.ready?'All software checks passed; verify actual live transactions before activation.':'Production checkout must remain gated until all blockers are resolved.');
  container.replaceChildren();
  for(const item of result.checks){
   const row=document.createElement('article');row.className='launch-check-row';
   const mark=document.createElement('span');mark.className='launch-check-mark';mark.textContent=item.ready?'✓':'!';
   mark.setAttribute('aria-label',item.ready?'Passed':'Needs verification');
   const group=document.createElement('div');
   const title=document.createElement('strong');title.textContent=item.id.replaceAll('_',' ').replace(/\b\w/g,char=>char.toUpperCase());
   const details=document.createElement('p');details.textContent=item.detail;
   group.append(title,details);row.append(mark,group);container.append(row);
  }
 }catch(e){summary.textContent='Readiness checks are only available when signed in as the store owner. '+e.message;}
 finally{inflight=false;refresh.disabled=false;}
}
refresh.addEventListener('click',()=>void loadLaunch());
document.addEventListener('admin-overview',()=>void loadLaunch());
