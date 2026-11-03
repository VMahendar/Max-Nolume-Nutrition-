import test from 'node:test';
import assert from 'node:assert/strict';
import {variantImage,variantImages,visibleCatalogue,confirmedMRP} from '../public/catalogue.js';
import {sanitiseCart} from '../public/cart.js';
test('storefront hides image-less products and explicit image-less packs without altering catalogue records',()=>{
 const raw=[{id:'mass',image:'assets/bucket.jpg',variants:[{id:'five',pricePaise:349900},{id:'three',image:null,pricePaise:259900}]},{id:'vitamins',image:null,variants:[{id:'v'}]}];
 const copy=structuredClone(raw),visible=visibleCatalogue(raw);
 assert.deepEqual(visible.map(p=>p.id),['mass']);assert.deepEqual(visible[0].variants.map(v=>v.id),['five']);assert.equal(visible[0].variants[0].pricePaise,349900);assert.deepEqual(raw,copy);
 assert.equal(variantImage(raw[0],raw[0].variants[1]),'');
 assert.deepEqual(sanitiseCart([{variantId:'three',quantity:1},{variantId:'five',quantity:2}],visible),[{variantId:'five',quantity:2}]);
});
test('failed pack image hides only affected variants and removes cards with no remaining images',()=>{
 const raw=[{id:'packs',image:'assets/a.jpg',variants:[{id:'a'},{id:'b',image:'assets/b.jpg'}]},{id:'other',image:'assets/a.jpg',variants:[{id:'c'}]}];
 const visible=visibleCatalogue(raw,new Set(['assets/a.jpg']));
 assert.deepEqual(visible.map(p=>p.id),['packs']);assert.deepEqual(visible[0].variants.map(v=>v.id),['b']);
 assert.deepEqual(visibleCatalogue(raw,new Set(['assets/a.jpg','assets/b.jpg'])),[]);
});
test('MRP comparisons require confirmed integer values at or above the actual selling price',()=>{
 for(const value of [undefined,null,0,-1,9999,15000.5,'15000'])assert.equal(confirmedMRP({pricePaise:10000,mrpPaise:value}),null);
 assert.equal(confirmedMRP({pricePaise:10000,mrpPaise:15000}),15000);
 assert.equal(confirmedMRP({pricePaise:10000,mrpPaise:10000}),10000);
});

test('product galleries preserve original sources, deduplicate views and do not mix pack images',()=>{
 const product={image:'assets/front.jpg',images:[{src:'assets/front.jpg',label:'Front'},{src:'assets/back.jpg',label:'Back'},'assets/back.jpg'],variants:[]};
 const pack={id:'same'};
 assert.deepEqual(variantImages(product,pack).map(x=>x.src),['assets/front.jpg','assets/back.jpg']);
 assert.deepEqual(variantImages(product,pack).map(x=>x.label),['Front','Back']);
 assert.deepEqual(variantImages(product,{id:'other',image:'assets/other-pack.jpg'}).map(x=>x.src),['assets/other-pack.jpg']);
 assert.deepEqual(variantImages(product,{id:'missing',image:null}),[]);
 assert.deepEqual(variantImages(product,{id:'own-gallery',images:['assets/flavour.jpg']}).map(x=>x.src),['assets/flavour.jpg']);
 assert.deepEqual(variantImages({...product,image:null},{id:'missing',image:null}),[]);
});
test('variant galleries keep flavour views separate and fall back when one gallery image fails',()=>{
 const product={id:'p',image:'assets/front.jpg',images:['assets/front.jpg','assets/back.jpg'],variants:[{id:'v'}]};
 const failed=new Set(['assets/front.jpg']);
 assert.equal(variantImage(product,product.variants[0],failed),'assets/back.jpg');assert.equal(visibleCatalogue([product],failed).length,1);
 assert.deepEqual(variantImages(product,{id:'flavour',image:'assets/berry.jpg',images:[{src:'assets/berry-back.jpg',label:'Label'}]}).map(x=>x.src),['assets/berry.jpg','assets/berry-back.jpg']);
 assert.deepEqual(visibleCatalogue([product],new Set(['assets/front.jpg','assets/back.jpg'])),[]);
});

test('retired Whey packaging stays hidden in saved catalogues while new pack views remain usable',()=>{
 const retired={id:'potency-whey',image:'assets/potency-whey.png',images:[{src:'assets/potency-whey.png',label:'Old pack'}],variants:[{id:'whey-chocolate',pricePaise:499900,mrpPaise:859900},{id:'whey-coffee',pricePaise:499900,mrpPaise:859900}]};
 const copy=structuredClone(retired);
 assert.deepEqual(visibleCatalogue([retired]),[]);
 assert.deepEqual(retired,copy);
 const current={...retired,images:[...retired.images,{src:'assets/whey-white-blue-front.jpg',label:'Front'},{src:'assets/whey-white-blue-back.jpg',label:'Back'}]};
 assert.deepEqual(variantImages(current,current.variants[0]).map(x=>x.label),['Front','Back']);
 assert.equal(variantImage(current,current.variants[0]),'assets/whey-white-blue-front.jpg');
 assert.equal(visibleCatalogue([current])[0].variants[0].pricePaise,499900);
 assert.deepEqual(variantImages(current,{...current.variants[1],image:'assets/potency-whey.png',images:['assets/potency-whey.png']}),[]);
});
