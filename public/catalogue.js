// Explicit null on a variant means its own pack image is not available.
export function variantImage(product,variant){
 const image=variant&&Object.hasOwn(variant,'image')?variant.image:product.image;
 return typeof image==='string'?image.trim():'';
}
export function visibleCatalogue(catalogue,failedImages=new Set()){
 return catalogue.flatMap(product=>{
  const variants=product.variants.filter(variant=>{
   const image=variantImage(product,variant);
   return image&&!failedImages.has(image);
  });
  return variants.length?[{...product,variants}]:[];
 });
}
export function confirmedMRP(variant){
 const mrp=variant.mrpPaise;
 return Number.isSafeInteger(mrp)&&mrp>0&&(!Number.isSafeInteger(variant.pricePaise)||mrp>=variant.pricePaise)?mrp:null;
}
