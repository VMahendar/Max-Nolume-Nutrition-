// Galleries follow the selected pack. An explicit missing variant image never
// inherits another pack's photos unless its own gallery is supplied.
function imageEntries(value){
 if(!Array.isArray(value))return [];
 return value.flatMap((entry,index)=>{
  const src=typeof entry==='string'?entry:entry?.src;
  return typeof src==='string'&&src.trim()?[{src:src.trim(),label:typeof entry?.label==='string'&&entry.label.trim()?entry.label:'View '+(index+1),alt:typeof entry?.alt==='string'?entry.alt:''}]:[];
 });
}
export function variantImages(product,variant,failedImages=new Set()){
 const primary=variant&&Object.hasOwn(variant,'image')?variant.image:variant&&Object.hasOwn(variant,'images')?null:product.image;
 let gallery;
 if(variant&&Object.hasOwn(variant,'images'))gallery=imageEntries(variant.images);
 else if(variant&&Object.hasOwn(variant,'image')&&(typeof variant.image!=='string'||!variant.image.trim()||variant.image!==product.image))gallery=[];
 else gallery=imageEntries(product.images);
 if(typeof primary==='string'&&primary.trim()&&!gallery.some(image=>image.src===primary.trim()))gallery.unshift({src:primary.trim(),label:'Main view',alt:''});
 const seen=new Set();
 return gallery.filter(image=>{if(failedImages.has(image.src)||seen.has(image.src))return false;seen.add(image.src);return true;});
}
export function variantImage(product,variant,failedImages=new Set()){
 return variantImages(product,variant,failedImages)[0]?.src||'';
}
export function visibleCatalogue(catalogue,failedImages=new Set()){
 return catalogue.flatMap(product=>{
  const variants=product.variants.filter(variant=>variantImages(product,variant,failedImages).length);
  return variants.length?[{...product,variants}]:[];
 });
}
export function confirmedMRP(variant){
 const mrp=variant.mrpPaise;
 return Number.isSafeInteger(mrp)&&mrp>0&&(!Number.isSafeInteger(variant.pricePaise)||mrp>=variant.pricePaise)?mrp:null;
}
