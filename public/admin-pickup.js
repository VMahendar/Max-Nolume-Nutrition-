import {api} from './commerce-api.js';

const status=document.getElementById('pickupSetupStatus');
const checks=document.getElementById('pickupSetupChecks');
const reload=document.getElementById('pickupSetupRefresh');
let busy=false;
function node(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
async function refreshPickup(){
 if(busy)return;busy=true;reload.disabled=true;
 try{
  const s=await api('/api/admin/shipping-setup');
  checks.replaceChildren();
  const states=[
   ['Production application',s.productionMode,'This website is not yet running the verified production checkout.'],
   ['Shiprocket API user configured',s.apiCredentialsPresent,'API credentials must be stored privately in Render.'],
   ['Pickup location selected',s.pickupNamePresent,'The pickup name must exactly match an existing address in your Shiprocket account.'],
   ['Courier API tests approved',s.pickupApiVerified,'Verify authentic pickup, rates, courier assignment and cancellation in your account.'],
   ['Live courier booking',s.bookingEnabled,'Enabled only after production verification and owner acceptance.']
  ];
  for(const [title,passed,detail] of states){
   const item=node('article','');item.className='pickup-setup-check';
   const mark=node('strong',passed?'✓':'—');mark.className=passed?'pickup-check-yes':'pickup-check-wait';
   const info=node('div','');const h=node('b',title);const p=node('p',detail);
   info.append(h,p);item.append(mark,info);checks.append(item);
  }
  status.textContent=s.bookingEnabled?'Courier connection configured. Verify account-level pickup scheduling before accepting real orders.':'Courier pickup is NOT live. You can complete Shiprocket signup while the website stays in safe preview mode.';
 }catch(error){status.textContent='Owner login required to view pickup configuration: '+error.message;checks.replaceChildren();}
 finally{busy=false;reload.disabled=false;}
}
reload.addEventListener('click',()=>void refreshPickup());
document.addEventListener('admin-overview',()=>void refreshPickup());
