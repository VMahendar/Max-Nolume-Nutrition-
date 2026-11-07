import {api} from './commerce-api.js';
const form=document.getElementById('productForm'),rows=document.getElementById('productPackRows'),message=document.getElementById('productEditorMessage');
let packs=[];
function serialize(){
 form.elements.variants.value=JSON.stringify(packs.map(({row,original})=>{
  const value=name=>row.querySelector('[data-pack-field="'+name+'"]').value;
  const price=name=>value(name).trim()===''?null:Math.round(Number(value(name))*100);
  const variant={...original,label:value('label').trim(),pricePaise:price('retail'),mrpPaise:price('mrp'),prices:{...(original.prices||{})}};
  for(const tier of ['gym','wholesale']){const amount=price(tier);if(amount===null)delete variant.prices[tier];else variant.prices[tier]=amount;}
  return variant;
 }));
}
function input(label,field,value,{required=false}={}){const wrapper=document.createElement('label'),el=document.createElement('input');wrapper.textContent=label;el.dataset.packField=field;el.type=field==='label'?'text':'number';el.value=value??'';el.required=required;if(el.type==='number'){el.min='0.01';el.step='0.01';}else el.maxLength=200;wrapper.append(el);el.addEventListener('input',serialize);return wrapper;}
function addPack(original={id:'pack-'+crypto.randomUUID(),label:'',pricePaise:null,prices:{}}){
 const row=document.createElement('div');row.className='admin-pack-row';const fields=document.createElement('div');fields.className='admin-pack-fields';fields.append(input('Flavour / pack size','label',original.label,{required:true}),input('Customer price (₹)','retail',original.pricePaise===null?'':original.pricePaise/100,{required:true}),input('Confirmed MRP (₹)','mrp',Number.isSafeInteger(original.mrpPaise)?original.mrpPaise/100:''));
 const detail=document.createElement('details'),summary=document.createElement('summary'),trade=document.createElement('div');summary.textContent='Private gym & wholesale prices';trade.append(input('Gym price (₹)','gym',original.prices?.gym?original.prices.gym/100:''),input('Wholesale price (₹)','wholesale',original.prices?.wholesale?original.prices.wholesale/100:''));detail.append(summary,trade);
 const hint=document.createElement('p');hint.textContent='Set physical quantities in Stock. Private trade prices are never shown to retail customers.';row.append(fields,detail,hint);rows.append(row);packs.push({row,original});serialize();
}
function photo(){const host=document.getElementById('adminProductImagePreview'),path=form.elements.image.value;host.replaceChildren();if(path){const img=document.createElement('img');img.src=path;img.alt='Selected product photo';host.append(img);}else{const span=document.createElement('span');span.textContent='No product photo yet';host.append(span);}}
document.addEventListener('admin-product-edit',event=>{
 const product=event.detail;packs=[];rows.replaceChildren();document.getElementById('mrpFields').replaceChildren();
 if(!product)form.elements.id.value='product-'+crypto.randomUUID();
 for(const pack of product?.variants||[])addPack(pack);if(!packs.length)addPack();photo();message.textContent='';
});
document.getElementById('addProductPack').onclick=()=>addPack();
function newProduct(){const select=document.getElementById('productSelect');select.value='new';select.dispatchEvent(new Event('change'));form.elements.name.focus();}
document.getElementById('adminNewProduct').onclick=newProduct;
document.querySelectorAll('[data-new-product]').forEach(a=>a.addEventListener('click',()=>newProduct()));
form.addEventListener('submit',event=>{serialize();const variants=JSON.parse(form.elements.variants.value);if(variants.some(v=>v.mrpPaise!==null&&v.mrpPaise<Math.max(v.pricePaise||0,...Object.values(v.prices)))){event.preventDefault();event.stopImmediatePropagation();message.textContent='MRP must be at least the customer, gym and wholesale selling prices.';}},true);
document.getElementById('adminProductPhoto').onchange=async event=>{
 const file=event.target.files[0];if(!file)return;const status=document.getElementById('productPhotoMessage'),button=form.querySelector('button.btn');button.disabled=true;
 try{if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Choose a JPG, PNG or WebP up to 10 MB.');status.textContent='Uploading photo…';const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const result=await api('/api/admin/store-update-image',{jpeg:canvas.toDataURL('image/jpeg',0.8)});form.elements.image.value=result.path;photo();status.textContent='Photo uploaded. Save the product to apply it.';
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;event.target.value='';}
};
