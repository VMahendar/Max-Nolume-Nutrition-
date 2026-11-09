const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
if(standalone){
 document.body.classList.add('standalone-app');
 document.getElementById('appInstallGate').hidden=true;
 const screens=['shop','offers','brands','certificate'];
 function showAppScreen(){
  const requested=location.hash.slice(1),active=screens.includes(requested)?requested:'shop';
  for(const id of screens){const el=document.getElementById(id);el.hidden=id!==active;el.classList.toggle('app-screen-hidden',id!==active);}
  const welcome=document.querySelector('.app-welcome');if(welcome)welcome.hidden=active!=='shop';
  const recent=document.getElementById('recentSection');if(recent)recent.classList.toggle('app-screen-hidden',active!=='shop');
  document.querySelectorAll('.app-bottom-nav a').forEach(link=>{const selected=link.hash==='#'+active;link.classList.toggle('selected',selected);if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  scrollTo({top:0,behavior:'instant'});
 }
 addEventListener('hashchange',showAppScreen);
 showAppScreen();

 const menu=document.querySelector('.native-app-header .app-menu');
 menu.addEventListener('click',event=>{
  const link=event.target.closest('a');
  if(!link)return;
  menu.open=false;
  if(link.getAttribute('href')===location.hash)showAppScreen();
 });
 document.addEventListener('click',event=>{
  if(!menu.contains(event.target))menu.open=false;
 });
 menu.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!menu.open)return;
  menu.open=false;
  menu.querySelector('summary').focus();
 });

 // Icons complement the existing readable app navigation labels.
 const navigationIcons={shop:'M3 9l9-6 9 6v12H3z M9 21v-8h6v8',offers:'M20 13l-7 7L3 10V3h7z M7 7h.01',brands:'M12 3v18 M3 12h18 M5.6 5.6l12.8 12.8 M18.4 5.6L5.6 18.4',certificate:'M6 3h12v18H6z M9 8h6 M9 12h6 M9 16h3',account:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2'};
 for(const link of document.querySelectorAll('.app-bottom-nav a')){const key=link.hash.slice(1)||'account',svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');path.setAttribute('d',navigationIcons[key]||navigationIcons.account);svg.append(path);const label=document.createElement('span');label.textContent=link.textContent.trim();link.replaceChildren(svg,label);}
}
