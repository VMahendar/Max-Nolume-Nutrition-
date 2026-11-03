/* Max Volume Nutrition — customer storefront and dealer enquiries.
   Prices are customer-facing INR amounts. Wholesale prices must NEVER be embedded in public JS. */
const PHONE="917708830513", DELIVERY=200;
const P=[
{id:"whey",name:"Potency Whey",cat:"whey",size:"5 lbs",variants:[{label:"Chocolate · 5 lbs",price:4999},{label:"Coffee · 5 lbs",price:4999}],desc:"Premium whey protein for daily training and recovery.",img:"https://revakanya.com/assets/imgs/Potency%20Whey.png"},
{id:"mass",name:"Nitro Mass",cat:"mass",variants:[{label:"3 kg",price:2599},{label:"5 kg",price:3499}],desc:"Mass gainer available in two pack sizes.",img:""},
{id:"pre",name:"Sturdy Pre-Workout",cat:"pre",variants:[{label:"250 g",price:1399}],desc:"Pre-workout formula for your training routine.",img:"https://revakanya.com/assets/imgs/Sturdy%20Pre%20Workout.png"},
{id:"creatine",name:"Pro Creatine",cat:"creatine",variants:[{label:"Blueberry · 100 g",price:899},{label:"Cranberry · 100 g",price:899}],desc:"Creatine supplement in two flavour options.",img:"https://revakanya.com/assets/imgs/Pro%20Creatine.png"},
{id:"vitamins",name:"Multivitamin",cat:"vitamins",variants:[{label:"1 pack",price:699}],desc:"Daily multivitamin supplement.",img:""}
];
const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n).toLocaleString("en-IN");
let cat="all",q="",cart={},mode="retail";
try{const v=JSON.parse(localStorage.getItem("mvn-cart-v2")||"{}");if(v&&typeof v==="object")cart=v}catch(e){}
function getItem(k){const [id,i]=k.split("|");const p=P.find(x=>x.id===id),v=p&&p.variants[Number(i)];return p&&v?{p,v}:null}
function persist(){localStorage.setItem("mvn-cart-v2",JSON.stringify(cart));drawCart()}
function card(p){
const pic=p.img?'<img loading="lazy" src="'+p.img+'" alt="'+p.name+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="placeholder" hidden><b>'+p.name+'</b>Photo coming soon</div>':'<div class="placeholder"><b>'+p.name+'</b>Verified pack photo coming soon</div>';
return '<article class="card"><span class="badge">UNICORN PRO SERIES</span><div class="photo">'+pic+'</div><div class="info"><small>UNICORN PRO SERIES</small><h3>'+p.name+'</h3><p>'+p.desc+'</p><label class="variant-label" for="v-'+p.id+'">FLAVOUR / PACK SIZE</label><select id="v-'+p.id+'" class="variant">'+p.variants.map((v,i)=>'<option value="'+i+'">'+v.label+'</option>').join("")+'</select><div class="price"><b id="price-'+p.id+'">'+money(p.variants[0].price)+'</b><small>Retail selling price</small></div><button class="add" data-id="'+p.id+'">ADD TO CART +</button></div></article>';
}
function render(){
const items=P.filter(p=>(cat==="all"||p.cat===cat)&&((p.name+" "+p.variants.map(v=>v.label).join(" ")).toLowerCase().includes(q.toLowerCase())));
if($("sort").value==="name")items.sort((a,b)=>a.name.localeCompare(b.name));
if($("sort").value==="low")items.sort((a,b)=>a.variants[0].price-b.variants[0].price);
$("grid").innerHTML=items.map(card).join("");
$("resultText").textContent=items.length+" product"+(items.length===1?"":"s")+" available";
document.querySelectorAll(".variant").forEach(s=>s.addEventListener("change",()=>{const p=P.find(x=>x.id===s.id.slice(2));$("price-"+p.id).textContent=money(p.variants[Number(s.value)].price)}));
document.querySelectorAll(".add").forEach(b=>b.addEventListener("click",()=>{const k=b.dataset.id+"|"+$("v-"+b.dataset.id).value;cart[k]=(cart[k]||0)+1;persist();openBag()}));
}
function setCat(c){cat=c;document.querySelectorAll(".cats [data-cat]").forEach(b=>b.classList.toggle("active",b.dataset.cat===c));render();$("shop").scrollIntoView({behavior:"smooth"})}
function totals(){let n=0,subtotal=0;for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;const quantity=Math.min(999,Math.max(0,Number(qty)||0));n+=quantity;subtotal+=item.v.price*quantity;}return{n,subtotal,total:subtotal+(n?DELIVERY:0)}}
function drawCart(){
const {n,subtotal,total}=totals();$("count").textContent=n;
let html=n?"":'<p class="empty-cart">Your cart is empty. Choose your supplements to get started.</p>';
for(const [k,qty] of Object.entries(cart)){const item=getItem(k);if(!item)continue;html+='<div class="row"><b>'+item.p.name+'</b><small>'+item.v.label+' · '+money(item.v.price)+'</small><div class="qty"><button data-minus="'+k+'" aria-label="Decrease quantity">−</button><span>'+qty+'</span><button data-plus="'+k+'" aria-label="Increase quantity">+</button><strong>'+money(item.v.price*qty)+'</strong></div></div>'}
$("items").innerHTML=html;
$("cart-totals").innerHTML=n?'<div><span>Subtotal</span><b>'+money(subtotal)+'</b></div><div><span>Delivery</span><b>'+money(DELIVERY)+'</b></div><div class="grand"><span>Total</span><b>'+money(total)+'</b></div>':"";
$("send").disabled=!n;
document.querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>{const k=b.dataset.minus;cart[k]-=1;if(cart[k]<=0)delete cart[k];persist()});
document.querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>{const k=b.dataset.plus;cart[k]+=1;persist()});
}
function openBag(){$("shade").hidden=false;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false")}
function closeBag(){$("shade").hidden=true;$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true")}
function retailOrder(){
const entries=Object.entries(cart).filter(([k])=>getItem(k));if(!entries.length)return;
const name=$("customerName").value.trim(),phone=$("customerPhone").value.trim(),address=$("customerAddress").value.trim();
if(!name||!phone||!address){$("checkoutFields").reportValidity();return}
const lines=entries.map(([k,n])=>{const {p,v}=getItem(k);return p.name+" — "+v.label+" × "+n+" = "+money(n*v.price)});
const {subtotal,total}=totals();
const msg="Hello Max Volume Nutrition, I would like to place a retail order:\n\n"+lines.join("\n")+"\n\nSubtotal: "+money(subtotal)+"\nDelivery: "+money(DELIVERY)+"\nTotal: "+money(total)+"\n\nName: "+name+"\nPhone: "+phone+"\nDelivery address: "+address+"\n\nPlease confirm stock, shipping and payment instructions.";
window.open("https://wa.me/"+PHONE+"?text="+encodeURIComponent(msg),"_blank","noopener");
}
$("bag").onclick=openBag;$("close").onclick=closeBag;$("shade").onclick=closeBag;
document.querySelectorAll("[data-cat]").forEach(x=>x.onclick=e=>{e.preventDefault();setCat(x.dataset.cat)});
$("sort").onchange=render;
$("search").onsubmit=e=>{e.preventDefault();q=$("q").value;cat="all";render();$("shop").scrollIntoView({behavior:"smooth"})};
$("q").oninput=e=>{q=e.target.value;render()};
$("checkoutFields").onsubmit=e=>{e.preventDefault();retailOrder()};
render();drawCart();
