export const kindLabels={stock:'Fresh stock',launch:'Brand launch',deal:'Limited deal',news:'From MVN'};
export function updateCard(post){
 const card=document.createElement('article');card.className='store-update-card';
 if(post.image){const image=document.createElement('img');image.src='/'+post.image;image.alt=post.imageAlt;image.loading='lazy';card.append(image);}
 const copy=document.createElement('div'),tag=document.createElement('span'),title=document.createElement('h3'),body=document.createElement('p');
 tag.className='campaign-kicker';tag.textContent=kindLabels[post.kind]||'From MVN';title.textContent=post.title;body.textContent=post.body;copy.append(tag,title,body);card.append(copy);return card;
}
if(document.querySelector('[data-store-updates]')){
 let refreshTimer,cached=[];
 function render(){const updates=cached.filter(p=>Date.parse(p.endsAt)>Date.now());for(const feed of document.querySelectorAll('[data-store-updates]')){const posts=updates.filter(p=>!feed.dataset.updateKind||p.kind===feed.dataset.updateKind);feed.replaceChildren(...posts.map(updateCard));feed.hidden=!posts.length;}}
 async function load(){
  render();try{const surface=document.body.classList.contains('app-store')?'app':'web',response=await fetch('/api/store-updates?surface='+surface,{cache:'no-store'});if(!response.ok)return;
   const {updates}=await response.json();
   cached=updates;render();
   clearTimeout(refreshTimer);if(updates.length){const expiry=Math.min(...updates.map(p=>Date.parse(p.endsAt)));refreshTimer=setTimeout(()=>void load(),Math.max(250,Math.min(60000,expiry-Date.now())));}
  }catch{/* Existing shopping and ordering remain available when announcements cannot load. */}
 }
 void load();setInterval(()=>void load(),60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load();});
}
