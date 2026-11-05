/* Max Volume Nutrition — customer storefront and dealer enquiries.
   Prices are customer-facing INR amounts. Wholesale prices must NEVER be embedded in public JS. */
const PHONE="917708830513";

const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
let cat="all",q="",cart={};
try{const v=JSON.parse(localStorage.getItem("mvn-cart-v3")||"{}");if(v&&typeof v==="object"&&!Array.isArray(v)){for(const [k,n] of Object.entries(v)){const [id,idx]=k.split("|");if(P.some(p=>p.id===id&&p.variants[Number(idx)])&&Number.isInteger(n)&&n>0&&n<=99)cart[k]=n}}}catch(e){}
function getItem(k){const [id,i]=k.split("|");const p=P.find(x=>x.id===id),v=p&&p.variants[Number(i)];return p&&v?{p,v}:null}
function persist(){try{localStorage.setItem("mvn-cart-v3",JSON.stringify(cart))}catch(e){}drawCart()}
function card(p){
const pic=p.img?'<img loading="lazy" src="'+p.img+'" alt="'+p.name+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="placeholder" hidden><small>UNICORN PRO SERIES</small><b>'+p.name+'</b><span>Pack photo will be added after verification</span></div>':'<div class="placeholder"><small>UNICORN PRO SERIES</small><b>'+p.name+'</b><span>Request current pack photographs</span></div>';
return '<article class="card"><span class="badge">UNICORN PRO SERIES</span><div class="photo">'+pic+'</div><div class="info"><small>UNICORN PRO SERIES</small><h3>'+p.name+' <span class="pack-name">'+p.size+'</span></h3><p>'+p.desc+'</p><label class="variant-label" for="v-'+p.id+'">FLAVOUR / PACK SIZE</label><select id="v-'+p.id+'" class="variant">'+p.variants.map((v,i)=>'<option value="'+i+'">'+v.label+'</option>').join("")+'</select><div class="price"><b id="price-'+p.id+'">'+money(p.variants[0].price)+'</b><small>Retail price · Including applicable taxes</small></div><a class="details-link" href="product.html?sku='+encodeURIComponent(p.id)+'">VIEW FULL PRODUCT DETAILS →</a><button class="add" data-id="'+p.id+'">ADD TO CART +</button></div></article>';
}
function render(){
const items=P.filter(p=>(cat==="all"||p.cat===cat)&&((p.name+" "+p.variants.map(v=>v.label).join(" ")).toLowerCase().includes(q.toLowerCase())));
if($("sort").value==="default")items.sort((a,b)=>Number(Boolean(b.img))-Number(Boolean(a.img)));
if($("sort").value==="name")items.sort((a,b)=>a.name.localeCompare(b.name));
if($("sort").value==="low")items.sort((a,b)=>a.variants[0].price-b.variants[0].price);
$("grid").innerHTML=items.length?items.map(card).join(""):'<div class="no-results">No products matched your search. <button type="button" id="resetFilters">Show all products</button></div>';
const reset=$("resetFilters");if(reset)reset.onclick=()=>{cat="all";q="";$("q").value="";$("sort").value="default";render()};
$("resultText").textContent=items.length+" product"+(items.length===1?"":"s")+" available";
document.querySelectorAll(".variant").forEach(s=>s.addEventListener("change",()=>{const p=P.find(x=>x.id===s.id.slice(2));$("price-"+p.id).textContent=money(p.variants[Number(s.value)].price)}));
// Dedicated product pages handle full details and manufacturer documentation.
document.querySelectorAll(".add").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.id+"|"+$("v-"+b.dataset.id).value;cart[k]=Math.min(99,(cart[k]||0)+1);persist();openBag()}));
}
function setCat(c){cat=c;document.querySelectorAll(".cats [data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===c));render();document.querySelector(".productbar").scrollIntoView({behavior:"smooth",block:"start"})}
function totals(){let n=0,subtotal=0;for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;const quantity=Math.min(999,Math.max(0,Number(qty)||0));n+=quantity;subtotal+=item.v.price*quantity;}return{n,subtotal}}
function drawCart(){
const {n,subtotal}=totals();$("count").textContent=n;
let html=n?"":'<p class="empty-cart">Your cart is empty. Choose your supplements to get started.</p>';
for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;html+='<div class="row"><b>'+item.p.name+'</b><small>'+item.v.label+' · '+money(item.v.price)+'</small><div class="qty"><button data-minus="'+k+'" aria-label="Decrease quantity">−</button><span>'+qty+'</span><button data-plus="'+k+'" aria-label="Increase quantity">+</button><strong>'+money(item.v.price*qty)+'</strong></div></div>'}
$("items").innerHTML=html;
$("cart-totals").innerHTML=n?'<div><span>Subtotal</span><b>'+money(subtotal)+'</b></div>':"";
$("send").disabled=!n;
document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{const k=b.dataset.minus;cart[k]-=1;if(cart[k]<=0)delete cart[k];persist()});
document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{const k=b.dataset.plus;cart[k]=Math.min(99,cart[k]+1);persist()});
}
function openBag(){$("shade").hidden=false;$("drawer").inert=false;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");$("close").focus()}
function closeBag(){$("shade").hidden=true;$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");$("drawer").inert=true;$("bag").focus()}
function retailEnquiry(){
const entries=Object.entries(cart).filter(([k])=>getItem(k));if(!entries.length)return;
const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim();
if(!name||!/^[6-9][0-9]{9}$/.test(phone.replace(/\D/g,""))){if(!name){$("customerName").focus()}else{$("customerPhone").setCustomValidity("Enter a valid 10-digit Indian mobile number");$("customerPhone").reportValidity()}return}
const lines=entries.map(([k,n])=>{const {p,v}=getItem(k);return p.name+" — "+v.label+" × "+n+" = "+money(n*v.price)});
const {subtotal}=totals();
const msg="Hello Max Volume Nutrition, I would like to enquire about availability:\n\n"+lines.join("\n")+"\n\nProduct subtotal: "+money(subtotal)+"\n\nName: "+name+"\nPhone: "+phone+"\n\nPlease confirm product availability. This is an enquiry only; payment and delivery are disabled.";
const link="https://wa.me/"+PHONE+"?text="+encodeURIComponent(msg);
const fallback=$("whatsappFallback");if(fallback){fallback.href=link;fallback.hidden=false}
const opened=window.open(link,"_blank");
if(opened){try{opened.opener=null}catch(e){}}else if(fallback)fallback.focus()
}
$("bag").onclick=openBag;$("close").onclick=closeBag;$("shade").onclick=closeBag;
document.querySelectorAll("[data-cat]").forEach(x=>x.onclick=e=>{e.preventDefault();setCat(x.dataset.cat)});
$("sort").onchange=render;
$("search").onsubmit=e=>{e.preventDefault();q=$("q").value;cat="all";render();$("shop").scrollIntoView({behavior:"smooth"})};
$("q").oninput=e=>{q=e.target.value;render()};
$("checkoutFields").onsubmit=e=>{e.preventDefault();retailEnquiry()};
$("customerPhone").addEventListener("input",()=>$("customerPhone").setCustomValidity(""));
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeBag()});
$("drawer").inert=true;
render();drawCart();
if(new URLSearchParams(window.location.search).get("cart")==="1")openBag();

function showDetail(id){
 const p=P.find(x=>x.id===id);if(!p)return;
 const dlg=$("productDialog"),root=$("productDetail");
 const photo=p.img?'<img src="'+p.img+'" alt="'+p.name+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="placeholder" hidden><b>'+p.name+'</b>Pack photo pending</div>':'<div class="placeholder"><b>'+p.name+'</b>Pack photo pending</div>';
 root.innerHTML='<div class="detail-layout"><div class="detail-photo">'+photo+'</div><div class="detail-copy"><span class="eyebrow dark">UNICORN PRO SERIES</span><h2>'+p.name+'</h2><p>'+p.desc+'</p><p class="detail-note">'+p.imageNote+'. Product pack and flavour availability are confirmed before fulfilment. Front/back packaging and ingredient photos will be added after verification; please request the current label when enquiring.</p><label for="detail-variant">FLAVOUR / PACK SIZE</label><select id="detail-variant">'+p.variants.map((v,i)=>'<option value="'+i+'">'+v.label+'</option>').join("")+'</select><h3 id="detail-price">'+money(p.variants[0].price)+'</h3><button class="primary" id="detail-add">ADD TO CART +</button><a class="label-enquiry" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+PHONE+'?text='+encodeURIComponent("Hello Max Volume Nutrition, please share the current front/back packaging and ingredient label photographs for "+p.name+" · "+p.size)+'">REQUEST CURRENT PRODUCT LABEL ↗</a></div></div>';
 const sel=$("detail-variant");sel.onchange=()=>{$("detail-price").textContent=money(p.variants[Number(sel.value)].price)};
 $("detail-add").onclick=()=>{const k=p.id+"|"+sel.value;cart[k]=(cart[k]||0)+1;persist();dlg.close();openBag()};
 if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");
}
$("detailClose").onclick=()=>$("productDialog").close();

// No unfinished featured product tiles: the catalogue is the single product source.
