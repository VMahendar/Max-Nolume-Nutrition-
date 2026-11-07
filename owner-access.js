import {api} from './commerce-api.js';
const $=id=>document.getElementById(id),form=$('ownerLoginForm'),message=$('ownerAccessMessage');
function showAccess(user){
 const owner=user?.role==='admin';document.body.classList.toggle('owner-signed-out',!owner);document.body.classList.remove('owner-auth-loading');$('ownerAccess').hidden=owner;$('ownerSignOut').hidden=!owner;
 if(owner)return;
 document.title='Owner sign-in | Max Volume Nutrition';form.hidden=!!user;$('ownerSwitchAccount').hidden=!user;message.textContent=user?'This account does not have store management access.':'';
}
async function check(){try{const {user}=await api('/api/session');showAccess(user);}catch{showAccess(null);message.textContent='Unable to connect. Please try signing in again.';}}
form.onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;message.textContent='';try{await api('/api/login',Object.fromEntries(new FormData(form)));const {user}=await api('/api/session');if(user?.role==='admin')location.reload();else showAccess(user);}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};
async function signOut(){try{await api('/api/logout',{});location.reload();}catch(error){message.textContent=error.message;}}
$('ownerSignOut').onclick=signOut;$('ownerSwitchAccount').onclick=signOut;
void check();
