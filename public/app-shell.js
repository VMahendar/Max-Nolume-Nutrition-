const screens=['shop','offers','brands','certificate'];
function showAppScreen(){
 const requested=location.hash.slice(1),active=screens.includes(requested)?requested:'shop';
 for(const id of screens){const el=document.getElementById(id);el.hidden=id!==active;el.classList.toggle('app-screen-hidden',id!==active);}
 const welcome=document.querySelector('.app-welcome');if(welcome)welcome.hidden=active!=='shop';
 const recent=document.getElementById('recentSection');if(recent)recent.classList.toggle('app-screen-hidden',active!=='shop');
 document.querySelectorAll('.app-bottom-nav a').forEach(link=>{const selected=link.hash==='#'+active;link.classList.toggle('selected',selected);if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
 scrollTo({top:0,behavior:'instant'});
}
addEventListener('hashchange',showAppScreen);showAppScreen();
