const previewBadge=document.querySelector('.owner-preview-status');if(previewBadge)document.querySelector('.admin-topbar nav').prepend(previewBadge);
const $=id=>document.getElementById(id);
const screens={
 'my-work':['My Work','Your store change requests, all in one place.'],
 'daily-desk':['Overview','Your store at a glance.'],
 sales:['Sales','Record completed shop and WhatsApp sales.'],purchases:['Purchases','Receive goods and keep your supplier bill records together.'],
 inventory:['Stock','Check quantities, reservations and available packs.'],orders:['Online orders','Review checkouts, payment status and delivery.'],products:['Products','Add products, pack photos and clear customer prices.'],
 marketing:['Customers','Follow up with customers who asked to hear from you.'],dealers:['Dealers & enquiries','Review dealer applications, all website enquiries and the next follow-up.'],
 'store-updates':['Store announcements','Create a launch, stock update or ad for your website and app.'],campaigns:['Offers','Set retail discount codes, dates and savings limits.'],reviews:['Reviews','Review customer feedback before publishing it.'],automation:['WhatsApp automation','Check your connection and message schedule.'],settings:['Store settings','Manage delivery details and tax configuration.'],activity:['Activity log','See changes made to your store.']
};
function menu(open){document.body.classList.toggle('admin-menu-open',open);$('adminSidebarShade').hidden=!open;$('adminMenuToggle').setAttribute('aria-expanded',String(open));}
$('adminMenuToggle').onclick=()=>menu(!document.body.classList.contains('admin-menu-open'));
$('adminSidebarShade').onclick=()=>menu(false);document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false);});
function navigate(){
 let route=location.hash.slice(1)||'daily-desk';if(route==='manual-entry')route='purchases';if(!screens[route])route='daily-desk';
 const target=['sales','purchases'].includes(route)?'manual-entry':route;
 document.querySelectorAll('[data-admin-screen]').forEach(el=>{el.hidden=el.id!==target;});
 const [title,description]=screens[route];$('adminScreenTitle').textContent=title;$('adminScreenSubtitle').textContent=description;$('adminBreadcrumb').textContent=title;document.title=title+' | MVN Owner';
 document.querySelectorAll('[data-admin-nav]').forEach(a=>{const selected=a.hash==='#'+route;a.classList.toggle('selected',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 if(target==='manual-entry'){
  const sale=route==='sales',field=$('ownerEntryForm').elements.kind;const changed=field.value!==(sale?'sale':'purchase');field.value=sale?'sale':'purchase';field.closest('label').hidden=true;
  $('ownerEntryHeading').textContent=sale?'Record a sale':'Receive stock';$('ownerPriceLabel').textContent=sale?'Actual selling price per unit (₹)':'Purchase cost per unit (₹)';$('ownerContactLabel').textContent=sale?'Customer name':'Supplier name';$('ownerReferenceLabel').textContent=sale?'Your manual order reference':'Supplier bill reference';
  if(changed)field.dispatchEvent(new Event('input',{bubbles:true}));
 }
 menu(false);window.scrollTo({top:0,behavior:'instant'});
}
addEventListener('hashchange',()=>{navigate();$('adminScreenTitle').focus({preventScroll:true});});navigate();
$('adminToday').textContent=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());
function attention(label,detail,count,href){const a=document.createElement('a'),number=document.createElement('span'),copy=document.createElement('div'),title=document.createElement('b'),sub=document.createElement('small'),arrow=document.createElement('span');a.href=href;number.textContent=count;title.textContent=label;sub.textContent=detail;arrow.textContent='→';copy.append(title,sub);a.append(number,copy,arrow);return a;}
const actions={'owner-work.save':'Owner change request saved','product.save':'Product details updated','inventory.adjust':'Stock count updated','owner.purchase':'Stock received','owner.sale':'Manual sale recorded','store-updates.save':'Store announcements saved','store-update.draft':'WhatsApp draft received','campaigns.save':'Retail offers updated','dealer.approved':'Dealer application approved','dealer.rejected':'Dealer access updated','marketing.automation.configure':'Message schedule updated','payment.captured':'Online payment verified'};
document.addEventListener('admin-overview',event=>{
 const data=event.detail,variants=data.products.flatMap(p=>p.variants),low=variants.filter(v=>Number.isSafeInteger(v.stock)&&v.stock<=3),unknown=variants.filter(v=>!Number.isSafeInteger(v.stock)),orders=data.orders.filter(o=>!['failed','expired','cancelled'].includes(o.status)&&o.fulfilment!=='delivered'),dealers=data.dealers.filter(d=>d.status==='pending');
 $('statProducts').textContent=data.products.length;$('statPacks').textContent=variants.length+' product packs';$('statLowStock').textContent=low.length;$('statUnconfirmed').textContent=unknown.length?unknown.length+' packs need a stock count':'Packs with 3 or fewer available';$('statOrders').textContent=orders.length;$('statDealers').textContent=dealers.length;
 $('adminAttention').replaceChildren(attention('Check your stock',unknown.length?'Confirm starting quantities before recording stock':'Review packs running low',unknown.length||low.length,'#inventory'),attention('Dealer applications','Approve or review business access',dealers.length,'#dealers'),attention('Orders to review','Check payment and fulfilment status',orders.length,'#orders'));
 $('overviewActivity').replaceChildren(...data.audit.slice(0,4).map(entry=>{const row=document.createElement('div'),dot=document.createElement('span'),copy=document.createElement('div'),title=document.createElement('b'),time=document.createElement('small');dot.className='admin-activity-dot';title.textContent=actions[entry.action]||'Store record updated';time.textContent=new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(entry.created));copy.append(title,time);row.append(dot,copy);return row;}));if(!data.audit.length)$('overviewActivity').textContent='Your store changes will appear here.';
});
