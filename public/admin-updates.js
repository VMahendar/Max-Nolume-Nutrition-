import {api} from './commerce-api.js';
import {updateCard} from './store-updates.js';
const form=document.getElementById('updateForm'),message=document.getElementById('updateMessage'),list=document.getElementById('updateList'),preview=document.getElementById('updatePreview');
let config,selected='';
const field=name=>form.elements.namedItem(name);
const local=iso=>iso?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso)).replace(' ','T'):'';
function values(){const b=Object.fromEntries(new FormData(form));return {id:selected||'update-'+crypto.randomUUID(),title:b.title,body:b.body,kind:b.kind,surface:b.surface,image:b.image,imageAlt:b.imageAlt,startsAt:b.startsAt?b.startsAt+':00+05:30':'',endsAt:b.endsAt?b.endsAt+':00+05:30':'',enabled:field('enabled').checked};}
function showPreview(){preview.replaceChildren(updateCard(values()));}
function edit(post){selected=post?.id||'';form.reset();for(const key of ['title','body','kind','surface','image','imageAlt'])if(post?.[key])field(key).value=post[key];field('enabled').checked=post?.enabled===true;field('startsAt').value=local(post?.startsAt||new Date().toISOString());field('endsAt').value=local(post?.endsAt||new Date(Date.now()+7*86400000).toISOString());showPreview();}
async function load(){config=await api('/api/admin/store-updates');document.getElementById('updateWhatsappStatus').textContent=config.whatsapp.message;
 list.replaceChildren(...config.posts.map(post=>{const row=document.createElement('div'),editButton=document.createElement('button'),remove=document.createElement('button');editButton.type=remove.type='button';editButton.textContent=post.title+' · '+(post.enabled?'Scheduled / published':'Draft');editButton.onclick=()=>edit(post);remove.textContent='Remove';remove.onclick=async()=>{if(!confirm('Remove this update from the website and app?'))return;try{await api('/api/admin/store-updates',{revision:config.revision,posts:config.posts.filter(p=>p.id!==post.id)});await load();if(selected===post.id)edit();}catch(error){message.textContent=error.message;}};row.append(editButton,remove);return row;}));
}
document.getElementById('newUpdate').onclick=()=>edit();
document.getElementById('reloadUpdates').onclick=()=>void load().then(()=>{message.textContent='Updates refreshed. Your unsaved form is unchanged.';}).catch(e=>message.textContent=e.message);
form.addEventListener('input',showPreview);
form.onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const post=values();if(config.posts.length>=40&&!selected)throw Error('Remove an old update before adding another.');await api('/api/admin/store-updates',{revision:config.revision,posts:[post,...config.posts.filter(p=>p.id!==post.id)]});selected=post.id;await load();message.textContent=post.enabled?'Saved. This update appears during its dates on the selected website/app screens.':'Draft saved. Customers cannot see it.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};
document.getElementById('updatePhoto').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Choose a JPG, PNG or WebP photo up to 10 MB.');
  form.querySelector('[type=submit]').disabled=true;message.textContent='Preparing your photo…';const bitmap=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const data=await api('/api/admin/store-update-image',{jpeg:canvas.toDataURL('image/jpeg',0.8)});field('image').value=data.path;showPreview();message.textContent='Photo uploaded. Describe it below and save the update when ready.';
 }catch(error){message.textContent=error.message;}finally{event.target.value='';form.querySelector('[type=submit]').disabled=false;}
};
load().then(()=>edit()).catch(()=>{form.hidden=true;message.textContent='Sign in as an administrator to publish store updates.';});
