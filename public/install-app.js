if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('/sw.js').catch(() => {});
let installPrompt;
let hasInstalledApp = false;
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
function markInstalled(){
 hasInstalledApp=true;
 installPrompt=null;
 hideInstall();
 for(const action of helpActions)action.textContent='Open MVN app';
}
for(const action of helpActions)action.addEventListener('click',()=>{
 if(hasInstalledApp){
  window.open('/mobile-app.html','_blank','noopener');
  return;
 }
 return startInstall();
});
if(helpActions.length && typeof navigator.getInstalledRelatedApps==='function'){
 navigator.getInstalledRelatedApps().then(apps=>{
  if(apps.some(app=>app.platform==='webapp'&&app.url&&new URL(app.url,location.origin).href===new URL('/manifest.webmanifest',location.origin).href))markInstalled();
 }).catch(()=>{});
}
dialog?.querySelectorAll('[data-close-install]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
window.addEventListener('beforeinstallprompt',event=>{
 if(!actions.length||installed()||hasInstalledApp)return;event.preventDefault();installPrompt=event;actions.forEach(action=>action.hidden=false);
});
window.addEventListener('appinstalled',()=>{markInstalled();dialog?.close();});
