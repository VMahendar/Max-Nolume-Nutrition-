/* Max Volume Nutrition — customer storefront and dealer enquiries.
   Prices are customer-facing INR amounts. Wholesale prices must NEVER be embedded in public JS. */
const PHONE="917708830513";
const P=[
 {id:"whey-chocolate",name:"Potency Whey",cat:"whey",size:"5 lbs",variants:[{label:"Chocolate · 5 lbs",price:4999}],desc:"Whey protein for daily training and recovery.",img:"https://static.wixstatic.com/media/1ff000_e90a0275d7d54a2faef71492a305f3f6~mv2.png",imageNote:"Manufacturer reference image; confirm current flavour label"},
 {id:"whey-coffee",name:"Potency Whey",cat:"whey",size:"5 lbs",variants:[{label:"Coffee · 5 lbs",price:4999}],desc:"Whey protein for daily training and recovery.",img:"https://static.wixstatic.com/media/1ff000_e90a0275d7d54a2faef71492a305f3f6~mv2.png",imageNote:"Manufacturer reference image; confirm current flavour label"},
 {id:"sturdy-watermelon",name:"Sturdy Pre-Workout",cat:"pre",size:"250 g",variants:[{label:"Watermelon · 250 g",price:1399}],desc:"Pre-workout supplement in the Watermelon flavour.",img:"https://static.wixstatic.com/media/1ff000_c2a176e091a14c6a9c0bf121a2007f5c~mv2.png",imageNote:"Manufacturer reference; verify current label"},
 {id:"nitro-mass-5kg",name:"Nitro Mass",cat:"mass",size:"5 kg bucket",variants:[{label:"5 kg · Bucket",price:3499}],desc:"Mass gainer in the 5 kg bucket pack.",img:"https://static.wixstatic.com/media/1ff000_f0a98421d4c647d18591722f454076cf~mv2.png",imageNote:"5 kg bucket packaging photo"},
 {id:"nitro-mass-3kg",name:"Nitro Mass",cat:"mass",size:"3 kg box",variants:[{label:"3 kg · Box",price:2599}],desc:"Mass gainer in the 3 kg box pack.",img:"",imageNote:"3 kg box photo pending verification"},
 {id:"creatine-blueberry",name:"Pro Creatine",cat:"creatine",size:"100 g",variants:[{label:"Blueberry · 100 g",price:899}],desc:"Creatine supplement, Blueberry flavour.",img:"https://static.wixstatic.com/media/1ff000_8db16ef46b194a72b5a5657b83130626~mv2.png",imageNote:"Manufacturer reference; confirm flavour packaging"},
 {id:"creatine-cranberry",name:"Pro Creatine",cat:"creatine",size:"100 g",variants:[{label:"Cranberry · 100 g",price:899}],desc:"Creatine supplement, Cranberry flavour.",img:"https://static.wixstatic.com/media/1ff000_8db16ef46b194a72b5a5657b83130626~mv2.png",imageNote:"Manufacturer reference; confirm flavour packaging"},
 {id:"musclevite",name:"Musclevite Multivitamin",cat:"vitamins",size:"1 pack",variants:[{label:"1 pack",price:699}],desc:"Daily multivitamin supplement.",img:"",imageNote:"Pack photo pending verification"}
];
const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
let cat="all",q="",cart={};
try{const v=JSON.parse(localStorage.getItem("mvn-cart-v3")||"{}");if(v&&typeof v==="object"&&!Array.isArray(v)){for(const [k,n] of Object.entries(v)){const [id,idx]=k.split("|");if(P.some(p=>p.id===id&&p.variants[Number(idx)])&&Number.isInteger(n)&&n>0&&n<=99)cart[k]=n}}}catch(e){}
function getItem(k){const [id,i]=k.split("|");const p=P.find(x=>x.id===id),v=p&&p.variants[Number(i)];return p&&v?{p,v}:null}
function persist(){try{localStorage.setItem("mvn-cart-v3",JSON.stringify(cart))}catch(e){}drawCart()}
function card(p){
const pic=p.img?'<img loading="lazy" src="'+p.img+'" alt="'+p.name+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="placeholder" hidden><small>UNICORN PRO SERIES</small><b>'+p.name+'</b><span>Pack photo will be added after verification</span></div>':'<div class="placeholder"><small>UNICORN PRO SERIES</small><b>'+p.name+'</b><span>Request current pack photographs</span></div>';
return '<article class="card"><span class="badge">UNICORN PRO SERIES</span><div class="photo">'+pic+'</div><div class="info"><small>UNICORN PRO SERIES</small><h3>'+p.name+' <span class="pack-name">'+p.size+'</span></h3><p>'+p.desc+'</p><label class="variant-label" for="v-'+p.id+'">FLAVOUR / PACK SIZE</label><select id="v-'+p.id+'" class="variant">'+p.variants.map((v,i)=>'<option value="'+i+'">'+v.label+'</option>').join("")+'</select><div class="price"><b id="price-'+p.id+'">'+money(p.variants[0].price)+'</b><small>Retail price · Including applicable taxes</small></div><button class="details-link" type="button" data-detail="'+p.id+'">VIEW PRODUCT DETAILS →</button><button class="add" data-id="'+p.id+'">ADD TO CART +</button></div></article>';
}
function render(){
const items=P.filter(p=>(cat==="all"||p.cat===cat)&&((p.name+" "+p.variants.map(v=>v.label).join(" ")).toLowerCase().includes(q.toLowerCase())));
if($("sort").value==="name")items.sort((a,b)=>a.name.localeCompare(b.name));
if($("sort").value==="low")items.sort((a,b)=>a.variants[0].price-b.variants[0].price);
$("grid").innerHTML=items.length?items.map(card).join(""):'<div class="no-results">No products matched your search. <button type="button" id="resetFilters">Show all products</button></div>';
const reset=$("resetFilters");if(reset)reset.onclick=()=>{cat="all";q="";$("q").value="";$("sort").value="default";render()};
$("resultText").textContent=items.length+" product"+(items.length===1?"":"s")+" available";
document.querySelectorAll(".variant").forEach(s=>s.addEventListener("change",()=>{const p=P.find(x=>x.id===s.id.slice(2));$("price-"+p.id).textContent=money(p.variants[Number(s.value)].price)}));
document.querySelectorAll(".details-link").forEach(b=>b.addEventListener("click",()=>showDetail(b.dataset.detail)));
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

function showDetail(id){
 const p=P.find(x=>x.id===id);if(!p)return;
 const dlg=$("productDialog"),root=$("productDetail");
 const photo=p.img?'<img src="'+p.img+'" alt="'+p.name+'" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="placeholder" hidden><b>'+p.name+'</b>Pack photo pending</div>':'<div class="placeholder"><b>'+p.name+'</b>Pack photo pending</div>';
 root.innerHTML='<div class="detail-layout"><div class="detail-photo">'+photo+'</div><div class="detail-copy"><span class="eyebrow dark">UNICORN PRO SERIES</span><h2>'+p.name+'</h2><p>'+p.desc+'</p><p class="detail-note">'+p.imageNote+'. Product pack and flavour availability are confirmed before fulfilment. Front/back packaging and ingredient photos will be added after verification; please request the current label when enquiring.</p><label for="detail-variant">FLAVOUR / PACK SIZE</label><select id="detail-variant">'+p.variants.map((v,i)=>'<option value="'+i+'">'+v.label+'</option>').join("")+'</select><h3 id="detail-price">'+money(p.variants[0].price)+'</h3><button class="primary" id="detail-add">ADD TO CART +</button><a class="label-enquiry" target="_blank" rel="noopener noreferrer" href="https://wa.me/" + PHONE + "?text="+encodeURIComponent("Hello Max Volume Nutrition, please share the current front/back packaging and ingredient label photographs for "+p.name+" · "+p.size)+'">REQUEST CURRENT PRODUCT LABEL ↗</a></div></div>';
 const sel=$("detail-variant");sel.onchange=()=>{$("detail-price").textContent=money(p.variants[Number(sel.value)].price)};
 $("detail-add").onclick=()=>{const k=p.id+"|"+sel.value;cart[k]=(cart[k]||0)+1;persist();dlg.close();openBag()};
 if(typeof dlg.showModal==="function")dlg.showModal();else dlg.setAttribute("open","");
}
$("detailClose").onclick=()=>$("productDialog").close();

// No unfinished featured product tiles: the catalogue is the single product source.
