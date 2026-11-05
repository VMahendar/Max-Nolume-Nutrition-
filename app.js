/* Max Volume Nutrition — customer storefront and dealer enquiries.
   Prices are customer-facing INR amounts. Wholesale prices must NEVER be embedded in public JS. */
const PHONE="917708830513";
const P=[
{id:"whey",name:"Potency Whey",cat:"whey",size:"5 lbs",featuredIndex:1,variants:[{label:"Chocolate · 5 lbs",price:4999,img:null},{label:"Coffee · 5 lbs",price:4999,img:"https://unicornproseries.com/wp-content/uploads/2026/09/Potency-Whey.png"}],desc:"Current white-and-blue 5 lb range. Choose Chocolate or Coffee. Pack photo shown for Coffee.",img:""},
{id:"mass",name:"Nitro Mass",cat:"mass",featuredIndex:1,variants:[{label:"3 kg · Box photo pending",price:2599,img:null},{label:"5 kg · Bucket",price:3499,img:"assets/Screenshot_2026_1103_003852.jpg"}],desc:"Mass gainer available in two pack sizes.",img:""},
{id:"pre",name:"Sturdy Pre-Workout",cat:"pre",variants:[{label:"Watermelon · 250 g",price:1399,img:"https://unicornproseries.com/wp-content/uploads/2026/07/Stuedy-Watermelon.png"}],desc:"Watermelon flavour, 250 g. Refer to the actual product label for ingredients and caffeine content.",img:"https://unicornproseries.com/wp-content/uploads/2026/07/Stuedy-Watermelon.png"},
{id:"creatine",name:"Pro Creatine",cat:"creatine",featuredIndex:0,variants:[{label:"Blueberry · 100 g · photo pending",price:899,img:null},{label:"Cranberry · 100 g · photo pending",price:899,img:null}],desc:"Blueberry and Cranberry flavours. Availability to be confirmed.",img:""},
{id:"vitamins",name:"Multivitamin",cat:"vitamins",variants:[{label:"1 pack",price:699}],desc:"Daily multivitamin supplement.",img:""}
];
const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
let cat="all",q="",cart={},mode="retail";
try{const v=JSON.parse(localStorage.getItem("mvn-cart-v2")||"{}");if(v&&typeof v==="object")cart=v}catch(e){}
function getItem(k){if(!/^(whey|mass|pre|creatine|vitamins)\|[0-9]+$/.test(k))return null;const [id,i]=k.split("|");const p=P.find(x=>x.id===id),v=p&&p.variants[Number(i)];return p&&v?{p,v}:null}
cart=Object.fromEntries(Object.entries(cart).filter(([k,v])=>getItem(k)&&Number.isSafeInteger(v)&&v>0&&v<=999));
function persist(){try{localStorage.setItem("mvn-cart-v2",JSON.stringify(cart))}catch{}drawCart()}
function coverImage(p,i){const v=p.variants[Number(i)];return v&&Object.prototype.hasOwnProperty.call(v,"img")?(v.img||""):(p.img||"")}
function swapPhoto(host,src,name){
 if(!host)return;
 let img=host.querySelector("img"),placeholder=host.querySelector(".placeholder");
 if(!placeholder){placeholder=document.createElement("div");placeholder.className="placeholder";placeholder.textContent="Verified pack photo coming soon";host.appendChild(placeholder)}
 if(!src){if(img)img.hidden=true;placeholder.hidden=false;return}
 if(!img){img=document.createElement("img");img.loading="lazy";img.alt=name;host.insertBefore(img,placeholder)}
 img.onerror=()=>{img.hidden=true;placeholder.hidden=false};
 img.onload=()=>{img.hidden=false;placeholder.hidden=true};
 img.hidden=false;placeholder.hidden=true;img.src=src;
}
function card(p){
const featured=p.featuredIndex||0;const cover=coverImage(p,featured);const packAlt=p.name+' — '+p.variants[featured].label;const pic=cover?'<img loading="lazy" src="'+cover+'" alt="'+packAlt+'"><div class="placeholder" hidden><b>'+p.name+'</b>Photo coming soon</div>':'<div class="placeholder"><b>'+p.name+'</b>Verified pack photo coming soon</div>';
return '<article class="card"><span class="badge">UNICORN PRO SERIES</span><div class="photo">'+pic+'</div><div class="info"><small>UNICORN PRO SERIES</small><h3>'+p.name+'</h3><p>'+p.desc+'</p><label class="variant-label" for="v-'+p.id+'">FLAVOUR / PACK SIZE</label><select id="v-'+p.id+'" class="variant">'+p.variants.map((v,i)=>'<option value="'+i+'"'+(i===featured?' selected':'')+'>'+v.label+'</option>').join("")+'</select><div class="price"><b id="price-'+p.id+'">'+money(p.variants[featured].price)+'</b><small>Retail selling price</small></div><button class="details-link" type="button" data-detail="'+p.id+'">VIEW PRODUCT DETAILS →</button><button class="add" data-id="'+p.id+'">ADD TO CART +</button></div></article>';
}
function render(){
const items=P.filter(p=>(cat==="all"||p.cat===cat)&&((p.name+" "+p.variants.map(v=>v.label).join(" ")).toLowerCase().includes(q.toLowerCase())));
if($("sort").value==="default")items.sort((a,b)=>Number(Boolean(coverImage(b,b.featuredIndex||0)))-Number(Boolean(coverImage(a,a.featuredIndex||0))));
if($("sort").value==="name")items.sort((a,b)=>a.name.localeCompare(b.name));
if($("sort").value==="low")items.sort((a,b)=>a.variants[0].price-b.variants[0].price);
$("grid").innerHTML=items.map(card).join("");
 document.querySelectorAll(".photo img").forEach(img=>img.addEventListener("error",()=>{img.hidden=true;if(img.nextElementSibling)img.nextElementSibling.hidden=false}));
$("resultText").textContent=items.length+" product"+(items.length===1?"":"s")+" available";
document.querySelectorAll(".variant").forEach(s=>s.addEventListener("change",()=>{const p=P.find(x=>x.id===s.id.slice(2));$("price-"+p.id).textContent=money(p.variants[Number(s.value)].price);swapPhoto(s.closest(".card").querySelector(".photo"),coverImage(p,s.value),p.name)}));
document.querySelectorAll(".details-link").forEach(b=>b.addEventListener("click",()=>showDetail(b.dataset.detail)));
document.querySelectorAll(".add").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.id+"|"+$("v-"+b.dataset.id).value;cart[k]=Math.min(999,(cart[k]||0)+1);persist();openBag()}));
}
function setCat(c){cat=c;document.querySelectorAll(".cats [data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===c));render();$("shop").scrollIntoView({behavior:"smooth"})}
function totals(){let n=0,subtotal=0;for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;const quantity=Math.min(999,Math.max(0,Number(qty)||0));n+=quantity;subtotal+=item.v.price*quantity;}return{n,subtotal}}
function drawCart(){
const {n,subtotal}=totals();$("count").textContent=n;if($("floatingCount"))$("floatingCount").textContent=n;
let html=n?"":'<p class="empty-cart">Your cart is empty. Choose your supplements to get started.</p>';
for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;html+='<div class="row"><b>'+item.p.name+'</b><small>'+item.v.label+' · '+money(item.v.price)+'</small><div class="qty"><button data-minus="'+k+'" aria-label="Decrease quantity">−</button><span>'+qty+'</span><button data-plus="'+k+'" aria-label="Increase quantity">+</button><strong>'+money(item.v.price*qty)+'</strong></div></div>'}
$("items").innerHTML=html;
$("cart-totals").innerHTML=n?'<div><span>Subtotal</span><b>'+money(subtotal)+'</b></div>':"";
$("send").disabled=!n;
document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{const k=b.dataset.minus;cart[k]-=1;if(cart[k]<=0)delete cart[k];persist()});
document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{const k=b.dataset.plus;cart[k]=Math.min(999,cart[k]+1);persist()});
}
function openBag(){$("shade").hidden=false;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");document.body.classList.add("cart-open")}
function closeBag(){$("shade").hidden=true;$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");document.body.classList.remove("cart-open")}
function retailEnquiry(){
const entries=Object.entries(cart).filter(([k])=>getItem(k));if(!entries.length)return;
const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim();
if(!name||!phone){$("checkoutFields").reportValidity();return}
const lines=entries.map(([k,n])=>{const {p,v}=getItem(k);return p.name+" — "+v.label+" × "+n+" = "+money(n*v.price)});
const {subtotal}=totals();
const msg="Hello Max Volume Nutrition, I would like to enquire about availability:\n\n"+lines.join("\n")+"\n\nProduct subtotal: "+money(subtotal)+"\n\nName: "+name+"\nPhone: "+phone+"\n\nPlease confirm product availability. This is an enquiry only; payment and delivery are disabled.";
window.open("https://wa.me/"+PHONE+"?text="+encodeURIComponent(msg),"_blank","noopener");
}
$("bag").onclick=openBag;if($("floatingCart"))$("floatingCart").onclick=openBag;$("close").onclick=closeBag;$("shade").onclick=closeBag;
document.querySelectorAll("[data-cat]").forEach(x=>x.onclick=e=>{e.preventDefault();setCat(x.dataset.cat)});
$("sort").onchange=render;
$("search").onsubmit=e=>{e.preventDefault();q=$("q").value;cat="all";render();$("shop").scrollIntoView({behavior:"smooth"})};
$("q").oninput=e=>{q=e.target.value;render()};
$("checkoutFields").onsubmit=e=>{e.preventDefault();retailEnquiry()};
render();drawCart();

function showDetail(id){
 const p=P.find(x=>x.id===id);if(!p)return;
 const dlg=$("productDialog"),root=$("productDetail");
 const initialIndex=Number($("v-"+id)?.value ?? p.featuredIndex ?? 0);
 const cover=coverImage(p,initialIndex);const photo=cover?'<img src="'+cover+'" alt="'+p.name+'" loading="lazy"><div class="placeholder" hidden>Verified product image pending</div>':'<div class="placeholder"><b>'+p.name+'</b>Verified product image pending</div>';
 root.innerHTML='<div class="detail-layout"><div class="detail-photo">'+photo+'</div><div class="detail-copy"><span class="eyebrow dark">UNICORN PRO SERIES</span><h2>'+p.name+'</h2><p>'+p.desc+'</p><p class="detail-note">Product pack and flavour availability are confirmed before fulfilment. Front/back pack-label and ingredient photos will be added after verification; please request the current label when ordering.</p><label for="detail-variant">FLAVOUR / PACK SIZE</label><select id="detail-variant">'+p.variants.map((v,i)=>'<option value="'+i+'"'+(i===initialIndex?' selected':'')+'>'+v.label+'</option>').join("")+'</select><h3 id="detail-price">'+money(p.variants[initialIndex].price)+'</h3><button class="primary" id="detail-add">ADD TO CART +</button></div></div>';
 swapPhoto(root.querySelector(".detail-photo"),coverImage(p,initialIndex),p.name);
 const sel=$("detail-variant");sel.onchange=()=>{$("detail-price").textContent=money(p.variants[Number(sel.value)].price);swapPhoto(root.querySelector(".detail-photo"),coverImage(p,sel.value),p.name)};
 $("detail-add").onclick=()=>{const k=p.id+"|"+sel.value;cart[k]=Math.min(999,(cart[k]||0)+1);persist();dlg.close();openBag()};
 if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");
}
$("detailClose").onclick=()=>$("productDialog").close();

document.querySelectorAll(".hero-visual img,.detail-photo img").forEach(img=>img.addEventListener("error",()=>{img.hidden=true}));
