import {api,formObject,orderRows} from './commerce-api.js';

const $=id=>document.getElementById(id);
function notice(message,state='success'){
  const box=$('message');
  box.textContent=message;
  box.dataset.state=state;
  box.hidden=false;
}
function clearNotice(){
  $('message').hidden=true;
  $('message').textContent='';
}

async function refresh(){
  const {user}=await api('/api/session');
  $('anonymous').hidden=Boolean(user);
  $('signedIn').hidden=!user;
  if(!user){
    $('orders').textContent='';
    return;
  }
  $('welcome').textContent='Welcome, '+user.name;
  const tier={retail:'Retail customer',gym:'Approved gym account',wholesale:'Approved wholesale account'};
  $('tier').textContent=tier[user.tier]||'Customer account';
  $('dealerStatus').textContent=user.dealer
    ?'Your '+user.dealer.kind+' application: '+user.dealer.status+'.'
    :'Apply for review to request business pricing. Retail rates apply until approval.';
  $('dealer').querySelector('button[type="submit"]').disabled=Boolean(user.dealer)&&user.dealer.status!=='rejected';

  let saved;
  try{saved=JSON.parse(localStorage.getItem('mvn-order')||'null');}catch{}
  if(saved?.id&&saved?.token){
    try{await api('/api/me/claim-order',saved);}catch{
      // A saved guest reference may have expired or already been claimed.
      // Signed-in orders can still be displayed.
    }
  }
  const result=await api('/api/me/orders');
  $('orders').innerHTML=orderRows(result.orders||[]);
}

async function perform(button,request,successText){
  const previous=button.innerHTML;
  button.disabled=true;
  button.textContent='Please wait…';
  clearNotice();
  try{
    await request();
    await refresh();
    notice(successText);
  }catch(error){
    notice(error?.message||'Something went wrong. Please try again.','error');
  }finally{
    button.disabled=false;
    button.innerHTML=previous;
  }
}

const copy={
  login:'Signed in successfully.',
  register:'Your account has been created.',
  dealer:'Dealer application received for review.',
  password:'Password changed. Please sign in again.'
};
for(const name of ['register','login','dealer','password']){
  $(name).addEventListener('submit',event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const data=formObject(form);
    const button=event.submitter||form.querySelector('button[type="submit"]');
    void perform(button,async()=>{
      await api('/api/'+name,data);
      form.reset();
    },copy[name]);
  });
}
$('logout').addEventListener('click',event=>void perform(event.currentTarget,async()=>{
  await api('/api/logout',{});
},'Signed out successfully.'));

for(const toggle of document.querySelectorAll('[data-password-for]')){
  toggle.addEventListener('click',()=>{
    const field=$(toggle.dataset.passwordFor);
    const show=field.type==='password';
    field.type=show?'text':'password';
    toggle.textContent=show?'Hide':'Show';
    toggle.setAttribute('aria-label',show?'Hide password':'Show password');
  });
}
refresh().catch(error=>notice(error.message||'Unable to load account.','error'));
