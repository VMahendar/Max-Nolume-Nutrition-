// Optional secure checkout. The server must explicitly report payment readiness.
// Provider credentials and payment verification stay on the backend.
(()=>{
 const form=document.getElementById('checkoutFields'),preference=document.getElementById('paymentPreference');
 if(!form||!preference)return;
 const option=document.createElement('option');option.value='secure-online';option.textContent='Pay securely online with Razorpay';
 const fields=document.createElement('fieldset');fields.hidden=true;fields.className='secure-payment-fields';
 const legend=document.createElement('legend');legend.textContent='Secure online payment';
 const emailLabel=document.createElement('label');emailLabel.textContent='Email for your order';
 const email=document.createElement('input');email.type='email';email.autocomplete='email';email.maxLength=199;email.required=true;email.disabled=true;email.id='paymentEmail';emailLabel.append(email);
 const termsLabel=document.createElement('label'),terms=document.createElement('input');terms.type='checkbox';terms.required=true;terms.disabled=true;terms.id='paymentTerms';terms.style.width='auto';
 termsLabel.append(terms,document.createTextNode(' I accept the '));
 for(const [index,[label,href]] of [['Terms','terms.html'],['Shipping policy','shipping.html'],['Returns policy','returns.html']].entries()){
  if(index)termsLabel.append(document.createTextNode(' · '));const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';termsLabel.append(a);
 }
 const note=document.createElement('p'),review=document.createElement('div');note.id='securePaymentMessage';note.setAttribute('role','status');review.id='securePaymentReview';
 fields.append(legend,emailLabel,termsLabel,note,review);preference.parentElement.after(fields);
 const send=document.getElementById('send'),originalLabel=send.textContent,consent=document.getElementById('leadConsent'),consentText=consent?.nextSibling,originalConsent=consentText?.textContent;
 const notice=form.querySelector('.checkout-message'),noticeSmall=notice?.nextElementSibling;
 let ready=false,busy=false,attempt=null;
 const online=()=>preference.value==='secure-online';
 function mode(){fields.hidden=!online();email.disabled=terms.disabled=!online();send.textContent=online()?'REVIEW SECURE PAYMENT →':originalLabel;if(notice)notice.hidden=online();if(noticeSmall?.tagName==='SMALL')noticeSmall.hidden=online();if(consentText&&originalConsent)consentText.textContent=online()?' I understand Max Volume Nutrition will save my order and delivery details to process this purchase. This does not subscribe me to marketing messages.':originalConsent;review.replaceChildren();}
 preference.addEventListener('change',mode);
 form.addEventListener('input',()=>review.replaceChildren());
 const format=paise=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(paise/100);
 async function api(path,body,headers={}){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw Error(b.error||'Request failed.');return b;}
 function sdk(){if(window.Razorpay)return Promise.resolve();return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Secure payment could not load. Your cart is saved.'));};document.head.append(script);});}
 function remember(order){try{localStorage.setItem('mvn-order',JSON.stringify({id:order.id,token:order.token}));}catch{}}
 async function openPayment(order,customer,snapshot){
  busy=true;send.disabled=true;review.querySelector('button').disabled=true;note.textContent='Opening Razorpay. Enter payment details only inside the secure provider window.';
  const unlock=()=>{busy=false;send.disabled=!Object.keys(cart).length;const button=review.querySelector('button');if(button)button.disabled=false;};
  try{
   await sdk();
   const payment=new window.Razorpay({key:order.key,amount:order.amount,currency:order.currency,order_id:order.providerOrderId,name:'Max Volume Nutrition',description:order.id,prefill:{name:customer.name,email:customer.email,contact:customer.phone},theme:{color:'#1859ea'},
    handler:async response=>{
     try{const verified=await api('/api/verify',{id:order.id,token:order.token,...response});if(verified.status!=='paid')throw Error('Payment confirmation is pending. Contact the store before paying again.');
      for(const [key,quantity] of Object.entries(snapshot)){if(cart[key]){cart[key]-=quantity;if(cart[key]<=0)delete cart[key];}}persist();review.replaceChildren();note.textContent='Payment verified. Order '+order.id+'. Delivery updates will appear in your account or can be requested from the store.';attempt=null;try{sessionStorage.removeItem('mvn-payment-attempt');}catch{}
     }catch(error){note.textContent=error.message+' Order '+order.id+'. Do not start another payment until this is resolved.';review.replaceChildren();}
     finally{unlock();}
    },modal:{ondismiss:()=>{note.textContent='Payment window closed. Order '+order.id+' remains available for reconciliation; no success has been assumed.';unlock();}}});
   payment.on('payment.failed',()=>{note.textContent='Payment was not completed. Check your payment status before retrying. Order '+order.id;unlock();});payment.open();
  }catch(error){note.textContent=error.message+' Order '+order.id;unlock();}
 }
 form.addEventListener('submit',async event=>{
  if(!online())return;event.preventDefault();event.stopImmediatePropagation();if(busy||!ready||!form.reportValidity())return;
  if(document.getElementById('offerCode').value.trim()){note.textContent='Offer-code orders currently use WhatsApp confirmation. Choose a WhatsApp payment preference to keep your offer.';return;}
  busy=true;send.disabled=true;review.replaceChildren();note.textContent='Checking current prices, stock and delivery charges…';
  try{
   const response=await fetch('/api/retail/catalog',{cache:'no-store'});if(!response.ok)throw Error('Current payment readiness could not be checked.');const current=await response.json();if(current.paymentReady!==true)throw Error('Online payments are unavailable. No payment has been taken.');
   const snapshot=Object.fromEntries(Object.entries(cart).filter(([key])=>getItem(key)));
   const items=Object.entries(snapshot).map(([variantId,quantity])=>({variantId,quantity}));if(!items.length)throw Error('Add products to your cart first.');
   const customer=Object.fromEntries([['name','customerName'],['phone','customerPhone'],['address','customerAddress'],['city','customerCity'],['state','customerState'],['pincode','customerPincode']].map(([key,id])=>[key,document.getElementById(id).value.trim()]));customer.email=email.value.trim();
   const payload={items,customer,acceptedTerms:terms.checked,pricing:'retail'};
   const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload))))].map(n=>n.toString(16).padStart(2,'0')).join('');
   if(!attempt){try{attempt=JSON.parse(sessionStorage.getItem('mvn-payment-attempt')||'null');}catch{}}
   if(!attempt||attempt.digest!==digest)attempt={digest,key:crypto.randomUUID()};try{sessionStorage.setItem('mvn-payment-attempt',JSON.stringify(attempt));}catch{}
   const order=await api('/api/checkout',payload,{'Idempotency-Key':attempt.key});remember(order);
   const summary=document.createElement('p');summary.textContent='Server-confirmed total: '+format(order.amount)+' including the configured delivery charge and applicable taxes. Review this total before continuing.';
   const button=document.createElement('button');button.type='button';button.textContent='Continue to Razorpay · '+format(order.amount);
   button.onclick=()=>{if(!busy)openPayment(order,customer,snapshot);};review.append(summary,button);note.textContent='Order '+order.id+' is prepared. Payment has not been taken.';
  }catch(error){note.textContent=error.message;}
  finally{busy=false;send.disabled=!Object.keys(cart).length;}
 },true);
 fetch('/api/retail/catalog',{cache:'no-store'}).then(async response=>{if(!response.ok)return;const data=await response.json();if(data.paymentReady===true){ready=true;preference.append(option);}}).catch(()=>{});
 fetch('/api/session',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.user){email.value=data.user.email;email.readOnly=true;}}).catch(()=>{});
})();
