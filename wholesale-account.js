import {api,formObject} from './commerce-api.js';
const $=id=>document.getElementById(id);
function message(text,error=false){const el=$('wholesaleMessage');el.textContent=text;el.dataset.state=error?'error':'success';el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'center'});}
async function refresh(){
 const {user}=await api('/api/session');
 $('wholesaleAnon').hidden=!!user;
 $('wholesaleSigned').hidden=!user;
 if(!user)return;
 $('wholesaleWelcome').textContent='Welcome, '+user.name;
 const d=user.dealer;
 $('wholesaleApplySection').hidden=!!d&&d.status!=='rejected';
 const status=d?.status||'not applied';
 $('wholesaleStatus').textContent='Application: '+status.toUpperCase();
 const approved=d?.status==='approved'&&user.tier!=='retail';
 $('wholesaleStatusDetails').textContent=approved
   ?'Your '+user.tier+' trade access has been approved. View private dealer prices in the business catalogue.'
   :d?.status==='pending'
     ?'Your '+d.kind+' application is pending administrator verification. Retail prices apply until approval.'
     :'Complete the separate business application below for trade pricing review.';
 $('wholesalePricesLink').hidden=!approved;
}
async function submit(form,endpoint,success){
 const btn=form.querySelector('button[type="submit"]'),old=btn.innerHTML;
 btn.disabled=true;btn.textContent='Please wait…';
 $('wholesaleMessage').hidden=true;
 try{
   await api(endpoint,formObject(form));
   form.reset();await refresh();message(success);
 }catch(error){message(error?.message||'Could not complete your request.',true);}
 finally{btn.disabled=false;btn.innerHTML=old;}
}
$('b2bLogin').addEventListener('submit',e=>{e.preventDefault();void submit(e.currentTarget,'/api/login','Signed in. Your trade access status appears below.');});
$('b2bRegister').addEventListener('submit',e=>{e.preventDefault();void submit(e.currentTarget,'/api/dealer/register','Business registration received. Your application is pending review.');});
$('b2bApply').addEventListener('submit',e=>{e.preventDefault();void submit(e.currentTarget,'/api/dealer/apply','Your business application has been submitted for review.');});
$('wholesaleLogout').addEventListener('click',async()=>{
 $('wholesaleLogout').disabled=true;
 try{await api('/api/logout',{});await refresh();message('Signed out.');}
 catch(error){message(error.message,true);}
 finally{$('wholesaleLogout').disabled=false;}
});
refresh().catch(e=>message(e.message,true));