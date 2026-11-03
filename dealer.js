import {api,esc,money} from './commerce-api.js';
const message=document.getElementById('dealerMessage'),prices=document.getElementById('dealerPrices');
async function refresh(){
 prices.replaceChildren();
 try{
  const {user}=await api('/api/session');
  if(!user){message.textContent='Sign in to apply for dealer access. Retail prices remain available in the store.';return;}
  if(user.tier==='retail'){message.textContent=user.dealer?'Your '+user.dealer.kind+' application is '+user.dealer.status+'. Private prices require administrator approval.':'Submit a business application from your account to request access.';return;}
  const data=await api('/api/dealer/catalog');
  message.textContent='Approved '+data.tier+' access. Prices are private to your account. Confirm availability and dealer terms before ordering.';
  prices.innerHTML=data.products.map(p=>'<article><h3>'+esc(p.name)+'</h3>'+p.variants.map(v=>'<p>'+esc(v.label)+'<br><strong>'+(Number.isSafeInteger(v.pricePaise)?money(v.pricePaise):'Request private quotation')+'</strong></p>').join('')+'</article>').join('');
 }catch(e){message.textContent=e.message;}
}
// Private prices are never persisted in localStorage or embedded in static assets.
window.addEventListener('pageshow',refresh);
window.addEventListener('pagehide',()=>prices.replaceChildren());
document.addEventListener('visibilitychange',()=>{if(document.hidden)prices.replaceChildren();else refresh();});
