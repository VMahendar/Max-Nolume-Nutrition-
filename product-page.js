/* Dedicated product page. Uses the same products.js inventory as the homepage. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(window.location.search);
const product=P.find(p=>p.id===params.get("sku"));
if(!product){$("productMissing").hidden=false;return}
$("productPage").hidden=false;
const fmt=n=>"₹"+Number(n).toLocaleString("en-IN");
const sourceUrl=product.officialUrl||"https://unicornproseries.com/";
const isNitro=product.id==="nitro-mass-3kg"||product.id==="nitro-mass-5kg";
const name=product.name+" "+product.size;
document.title=name+" | Max Volume Nutrition";
$("crumbName").textContent=name;
$("productName").textContent=product.name;
$("productSize").textContent=product.size;
$("productSummary").textContent=product.desc;
$("productOverview").textContent=product.desc+" Available in the selected retail pack size. Product details are subject to the current manufacturer label and batch information.";
$("photoNote").textContent=product.imageNote+". Only the current verified pack and label should be used for a confirmed purchase.";
$("packagingText").textContent=isNitro
 ? product.id==="nitro-mass-3kg"
   ? "3 kg retail pack. This is a separate product from the 5 kg bucket. Use the manufacturer's linked product page to view their currently published 3 kg packaging; the image is not reproduced here until its exact version is verified."
   : "5 kg bucket retail pack. The image supplied by the distributor is shown as a reference; check actual batch label, ingredients and expiry date before purchase."
 : "Refer to the original manufacturer label for ingredients, nutrition panel, usage and allergies. Current front, back and ingredients-panel photographs can be requested from our team.";
$("labStatus").textContent=isNitro
 ? "Nitro Mass manufacturer page supplied for checking 3 kg/5 kg packaging and any published lab-test documents. Individual test PDFs and batch findings have not been independently verified."
 : "Product-specific laboratory reports have not yet been independently verified or uploaded for this SKU.";
$("manufacturerImage").href=sourceUrl;
$("labSource").href=sourceUrl;
const select=$("productVariant");
product.variants.forEach((v,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=v.label;select.appendChild(opt)});
function variant(){const v=product.variants[Number(select.value)]||product.variants[0];$("productPrice").textContent=fmt(v.price);return v}
select.addEventListener("change",variant);variant();
const photo=$("mainProductPhoto");
if(product.img){const img=document.createElement("img");img.src=product.img;img.alt=name+" reference product photograph";img.loading="eager";img.onerror=()=>{img.remove();renderPlaceholder()};photo.appendChild(img);const thumb=document.createElement("img");thumb.src=product.img;thumb.alt=name+" product reference";thumb.onerror=()=>{thumb.remove();$("galleryThumb").textContent="IMAGE TO CONFIRM"};$("galleryThumb").textContent="";$("galleryThumb").appendChild(thumb)}
else renderPlaceholder();
function renderPlaceholder(){const box=document.createElement("div");box.className="mvn-pack-fallback";const brand=document.createElement("span");brand.textContent="UNICORN PRO SERIES";const title=document.createElement("strong");title.textContent=product.name;const pack=document.createElement("b");pack.textContent=product.size;const info=document.createElement("small");info.textContent="VIEW THE MANUFACTURER PRODUCT PAGE FOR CURRENT PACK PHOTOS";box.append(brand,title,pack,info);photo.appendChild(box)}
function quantity(){const n=Math.trunc(Number($("productQuantity").value));const safe=Number.isFinite(n)?Math.min(99,Math.max(1,n)):1;$("productQuantity").value=String(safe);return safe}
$("qtyLess").addEventListener("click",()=>{$("productQuantity").value=String(Math.max(1,quantity()-1))});
$("qtyMore").addEventListener("click",()=>{$("productQuantity").value=String(Math.min(99,quantity()+1))});
$("productQuantity").addEventListener("change",quantity);
function whatsappMessage(topic){
const v=variant();
return "Hello Max Volume Nutrition, I would like to enquire about "+product.name+" — "+v.label+". Retail price listed: "+fmt(v.price)+". "+topic+" Please confirm current availability and packaging.";
}
function waUrl(message){return "https://wa.me/917708830513?text="+encodeURIComponent(message)}
function updateLinks(){
$("directWhatsApp").href=waUrl(whatsappMessage("Availability enquiry."));
$("requestLabel").href=waUrl(whatsappMessage("Please send clear front, back, ingredient/nutrition and batch/expiry photographs."));
}
select.addEventListener("change",updateLinks);updateLinks();
$("productAdd").addEventListener("click",()=>{
const key=product.id+"|"+select.value;let bag={};
try{const v=JSON.parse(localStorage.getItem("mvn-cart-v3")||"{}");if(v&&typeof v==="object"&&!Array.isArray(v))bag=v}catch(e){}
const safe=Number.isInteger(bag[key])&&bag[key]>0?bag[key]:0;bag[key]=Math.min(99,safe+quantity());
try{localStorage.setItem("mvn-cart-v3",JSON.stringify(bag));$("productAdded").hidden=false;$("productAdded").textContent="Added "+quantity()+" × "+product.name+" to your enquiry bag. ";const view=document.createElement("a");view.href="index.html?cart=1#shop";view.textContent="VIEW YOUR ENQUIRY BAG →";$("productAdded").appendChild(view)}catch(e){$("productAdded").hidden=false;$("productAdded").textContent="This browser blocked local storage. Please use the WhatsApp enquiry link instead."}
});
})();