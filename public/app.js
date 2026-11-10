/* Max Volume Nutrition — customer storefront and dealer enquiries.
   Prices are customer-facing INR amounts. Wholesale prices must NEVER be embedded in public JS. */
const PHONE="917708830513";
const P=[
{id:"whey",name:"Potency Whey",cat:"whey",size:"5 lbs",featuredIndex:1,variants:[{label:"Chocolate · 5 lbs",price:5500,mrp:8599,img:null},{label:"Coffee · 5 lbs",price:5500,mrp:8599,img:"assets/potency-whey-coffee-5lb.webp"}],desc:"Premium whey protein for daily training and recovery.",img:""},
{id:"mass",name:"Nitro Mass",cat:"mass",featuredIndex:1,variants:[{label:"3 kg · Double Rich Chocolate",price:2599,img:"assets/nitro-mass-3kg-double-rich-chocolate.webp"},{label:"5 kg · Bucket",price:3499,img:"assets/Screenshot_2026_1103_003852.jpg"}],desc:"Mass gainer available in two pack sizes.",img:""},
{id:"pre",name:"Sturdy Pre-Workout",cat:"pre",variants:[{label:"Watermelon · 250 g",price:1399}],desc:"Pre-workout formula for your training routine.",img:""},
{id:"creatine",name:"Pro Creatine",cat:"creatine",featuredIndex:1,variants:[{label:"Blueberry · 250 g",price:899,mrp:1499,img:"https://unicornproseries.com/wp-content/uploads/2026/05/Pro-Creatine-Blueberry-1.png"},{label:"Cranberry · 250 g",price:899,mrp:1499,img:"assets/pro-creatine.png"}],desc:"Creatine supplement in two flavour options.",img:""},
{id:"vitamins",name:"Musclevite Multivitamin",cat:"vitamins",variants:[{label:"Multivitamin · 1 pack",price:699}],desc:"Daily multivitamin supplement.",img:""}
];

/* The eight invoice-verified packs only; current stock remains subject to confirmation. */
const retailVariantIds={whey:['whey-chocolate','whey-coffee'],mass:['mass-3kg','mass-5kg'],pre:['pre-watermelon'],creatine:['creatine-blueberry','creatine-cranberry'],vitamins:['musclevite-pack']};
async function refreshRetailPrices(){
 const response=await fetch('/api/retail/catalog',{cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Current prices are unavailable. Please reconnect and try again.');
 const data=await response.json();
 if(!Array.isArray(data.products)||data.tier!=='retail')throw Error('Current retail prices could not be verified.');
 const mappedIds=new Set(Object.entries(retailVariantIds).filter(([id])=>!id.startsWith('catalog-')).flatMap(([,ids])=>ids));
 for(const product of data.products){
  const packs=(product.variants||[]).filter(v=>Number.isSafeInteger(v.pricePaise)&&v.pricePaise>0);
  if(!packs.length||packs.every(v=>mappedIds.has(v.id)))continue;
  const id='catalog-'+product.id;if(!/^[a-z0-9-]+$/.test(id))continue;
  let item=P.find(p=>p.id===id);if(!item){item={id,name:product.name,brand:product.brand,cat:['whey','mass','pre','creatine','vitamins'].includes(product.category)?product.category:'other',desc:product.description||product.subtitle||'',img:product.image||'',variants:[]};P.push(item);}
  item.name=product.name;item.brand=product.brand;item.desc=product.description||product.subtitle||'';item.img=product.image||'';
  const previous=new Map(item.variants.map((v,i)=>[retailVariantIds[id]?.[i],v]));
  item.variants=packs.map(v=>({...previous.get(v.id),label:v.label,price:v.pricePaise/100,img:v.image||product.image||'',...(Number.isSafeInteger(v.mrpPaise)?{mrp:v.mrpPaise/100}:{})}));retailVariantIds[id]=packs.map(v=>v.id);
 }
 const variants=new Map(data.products.flatMap(p=>p.variants||[]).map(v=>[v.id,v]));
 const updates=P.flatMap(p=>p.variants.map((v,index)=>{const current=variants.get(retailVariantIds[p.id][index]);if(!current||!Number.isSafeInteger(current.pricePaise)||current.pricePaise<=0)throw Error('A selected pack needs price confirmation. Please contact our team.');return {v,current}}));
 for(const {v,current} of updates){v.price=current.pricePaise/100;delete v.mrp;if(Number.isSafeInteger(current.mrpPaise)&&current.mrpPaise>current.pricePaise)v.mrp=current.mrpPaise/100;}
}
const $=id=>document.getElementById(id);
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
let cat="all",q="",cart={},mode="retail";
let priceRange="all",recent=[],appliedOffer=null,availableOffers=[];
const offerSurface=document.body.classList.contains("app-store")?"app":"web";
const cartSignature=()=>JSON.stringify(Object.entries(cart).sort().map(([key,qty])=>[key,qty,getItem(key)?.v.price]));
const categoryNames={all:"ALL PRODUCTS",whey:"WHEY PROTEIN",mass:"MASS GAINERS",pre:"PRE-WORKOUT",creatine:"CREATINE",vitamins:"VITAMINS"};
const priceLabels={all:"All prices",under1000:"Under ₹1,000","1000to3000":"₹1,000 – ₹3,000",over3000:"Over ₹3,000"};
function matchesPrice(v){return priceRange==="all"||(priceRange==="under1000"&&v.price<1000)||(priceRange==="1000to3000"&&v.price>=1000&&v.price<=3000)||(priceRange==="over3000"&&v.price>3000)}
const failedPackPhotos=new Set();
function visiblePackOptions(p){
 return p.variants.map((v,i)=>({v,i})).filter(({i})=>{
  const src=coverImage(p,i);
  return src&&!failedPackPhotos.has(src);
 });
}
function displayVariant(p){
 const options=visiblePackOptions(p),matching=options.filter(({v})=>matchesPrice(v));
 return (matching.find(({i})=>i===(p.featuredIndex||0))??matching[0]??options[0])?.i;
}
function hideFailedPackPhoto(img){
 const src=img.getAttribute('src');
 if(!src||failedPackPhotos.has(src))return;
 failedPackPhotos.add(src);
 render();
 renderPurchasedPacks();
 renderPurchasedPromos();
 renderRecent();
}
try{const saved=JSON.parse(localStorage.getItem("mvn-recent-v1")||"[]");if(Array.isArray(saved))recent=[...new Set(saved.filter(id=>P.some(p=>p.id===id)))].slice(0,4)}catch{}
function renderRecent(){
 const section=$("recentSection");if(!section)return;
 const products=recent.map(id=>P.find(item=>item.id===id)).filter(p=>p&&visiblePackOptions(p).length);
 section.hidden=!products.length;
 $("recentProducts").replaceChildren(...products.map(p=>{
  const id=p.id,index=displayVariant(p),v=p.variants[index],button=document.createElement("button");
  button.type="button";button.className="recent-product";
  const image=coverImage(p,index);
  if(image){const img=document.createElement("img");img.src=image;img.alt="";img.loading="lazy";img.onerror=()=>img.hidden=true;button.append(img)}
  const name=document.createElement("strong");name.textContent=p.name;
  const price=document.createElement("span");price.textContent=v.label+" · "+money(v.price);
  button.append(name,price);button.onclick=()=>showDetail(id);return button;
 }));
}
try{const v=JSON.parse(localStorage.getItem("mvn-cart-v2")||"{}");if(v&&typeof v==="object")cart=v}catch(e){}
function getItem(k){if(!/^[a-z0-9-]+\|[0-9]+$/.test(k))return null;const [id,i]=k.split("|");const p=P.find(x=>x.id===id),v=p&&p.variants[Number(i)];return p&&v?{p,v}:null}
cart=Object.fromEntries(Object.entries(cart).filter(([k,v])=>/^[a-z0-9-]+\|[0-9]+$/.test(k)&&Number.isSafeInteger(v)&&v>0&&v<=999));
function persist(){try{localStorage.setItem("mvn-cart-v2",JSON.stringify(cart))}catch{}drawCart()}
function coverImage(p,i){const v=p.variants[Number(i)];return v&&Object.prototype.hasOwnProperty.call(v,"img")?(v.img||""):(p.img||"")}
function swapPhoto(host,src,name){
 if(!host)return;
 let img=host.querySelector("img"),placeholder=host.querySelector(".placeholder");
 if(!placeholder){placeholder=document.createElement("div");placeholder.className="placeholder";placeholder.textContent="Verified pack photo coming soon";host.appendChild(placeholder)}
 if(!src){if(img)img.hidden=true;placeholder.hidden=false;return}
 if(!img){img=document.createElement("img");img.loading="lazy";img.alt=name;host.insertBefore(img,placeholder)}
 img.onerror=()=>{img.hidden=true;placeholder.hidden=false;hideFailedPackPhoto(img)};
 img.onload=()=>{img.hidden=false;placeholder.hidden=true};
 img.hidden=false;placeholder.hidden=true;img.src=src;
}
function bestRetailOffer(v){
 const subtotal=Math.round(v.price*100);let best=null;
 for(const campaign of availableOffers){if(Date.parse(campaign.endsAt)<=Date.now()||subtotal<campaign.minimumPaise||!/^[A-Z0-9-]{3,30}$/.test(campaign.code))continue;let discount=campaign.type==='percent'?Math.floor(subtotal*campaign.amount/100):campaign.amount;if(campaign.capPaise>0)discount=Math.min(discount,campaign.capPaise);discount=Math.min(discount,subtotal);if(!best||discount>best.discount)best={campaign,discount};}
 return best;
}
function retailOfferMarkup(v){
 const subtotal=Math.round(v.price*100),best=bestRetailOffer(v);
 return best?'<div class="retail-offer-price"><span class="limited-deal-label">LIMITED '+(best.campaign.occasion?.toLowerCase().includes('diwali')?'DIWALI':'RETAIL')+' OFFER</span><strong>'+money((subtotal-best.discount)/100)+'</strong><span>Code '+best.campaign.code+' at checkout</span><span>Valid through '+new Date(Date.parse(best.campaign.endsAt)-1).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short'})+'</span></div>':'';
}
function priceMarkup(v){
 const hasMrp=Number.isSafeInteger(v.mrp)&&v.mrp>v.price;
 const percent=hasMrp?Math.round((v.mrp-v.price)*100/v.mrp):0;
 return '<div class="price-main"><b class="selling-price">'+money(v.price)+'</b>'+
 (hasMrp?'<del class="mrp-value" aria-label="MRP '+money(v.mrp)+'">MRP '+money(v.mrp)+'</del>':'')+
 '</div>'+(hasMrp?'<span class="discount-value">'+percent+'% OFF · SAVE '+money(v.mrp-v.price)+'</span>':'')+
 '<small class="selling-caption">Regular retail price</small>'+retailOfferMarkup(v);
}
function appPriceMarkup(v){
 const offer=bestRetailOffer(v),regular=Math.round(v.price*100);
 if(offer){const end=new Date(Date.parse(offer.campaign.endsAt)-1).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short'});return '<span class="app-price-offer-label">'+safe(offer.campaign.occasion||'Retail offer')+'</span><strong class="price-current price-current--promo">'+money((regular-offer.discount)/100)+'</strong><span class="price-original">Regular <del>'+money(v.price)+'</del></span><span class="price-note">With code '+safe(offer.campaign.code)+' at checkout · through '+safe(end)+'</span>';}
 return '<strong class="price-current">'+money(v.price)+'</strong>'+(Number.isSafeInteger(v.mrp)&&v.mrp>v.price?'<span class="price-original">MRP <del>'+money(v.mrp)+'</del></span>':'')+'<span class="price-note">Regular selling price</span>';
}
function purchasedPack(variantId){for(const p of P){const i=retailVariantIds[p.id]?.indexOf(variantId);if(i!==undefined&&i>=0&&p.variants[i])return {p,i,v:p.variants[i]};}return null;}
function card(p){
const featured=displayVariant(p);const cover=coverImage(p,featured);const pic=cover?'<img loading="lazy" src="'+safe(cover)+'" alt="'+safe(p.name)+'"><div class="placeholder" hidden><b>'+safe(p.name)+'</b>Photo coming soon</div>':'<div class="placeholder"><b>'+safe(p.name)+'</b>Correct pack photo being verified</div>';
return '<article class="card"><div class="photo">'+pic+'</div><div class="info"><small>'+safe(p.brand||'Unicorn Pro Series')+'</small><h3>'+safe(p.name)+'</h3><p>'+safe(p.desc)+'</p><label class="variant-label" for="v-'+p.id+'">FLAVOUR / PACK SIZE</label><select id="v-'+p.id+'" class="variant">'+visiblePackOptions(p).map(({v,i})=>'<option value="'+i+'"'+(i===featured?' selected':'')+'>'+safe(v.label)+'</option>').join("")+'</select><div class="price" id="price-'+p.id+'">'+priceMarkup(p.variants[featured])+'</div><button class="details-link" type="button" data-detail="'+p.id+'">VIEW PRODUCT DETAILS →</button><button class="add" data-id="'+p.id+'">ADD TO CART +</button></div></article>';
}

function installCategoryShortcuts(){
 if(document.getElementById('mvn-quick-categories'))return;
 const shop=$('shop');if(!shop)return;
 const nav=document.createElement('nav');nav.className='mvn-quick-categories';nav.id='mvn-quick-categories';
 nav.setAttribute('aria-label','Browse by supplement category');
 nav.innerHTML='<div class="mvn-quick-caption"><strong>SHOP BY CATEGORY</strong><span>Find your supplements fast</span></div><div class="mvn-quick-track">'+[
 ['all','All'],['whey','Whey'],['mass','Mass Gainers'],['creatine','Creatine'],['pre','Pre-workout'],['vitamins','Vitamins']
 ].map(([id,label])=>'<button type="button" data-cat="'+id+'">'+label+'</button>').join('')+'</div>';
 shop.before(nav);
 nav.querySelectorAll('[data-cat]').forEach(button=>button.onclick=()=>setCat(button.dataset.cat));
}

/* Render every invoice-listed variant as an independent, priced pack tile above
   the traditional variant selectors. Both use the same cart key and live API price. */
function renderPurchasedPacks(){
 if(!document.body.classList.contains('app-store'))return;
 let section=$('mvn-purchased-packs');
 if(!section){
  section=document.createElement('section');section.id='mvn-purchased-packs';
  section.className='mvn-purchased-section';
  section.innerHTML='<div class="mvn-purchased-heading"><div><span class="mvn-label">MAX VOLUME NUTRITION · UNICORN PRO SERIES</span><h2>SHOP YOUR EXACT PACK.</h2><p>Browse individual packs with matching photos. Stock is confirmed before fulfilment.</p></div><a href="tel:+917708830513" aria-label="Call Max Volume Nutrition">CALL OUR TEAM ↗</a></div><div id="mvn-purchased-grid" class="mvn-purchased-grid"></div>';
  const title=$('shop').querySelector('.section-title');
  if(title)title.after(section);else $('shop').prepend(section);
 }
 const layout=$('shop').querySelector('.shopping-layout');
 layout.after(section);
 section.querySelector('h2').textContent='Shop supplements';
 section.querySelector('.mvn-purchased-heading p').textContent='Choose your pack and flavour.';
 const all=P.flatMap(p=>p.variants.map((v,i)=>({p,v,i})));
 const filtered=all.filter(({p,v})=>(cat==='all'||p.cat===cat)&&matchesPrice(v)&&(p.name+' '+v.label).toLowerCase().includes(q.toLowerCase()));
 const sort=$('sort')?.value||'default';
 if(sort==='low')filtered.sort((a,b)=>a.v.price-b.v.price);
 else if(sort==='high')filtered.sort((a,b)=>b.v.price-a.v.price);
 else if(sort==='name')filtered.sort((a,b)=>(a.p.name+' '+a.v.label).localeCompare(b.p.name+' '+b.v.label));
 const cards=filtered.map(({p,v,i})=>{
  const image=coverImage(p,i),src=failedPackPhotos.has(image)?'':image,label=p.name+' · '+v.label;
  const photo=src?'<img src="'+safe(src)+'" alt="'+safe(label)+' verified variant photograph" loading="lazy"><div class="mvn-hd-placeholder" hidden><strong>'+safe(p.name)+'</strong><span>Correct high-resolution pack photo requested</span></div>':'<div class="mvn-hd-placeholder"><span>UNICORN PRO SERIES</span><strong>'+safe(p.name)+'</strong><em>'+safe(v.label)+'</em><small>1080 × 1080 product photo pending</small></div>';
  const text='Hello Max Volume Nutrition, please confirm the exact pack, current stock and delivery for '+label+'.';
  return {cat:p.cat,markup:'<article class="mvn-purchased-card product-card" data-purchase-pack="'+safe(retailVariantIds[p.id]?.[i]||'')+'"><div class="mvn-purchased-photo">'+photo+'</div><div class="mvn-purchased-details"><span class="mvn-purchased-brand product-series">UNICORN PRO SERIES</span><h3 class="product-name">'+safe(p.name)+'</h3><p class="product-variant">'+safe(v.label)+'</p><div class="mvn-purchased-price product-prices">'+appPriceMarkup(v)+'</div><div class="mvn-purchased-actions product-actions"><button type="button" class="product-button product-button--cart" data-pack-add="'+safe(p.id)+'" data-index="'+i+'" data-add="'+safe(retailVariantIds[p.id]?.[i]||'')+'" aria-label="Add '+safe(label)+' to cart">Add to Cart</button><button type="button" class="mvn-detail-btn product-button product-button--details" data-pack-details="'+safe(p.id)+'" data-index="'+i+'" data-details="'+safe(retailVariantIds[p.id]?.[i]||'')+'" aria-label="Details for '+safe(label)+'">Details</button></div><div class="mvn-purchased-secondary"><a href="https://wa.me/'+PHONE+'?text='+encodeURIComponent(text)+'" rel="noopener noreferrer" target="_blank" aria-label="Ask on WhatsApp about '+safe(label)+'">WhatsApp enquiry ↗</a><a href="tel:+917708830513" aria-label="Call about '+safe(label)+'">Call ↗</a></div></div></article>';
 });
 const html=cat==='all'
  ? Array.from(new Set(['whey','mass','creatine','pre','vitamins',...cards.map(item=>item.cat)]))
   .map(group=>{
    const grouped=cards.filter(item=>item.cat===group);
    if(!grouped.length)return '';
    const titles={whey:'Whey Protein',mass:'Mass Gainers',creatine:'Creatine',pre:'Pre-Workout',vitamins:'Vitamins'};
    const title=titles[group]||'More Supplements';
    const note=group==='mass'?'Nitro Mass 3 kg and 5 kg — choose each pack separately.':group==='whey'?'Choose your whey flavour and exact pack.':'Browse the available packs below.';
    return '<section class="mvn-product-group" data-group="'+safe(group)+'" aria-label="'+safe(title)+'"><header class="mvn-product-group-heading"><span>UNICORN PRO SERIES</span><h2>'+safe(title)+'</h2><p>'+safe(note)+'</p></header><div class="mvn-product-group-grid">'+grouped.map(item=>item.markup).join('')+'</div></section>';
   }).join('')
  : cards.map(item=>item.markup).join('');
 section.querySelector('#mvn-purchased-grid').innerHTML=html||'<p class="mvn-empty-packs">No purchased variants match this filter.</p>';
 document.body.classList.toggle('app-catalog-ready',all.length>0);
 section.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const pack=purchasedPack(b.dataset.add);if(!pack)return;const key=pack.p.id+'|'+pack.i;cart[key]=Math.min(999,(cart[key]||0)+1);persist();openBag()});
 section.querySelectorAll('[data-details]').forEach(b=>b.onclick=()=>{const pack=purchasedPack(b.dataset.details);if(pack)showDetail(pack.p.id,pack.i)});
 section.querySelectorAll('.mvn-purchased-photo img').forEach(img=>img.addEventListener('error',()=>hideFailedPackPhoto(img)));
}
function renderPurchasedPromos(){
 const section=$('mvn-purchased-packs')||$('shop');
 const heading=section?.querySelector('.mvn-purchased-heading, .section-title');
 if(!heading)return;
 let host=section.querySelector('.mvn-purchased-promo');
 if(!availableOffers.length){if(host)host.remove();return;}
 if(!host){host=document.createElement('div');host.className='mvn-purchased-promo';heading.after(host)}
 host.innerHTML=availableOffers.filter(c=>Date.parse(c.endsAt)>Date.now()&&Date.parse(c.startsAt)<=Date.now()).map(c=>'<div class="mvn-promo-item"><span>'+safe(c.occasion||'RETAIL OFFER')+'</span><strong>'+safe(c.code)+'</strong><small>'+safe(c.description)+' · One code per cart · Apply at checkout</small><button type="button" data-promo-code="'+safe(c.code)+'">USE OFFER ↗</button></div>').join('');
 host.querySelectorAll('[data-promo-code]').forEach(b=>b.onclick=()=>{openBag();appliedOffer=null;$('offerCode').value=b.dataset.promoCode;drawCart();$('offerMessage').textContent='Apply the offer code to check your cart discount.';$('offerCode').focus()});
}

// The app feature uses the same pack indexes, pricing and cart as the catalogue.
const appFeaturePacks=['whey-coffee','mass-3kg','mass-5kg','creatine-cranberry'];
let appFeatureSelection=appFeaturePacks[0];
function renderAppProduct(){
 const stage=$("appProductStage");
 if(!stage)return;
 if(document.body.classList.contains('catalogue-app')){stage.hidden=true;return;}
 const packs=P.flatMap(p=>visiblePackOptions(p).map(({v,i})=>({p,v,i,key:retailVariantIds[p.id]?.[i]})))
  .filter(({key})=>appFeaturePacks.includes(key))
  .sort((a,b)=>appFeaturePacks.indexOf(a.key)-appFeaturePacks.indexOf(b.key));
 const selected=packs.find(({key})=>key===appFeatureSelection)??packs[0];
 stage.hidden=!selected||cat!=="all"||!!q.trim()||priceRange!=="all";
 if(stage.hidden)return;
 const {p,v,i,key}=selected;
 stage.innerHTML=`
  <div class="app-product-art" data-family="${safe(p.cat)}">
   <span class="app-product-edition">UNICORN PRO SERIES</span>
   <span class="app-product-type" aria-hidden="true">${safe(p.cat==="mass"?"MASS":p.cat==="creatine"?"CREATINE":"WHEY")}</span>
   <img src="${safe(coverImage(p,i))}" alt="${safe(p.name+" "+v.label)}" fetchpriority="high">
  </div>
  <div class="app-product-summary">
   <p class="app-product-kicker">FEATURED COLLECTION</p>
   <h1>${safe(p.name)}</h1>
   <p class="app-product-pack">${safe(v.label)}</p>
   <div class="app-product-price">${priceMarkup(v)}</div>
   <div class="app-product-picker" role="group" aria-label="Choose a featured pack">
    ${packs.map(item=>`<button type="button" data-feature-pack="${safe(item.key)}" aria-pressed="${item.key===key}"><img src="${safe(coverImage(item.p,item.i))}" alt=""><span>${safe(item.p.name)}<small>${safe(item.v.label)}</small></span></button>`).join("")}
   </div>
   <div class="app-product-actions">
    <button class="app-product-add" type="button">Add to cart <span>${money(v.price)}</span></button>
    <button class="app-product-details" type="button">View product details</button>
   </div>
  </div>`;
 stage.querySelector(".app-product-art img").addEventListener("error",e=>hideFailedPackPhoto(e.currentTarget));
 stage.querySelectorAll("[data-feature-pack]").forEach(button=>button.onclick=()=>{
  appFeatureSelection=button.dataset.featurePack;
  renderAppProduct();
  stage.querySelector('[aria-pressed="true"]')?.focus();
 });
 stage.querySelector(".app-product-add").onclick=()=>{
  const cartKey=p.id+"|"+i;
  cart[cartKey]=Math.min(999,(cart[cartKey]||0)+1);
  persist();
  openBag();
 };
 stage.querySelector(".app-product-details").onclick=()=>showDetail(p.id,i);
}


/* Distinct product-first website landing; mobile app retains its own layout. */
let spotlightProduct='whey',spotlightVariant=null,spotlightQty=1;
function renderSpotlight(){
 const section=$('mvnSpotlight');if(!section)return;
 const items=['whey','mass','creatine'].map(id=>P.find(p=>p.id===id)).filter(p=>p&&visiblePackOptions(p).length);
 if(!items.length){section.hidden=true;return}
 section.hidden=false;
 const p=items.find(p=>p.id===spotlightProduct)||items[0];spotlightProduct=p.id;
 const options=visiblePackOptions(p);
 if(!options.some(item=>item.i===spotlightVariant))spotlightVariant=displayVariant(p);
 const item=options.find(item=>item.i===spotlightVariant)||options[0];
 if(!item)return;
 const v=item.v,img=$('mvnSpotlightImage'),src=coverImage(p,item.i);
 if(img.getAttribute('src')!==src)img.src=src;
 img.alt=p.name+' '+v.label;
 img.onerror=()=>hideFailedPackPhoto(img);
 $('mvnSpotlightTitle').textContent=p.name;
 $('mvnSpotlightDescription').textContent=p.desc||'Choose your correct pack and order through WhatsApp.';
 $('mvnSpotlightPrice').innerHTML=priceMarkup(v);
 $('mvnSpotlightQty').textContent=spotlightQty;
 $('mvnSpotlightAdd').textContent='ADD TO CART · '+money(v.price*spotlightQty);
 $('mvnSpotlightTabs').innerHTML=items.map(product=>{
  const i=displayVariant(product),photo=coverImage(product,i);
  return '<button type="button" data-mvn-product="'+safe(product.id)+'" aria-pressed="'+String(product.id===p.id)+'">'+
    (photo?'<img src="'+safe(photo)+'" alt="" loading="lazy">':'')+'<span>'+safe(product.name)+'</span></button>';
 }).join('');
 $('mvnSpotlightTabs').querySelectorAll('[data-mvn-product]').forEach(button=>button.onclick=()=>{spotlightProduct=button.dataset.mvnProduct;spotlightVariant=null;spotlightQty=1;renderSpotlight()});
 $('mvnSpotlightVariants').innerHTML=options.map(({v,i})=>'<button type="button" data-mvn-variant="'+i+'" aria-pressed="'+String(i===item.i)+'"><span>'+safe(v.label)+'</span><b>'+money(v.price)+'</b></button>').join('');
 $('mvnSpotlightVariants').querySelectorAll('[data-mvn-variant]').forEach(button=>button.onclick=()=>{spotlightVariant=Number(button.dataset.mvnVariant);spotlightQty=1;renderSpotlight()});
 $('mvnSpotlightMinus').onclick=()=>{spotlightQty=Math.max(1,spotlightQty-1);renderSpotlight()};
 $('mvnSpotlightPlus').onclick=()=>{spotlightQty=Math.min(99,spotlightQty+1);renderSpotlight()};
 $('mvnSpotlightAdd').onclick=()=>{const key=p.id+'|'+item.i;cart[key]=Math.min(999,(cart[key]||0)+spotlightQty);persist();openBag()};
 $('mvnSpotlightDetails').onclick=()=>showDetail(p.id,item.i);
}

function render(){
 renderSpotlight();
 renderPurchasedPacks();
 renderAppProduct();
// The website uses this product-family grid. The app displays the individual packs.
const items=P.filter(p=>(cat==="all"||p.cat===cat)&&visiblePackOptions(p).some(({v})=>matchesPrice(v))&&((p.name+" "+(p.brand||"")+" "+visiblePackOptions(p).map(({v})=>v.label).join(" ")).toLowerCase().includes(q.toLowerCase())));
if($("sort").value==="default")items.sort((a,b)=>Number(Boolean(coverImage(b,b.featuredIndex||0)))-Number(Boolean(coverImage(a,a.featuredIndex||0))));
if($("sort").value==="name")items.sort((a,b)=>a.name.localeCompare(b.name));
if($("sort").value==="low")items.sort((a,b)=>a.variants[displayVariant(a)].price-b.variants[displayVariant(b)].price);
if($("sort").value==="high")items.sort((a,b)=>b.variants[displayVariant(b)].price-a.variants[displayVariant(a)].price);
$("grid").innerHTML=items.length?items.map(card).join(""):'<div class="no-products"><h3>No matching products</h3><p>Try clearing your search and filters.</p><button type="button" id="emptyReset">View all products</button></div>';
if($("emptyReset"))$("emptyReset").onclick=resetFilters;
if($("collectionTitle"))$("collectionTitle").textContent=categoryNames[cat];
document.querySelectorAll("[data-cat]").forEach(button=>{const active=button.dataset.cat===cat;button.classList.toggle("active",active);if(button.tagName==="BUTTON")button.setAttribute("aria-pressed",String(active));});
const filters=$("activeFilters");if(filters){filters.replaceChildren();for(const [label,clear] of [[q?"Search: "+q:"",()=>{q="";$("q").value="";}],[priceRange!=="all"?priceLabels[priceRange]:"",()=>{priceRange="all";$("priceRange").value="all";}]]){if(!label)continue;const button=document.createElement("button");button.type="button";button.textContent=label+" ×";button.setAttribute("aria-label","Clear "+label);button.onclick=()=>{clear();render()};filters.append(button)}filters.hidden=!filters.childElementCount;}
 document.querySelectorAll(".photo img").forEach(img=>img.addEventListener("error",()=>hideFailedPackPhoto(img)));
$("resultText").textContent=items.length+" product range"+(items.length===1?"":"s")+" · choose pack and flavour";
document.querySelectorAll(".variant").forEach(s=>s.addEventListener("change",()=>{const p=P.find(x=>x.id===s.id.slice(2));$("price-"+p.id).innerHTML=priceMarkup(p.variants[Number(s.value)]);swapPhoto(s.closest(".card").querySelector(".photo"),coverImage(p,s.value),p.name)}));
document.querySelectorAll(".details-link").forEach(b=>b.addEventListener("click",()=>showDetail(b.dataset.detail)));
document.querySelectorAll(".add").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.id+"|"+$("v-"+b.dataset.id).value;cart[k]=Math.min(999,(cart[k]||0)+1);persist();openBag()}));
}
function setCat(c){if(!Object.hasOwn(categoryNames,c))return;cat=c;document.querySelectorAll(".cats [data-cat],.mvn-quick-track [data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===c));render();$("shop").scrollIntoView({behavior:"smooth"})}
function totals(){let n=0,subtotal=0;for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;const quantity=Math.min(999,Math.max(0,Number(qty)||0));n+=quantity;subtotal+=item.v.price*quantity;}const discount=appliedOffer?.signature===cartSignature()&&appliedOffer.campaign.code===$("offerCode").value.trim().toUpperCase()&&Date.parse(appliedOffer.campaign.endsAt)>Date.now()?appliedOffer.discountPaise/100:0;return{n,subtotal,discount,total:subtotal-discount}}
function drawCart(){
const {n,subtotal,discount,total}=totals();$("count").textContent=n;if($("floatingCount"))$("floatingCount").textContent=n;if($("floatingCart"))$("floatingCart").hidden=!n;
let html=n?"":'<p class="empty-cart">Your cart is empty. Choose your supplements to get started.</p>';
for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;html+='<div class="row"><b>'+safe(item.p.name)+'</b><small>'+safe(item.v.label)+' · '+money(item.v.price)+'</small><div class="qty"><button data-minus="'+k+'" aria-label="Decrease quantity">−</button><span>'+qty+'</span><button data-plus="'+k+'" aria-label="Increase quantity">+</button><strong>'+money(item.v.price*qty)+'</strong></div></div>'}
$("items").innerHTML=html;
$("cart-totals").innerHTML=n?'<div><span>Subtotal</span><b>'+money(subtotal)+'</b></div>'+(discount?'<div><span>Offer savings</span><b>−'+money(discount)+'</b></div><div><span>Products total</span><b>'+money(total)+'</b></div>':''):"";
$("send").disabled=!n;
document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{const k=b.dataset.minus;cart[k]-=1;if(cart[k]<=0)delete cart[k];persist()});
document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{const k=b.dataset.plus;cart[k]=Math.min(999,cart[k]+1);persist()});
}
let bagOpener=null;
function openBag(){bagOpener=document.activeElement;for(const el of document.body.children){if(!["drawer","shade"].includes(el.id)&&!['SCRIPT','SVG'].includes(el.tagName)){el.dataset.bagInert=String(el.inert);el.inert=true;}}$("shade").hidden=false;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");document.body.classList.add("cart-open");$("close").focus()}
function closeBag(){$("shade").hidden=true;$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");document.body.classList.remove("cart-open");document.querySelectorAll("[data-bag-inert]").forEach(el=>{el.inert=el.dataset.bagInert==="true";delete el.dataset.bagInert});(bagOpener?.isConnected?bagOpener:$("bag")).focus()}
let retailLeadKey=crypto.randomUUID();
async function retailEnquiry(){
let entries=Object.entries(cart).filter(([k])=>getItem(k));if(!entries.length)return;
const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim();
const address=$("customerAddress").value.trim(),city=$("customerCity").value.trim(),state=$("customerState").value.trim(),pincode=$("customerPincode").value.trim(),payment=$("paymentPreference").value;
for(const id of ['customerName','customerAddress','customerCity','customerState'])$(id).setCustomValidity($(id).value.trim()?'':'Please complete this field.');
if(!$("checkoutFields").reportValidity()||!name||!/^[0-9]{10}$/.test(phone)||!address||!city||!state||!/^[1-9][0-9]{5}$/.test(pincode))return;
const message=$("priceMessage");const previous=totals().total;$("send").disabled=true;message.textContent="Checking current prices…";
try{await refreshRetailPrices();if($("offerCode").value.trim())await quoteOffer();drawCart();renderRecent();document.querySelectorAll('.variant').forEach(select=>{const p=P.find(item=>item.id===select.id.slice(2));$("price-"+p.id).innerHTML=priceMarkup(p.variants[Number(select.value)])});}catch(error){message.textContent=error.message;$("send").disabled=false;return;}
if(totals().total!==previous){message.textContent="Prices have been updated. Please review your cart total and confirm again.";$("send").disabled=false;return;}
message.textContent="";
entries=Object.entries(cart).filter(([k])=>getItem(k));if(!entries.length)return;
const lines=entries.map(([k,n])=>{const {p,v}=getItem(k);return p.name+" — "+v.label+" × "+n+" = "+money(n*v.price)});
const {subtotal,discount,total}=totals();
const offerText=discount?"\nOffer code: "+appliedOffer.campaign.code+"\nOffer savings: "+money(discount)+"\nProducts total after offer: "+money(total):"";
const msg="Hello Max Volume Nutrition, I would like to confirm my order request via WhatsApp:\n\nSelected products:\n"+lines.join("\n")+"\n\nProducts total: "+money(subtotal)+offerText+"\n\nCustomer name: "+name+"\nMobile number: "+phone+"\n\nDelivery address: "+address+"\nCity: "+city+"\nState: "+state+"\nPIN code: "+pincode+"\nPayment preference: "+payment+"\n\nPlease confirm stock, delivery availability, shipping charges and final payable total. Share the payment instructions or payment link on WhatsApp. This message is an order request; payment and shipment are confirmed separately by your team.";
let whatsappMessage=msg;
 try{
  const items=entries.map(([k,quantity])=>{const [id,index]=k.split('|');return {variantId:retailVariantIds[id][Number(index)],quantity};});
  const response=await fetch('/api/enquiries',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestKey:retailLeadKey,kind:'retail',name,phone,address,city,state,pincode,paymentPreference:payment,items,offerCode:$("offerCode").value.trim(),acknowledgeStorage:$("leadConsent").checked}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok||!result.recorded)throw Error(result.error||'Enquiry not saved');
  whatsappMessage+='\n\nEnquiry reference: '+result.id;
  message.textContent='Your enquiry was recorded as '+result.id+'. WhatsApp will now open. Press Send to contact our team.';
 }catch(error){
  message.textContent='Your enquiry was NOT saved on the website. Please press Send in WhatsApp to contact us directly.';
 }
 $("send").disabled=false;
 window.location.assign("https://wa.me/"+PHONE+"?text="+encodeURIComponent(whatsappMessage));
}
async function quoteOffer(){
 const code=$("offerCode").value.trim();
 const requestItems=Object.entries(cart).filter(([key])=>getItem(key)).map(([key,quantity])=>{const [id,index]=key.split('|');return {variantId:retailVariantIds[id][Number(index)],quantity}});
 const signature=cartSignature();
 const response=await fetch('/api/promotion-quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,items:requestItems,surface:offerSurface}),signal:AbortSignal.timeout(8000)});
 const data=await response.json();
 if(!response.ok){appliedOffer=null;drawCart();throw Error(data.error||'This offer is unavailable.');}
 if(signature!==cartSignature())throw Error('Your cart changed. Apply the code again.');
 if(!Number.isSafeInteger(data.discountPaise)||data.discountPaise<0||data.discountPaise>Math.round(totals().subtotal*100))throw Error('Offer could not be verified.');
 appliedOffer={...data,signature};$("offerMessage").textContent='Applied '+data.campaign.code+' · Save '+money(data.discountPaise/100);$("removeOffer").hidden=false;
}
$("offerCode").oninput=()=>{appliedOffer=null;$("offerMessage").textContent="";$("removeOffer").hidden=true;drawCart()};
$("applyOffer").onclick=async()=>{const button=$("applyOffer");button.disabled=true;try{await refreshRetailPrices();await quoteOffer();drawCart()}catch(error){$("offerMessage").textContent=error.message}finally{button.disabled=false}};
$("removeOffer").onclick=()=>{appliedOffer=null;$("offerCode").value='';$("offerMessage").textContent='';$("removeOffer").hidden=true;drawCart()};
let offerExpiryTimer;
const defaultOfferMarkup=$("offerCards").innerHTML;
async function loadOffers(){
 try{const response=await fetch('/api/promotions?surface='+offerSurface,{cache:'no-store'});if(!response.ok)return;const {campaigns}=await response.json();availableOffers=campaigns||[];clearTimeout(offerExpiryTimer);if(availableOffers.length){const next=Math.min(...availableOffers.map(c=>Date.parse(c.endsAt)));offerExpiryTimer=setTimeout(()=>void loadOffers(),Math.max(1000,Math.min(86400000,next-Date.now()+500)));}document.querySelectorAll('.variant').forEach(select=>{const p=P.find(item=>item.id===select.id.slice(2));$("price-"+p.id).innerHTML=priceMarkup(p.variants[Number(select.value)])});
 renderPurchasedPacks();renderPurchasedPromos();renderAppProduct();
 const shortcut=$("appOfferShortcut");
 if(shortcut){
  shortcut.querySelector("span").textContent=availableOffers.map(c=>c.title).join(" · ")||"See current offers and festival updates";
 }
  if(!availableOffers.length){$("offerCards").innerHTML=defaultOfferMarkup;return;}
 $("offerCards").replaceChildren(...availableOffers.map(c=>{const card=document.createElement('article');card.className='offer-card';
 for(const [tag,text] of [['span',c.occasion||'MVN SPECIAL'],['h3',c.title],['p',c.description],['small','Retail customers only · Ends '+new Date(Date.parse(c.endsAt)-1).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})+' IST']]){const el=document.createElement(tag);el.textContent=text;card.append(el)}
 const terms=document.createElement('details'),summary=document.createElement('summary'),copy=document.createElement('p');summary.textContent='Offer terms';copy.textContent=c.terms;terms.append(summary,copy);card.append(terms);
 const button=document.createElement('button');button.type='button';button.textContent='Use '+c.code;button.onclick=()=>{openBag();appliedOffer=null;$("offerCode").value=c.code;drawCart();$("offerMessage").textContent='Add your products, then apply this code.';$("offerCode").focus()};card.append(button);return card;}));
 }catch{} }
loadOffers();
window.addEventListener("focus",()=>void loadOffers());
$("bag").onclick=openBag;if($("floatingCart"))$("floatingCart").onclick=openBag;$("close").onclick=closeBag;$("shade").onclick=closeBag;
document.querySelectorAll("[data-cat]").forEach(x=>x.onclick=e=>{e.preventDefault();setCat(x.dataset.cat)});
$("sort").onchange=render;
$("search").onsubmit=e=>{e.preventDefault();q=$("q").value;cat="all";render();$("shop").scrollIntoView({behavior:"smooth"})};
$("q").oninput=e=>{q=e.target.value;render()};
for(const id of ['customerName','customerAddress','customerCity','customerState'])$(id).addEventListener('input',()=>$(id).setCustomValidity(''));
$("checkoutFields").addEventListener("input",()=>{retailLeadKey=crypto.randomUUID()});
$("checkoutFields").onsubmit=e=>{e.preventDefault();retailEnquiry()};
function resetFilters(){cat="all";q="";priceRange="all";$("q").value="";if($("priceRange"))$("priceRange").value="all";$("sort").value="default";render()}
if($("priceRange"))$("priceRange").onchange=e=>{priceRange=e.target.value;render()};
if($("resetFilters"))$("resetFilters").onclick=resetFilters;
if($("clearRecent"))$("clearRecent").onclick=()=>{recent=[];try{localStorage.removeItem("mvn-recent-v1")}catch{}renderRecent()};
document.addEventListener("keydown",e=>{
 if(!$("drawer").classList.contains("open"))return;
 if(e.key==="Escape"){e.preventDefault();closeBag()}
 if(e.key==="Tab"){const controls=[...$("drawer").querySelectorAll('button:not(:disabled),input,a[href],select')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
});
installCategoryShortcuts();render();drawCart();renderRecent();
refreshRetailPrices().then(()=>{render();drawCart();renderRecent()}).catch(error=>{if($("priceMessage"))$("priceMessage").textContent=error.message});


/* Website-only premium product detail. The installed app intentionally retains its own layout. */
function showWebsiteProductDetail(p,options,initialIndex,dlg,root){
 let current=initialIndex,quantity=1;
 const optionButtons=options.map(({v,i})=>
  '<button type="button" class="mvn-pack-choice" data-mvn-pack="'+i+'" aria-pressed="'+(i===initialIndex)+'"><span>'+safe(v.label)+'</span><strong>'+money(v.price)+'</strong></button>'
 ).join('');
 const photoButtons=options.filter(({i})=>Boolean(coverImage(p,i))).map(({v,i})=>
  '<button type="button" class="mvn-photo-choice" data-mvn-photo="'+i+'" aria-label="View '+safe(v.label)+' pack"><img src="'+safe(coverImage(p,i))+'" alt="" loading="lazy"></button>'
 ).join('');
 root.innerHTML=
  '<div class="mvn-detail-assurance" aria-label="Ordering information"><span>Clear retail prices</span><span>Choose the exact pack</span><span>WhatsApp order confirmation</span></div>'+
  '<div class="mvn-detail-layout">'+
   '<section class="mvn-detail-gallery" aria-label="Product photographs">'+
    '<div class="mvn-detail-stage detail-photo"></div>'+
    (photoButtons?'<div class="mvn-detail-thumbnails" aria-label="Available pack photos">'+photoButtons+'</div>':'')+
    '<p class="mvn-detail-gallery-note">Photos display the selected pack only. Ask our team for current front and back label images.</p>'+
   '</section>'+
   '<section class="mvn-detail-content">'+
    '<span class="mvn-detail-brand">'+safe(p.brand||'Unicorn Pro Series')+'</span>'+
    '<h2>'+safe(p.name)+'</h2>'+
    '<p class="mvn-detail-description">'+safe(p.desc)+'</p>'+
    '<div class="mvn-detail-price price" id="detail-price">'+priceMarkup(p.variants[initialIndex])+'</div>'+
    '<div class="mvn-detail-step"><b>01</b><span>SELECT FLAVOUR / PACK SIZE</span></div>'+
    '<div class="mvn-pack-choices" aria-label="Choose the exact product pack">'+optionButtons+'</div>'+
    '<div class="mvn-detail-step"><b>02</b><span>QUANTITY</span></div>'+
    '<div class="mvn-quantity-row"><div class="mvn-quantity" aria-label="Quantity"><button type="button" data-mvn-qty="-1" aria-label="Decrease quantity">−</button><output id="mvn-detail-quantity" aria-live="polite">1</output><button type="button" data-mvn-qty="1" aria-label="Increase quantity">+</button></div><span>Stock confirmed with our team before fulfilment</span></div>'+
    '<button type="button" class="mvn-detail-cart" id="detail-add">ADD TO CART · '+money(p.variants[initialIndex].price)+'</button>'+
    '<button type="button" class="mvn-detail-checkout" id="detail-buy">REVIEW ORDER DETAILS</button>'+
    '<p class="mvn-detail-order-note">No online payment is taken. Review your cart, then send your order request via WhatsApp.</p>'+
    '<details class="mvn-detail-accordion"><summary>About this product</summary><p>'+safe(p.desc)+'</p></details>'+
    '<details class="mvn-detail-accordion"><summary>Pack labels and availability</summary><p>Our team confirms the selected flavour, size and current stock before accepting your order. Request the current product label if needed.</p></details>'+
   '</section>'+
  '</div>';
 const stage=root.querySelector('.mvn-detail-stage');
 const packButtons=[...root.querySelectorAll('[data-mvn-pack]')];
 const photoChoices=[...root.querySelectorAll('[data-mvn-photo]')];
 const update=()=>{
  const variant=p.variants[current];
  swapPhoto(stage,coverImage(p,current),p.name+' — '+variant.label);
  root.querySelector('#detail-price').innerHTML=priceMarkup(variant);
  root.querySelector('#mvn-detail-quantity').textContent=quantity;
  root.querySelector('#detail-add').textContent='ADD TO CART · '+money(variant.price*quantity);
  packButtons.forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.mvnPack)===current)));
  photoChoices.forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.mvnPhoto)===current)));
 };
 packButtons.forEach(button=>button.addEventListener('click',()=>{current=Number(button.dataset.mvnPack);update()}));
 photoChoices.forEach(button=>button.addEventListener('click',()=>{current=Number(button.dataset.mvnPhoto);update()}));
 root.querySelectorAll('[data-mvn-qty]').forEach(button=>button.addEventListener('click',()=>{quantity=Math.max(1,Math.min(99,quantity+Number(button.dataset.mvnQty)));update()}));
 const addToOrder=(review)=>{
  const key=p.id+'|'+current;
  cart[key]=Math.min(999,(cart[key]||0)+quantity);
  persist();dlg.close();openBag();
  if(review)$('customerName')?.focus();
 };
 root.querySelector('#detail-add').onclick=()=>addToOrder(false);
 root.querySelector('#detail-buy').onclick=()=>addToOrder(true);
 update();
 if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
}

function showDetail(id,chosenIndex){
 const p=P.find(x=>x.id===id);if(!p)return;
 recent=[id,...recent.filter(value=>value!==id)].slice(0,4);try{localStorage.setItem("mvn-recent-v1",JSON.stringify(recent))}catch{}renderRecent();
 const dlg=$("productDialog"),root=$("productDetail");
 const selected=Number(chosenIndex ?? $("v-"+id)?.value ?? displayVariant(p));
 const options=document.body.classList.contains('app-store')?p.variants.map((v,i)=>({v,i})):visiblePackOptions(p);
 const initialIndex=options.some(({i})=>i===selected)?selected:options[0]?.i;
 if(initialIndex===undefined)return;
 if(!document.body.classList.contains('app-store'))return showWebsiteProductDetail(p,options,initialIndex,dlg,root);
 const cover=coverImage(p,initialIndex);const photo=cover?'<img src="'+safe(cover)+'" alt="'+safe(p.name)+'" loading="lazy"><div class="placeholder" hidden>Verified product image pending</div>':'<div class="placeholder"><b>'+safe(p.name)+'</b>Verified product image pending</div>';
 root.innerHTML='<div class="detail-layout"><div class="detail-photo">'+photo+'</div><div class="detail-copy"><span class="eyebrow dark">'+safe(p.brand||'Unicorn Pro Series')+'</span><h2>'+safe(p.name)+'</h2><p>'+safe(p.desc)+'</p><p class="detail-note">Product pack and flavour availability are confirmed before fulfilment. Front/back pack-label and ingredient photos will be added after verification; please request the current label when ordering.</p><label for="detail-variant">FLAVOUR / PACK SIZE</label><select id="detail-variant">'+options.map(({v,i})=>'<option value="'+i+'"'+(i===initialIndex?' selected':'')+'>'+safe(v.label)+'</option>').join("")+'</select><div class="price detail-price" id="detail-price">'+priceMarkup(p.variants[initialIndex])+'</div><button class="primary" id="detail-add">ADD TO CART +</button></div></div>';
 swapPhoto(root.querySelector(".detail-photo"),coverImage(p,initialIndex),p.name);
 const sel=$("detail-variant");sel.onchange=()=>{$("detail-price").innerHTML=priceMarkup(p.variants[Number(sel.value)]);swapPhoto(root.querySelector(".detail-photo"),coverImage(p,sel.value),p.name)};
 $("detail-add").onclick=()=>{const k=p.id+"|"+sel.value;cart[k]=Math.min(999,(cart[k]||0)+1);persist();dlg.close();openBag()};
 if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");
}
$("detailClose").onclick=()=>$("productDialog").close();

document.querySelectorAll(".hero-visual img,.detail-photo img").forEach(img=>img.addEventListener("error",()=>{img.hidden=true}));
