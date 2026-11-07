if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => {});
let installPrompt;
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const actions = [...document.querySelectorAll('[data-install-app]')];
const helpActions=[...document.querySelectorAll('[data-install-help]')];
const dialog=document.getElementById('installDialog');
const hideInstall=()=>actions.forEach(action=>action.hidden=true);
hideInstall();
async function startInstall(){
 if(!installPrompt){dialog?.showModal();return;}
 await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;hideInstall();
}
for(const action of actions)action.addEventListener('click',startInstall);
for(const action of helpActions)action.addEventListener('click',startInstall);
dialog?.querySelector('[data-close-install]')?.addEventListener('click',()=>dialog.close());
window.addEventListener('beforeinstallprompt',event=>{
 if(!actions.length||installed())return;event.preventDefault();installPrompt=event;actions.forEach(action=>action.hidden=false);
});
window.addEventListener('appinstalled',()=>{hideInstall();dialog?.close();});
if(typeof location!=='undefined'&&installed()&&['/','/index.html'].includes(location.pathname))location.replace('/mobile-app.html');
