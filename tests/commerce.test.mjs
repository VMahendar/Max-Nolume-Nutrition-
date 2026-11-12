import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {passwordHash,passwordMatches,taxQuote,openCommerce} from '../commerce.mjs';
import {shipmentPayload} from '../integrations.mjs';
import {quote} from '../lib.mjs';

test('password hashes are salted and enforce password bounds',async()=>{const a=await passwordHash('strong-test-password'),b=await passwordHash('strong-test-password');assert.notEqual(a,b);assert.equal(await passwordMatches('strong-test-password',a),true);assert.equal(await passwordMatches('wrong',a),false);await assert.rejects(passwordHash('short'));await assert.rejects(passwordHash('x'.repeat(129)));});
const products=[{name:'Product',hsn:'21069099',gstRateBps:1800,variants:[{id:'a',label:'Pack',pricePaise:11800,stock:10}]}];
const config={enabled:true,approved:true,sellerStateCode:'33',sellerGstin:'33AAAAA0000A1Z5',legalName:'Test seller',address:'Business address',shippingRateBps:1800,invoicePrefix:'MV'};
test('GST is extracted from existing inclusive prices without increasing customer totals',()=>{const base=quote([{variantId:'a',quantity:2}],products,1180);const result=taxQuote(base,products,{state:'Tamil Nadu'},config);assert.equal(result.totalPaise,24780);assert.equal(result.lines[0].taxablePaise,20000);assert.equal(result.tax.totalPaise,3780);assert.equal(result.tax.cgstPaise,1890);assert.equal(result.tax.sgstPaise,1890);assert.equal(result.tax.igstPaise,0);});
test('interstate GST uses IGST; unapproved and incomplete tax configuration is blocked',()=>{const q=quote([{variantId:'a',quantity:1}],products,0);const result=taxQuote(q,products,{state:'Karnataka'},config);assert.equal(result.tax.igstPaise,1800);assert.equal(result.tax.cgstPaise,0);assert.throws(()=>taxQuote(q,products,{state:'Tamil Nadu'},{...config,approved:false}));assert.throws(()=>taxQuote(q,[{...products[0],hsn:null}],{state:'Tamil Nadu'},config));assert.equal(taxQuote(q,products,{}, {enabled:false}).totalPaise,q.totalPaise);});
test('shipping uses authoritative paid-order lines and validates package dimensions',()=>{const row={id:'MV-test',created:'2026-11-01T00:00:00Z',payload:JSON.stringify({customer:{name:'Test',address:'Street',city:'Chennai',pincode:'600001',state:'Tamil Nadu',email:'x@example.com',phone:'9876543210'},lines:[{name:'Product',variant:'Pack',variantId:'a',quantity:2,unitPaise:11800}],subtotalPaise:23600,shippingPaise:500})};const p=shipmentPayload(row,{weight:1,length:10,breadth:10,height:10});assert.equal(p.payment_method,'Prepaid');assert.equal(p.order_items[0].selling_price,118);assert.equal(p.order_id,'MV-test');assert.throws(()=>shipmentPayload(row,{weight:-1,length:10,breadth:10,height:10}));});

test('legacy MRP references preserve explicit overrides, selling prices and stock',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-mrp-reference-'));const C=openCommerce(dir);
 try{
  const p=C.catalogue(null,true).find(p=>p.id==='pro-creatine');
  delete p.variants[0].mrpPaise;p.variants[1].mrpPaise=null;
  C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  C.db.prepare('UPDATE inventory SET on_hand=7 WHERE variant_id=?').run(p.variants[0].id);
  const visible=C.catalogue(null).find(p=>p.id==='pro-creatine');
  assert.equal(visible.variants[0].mrpPaise,149900);assert.equal(visible.variants[0].pricePaise,89900);assert.equal(visible.variants[0].stock,7);assert.equal(visible.variants[1].mrpPaise,null);
 }finally{C.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('approved 5 kg image replaces legacy references while retaining stock, prices and custom pack images',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-mass-photo-')),C=openCommerce(dir);
 try{
  const p=C.catalogue(null,true).find(p=>p.id==='nitro-mass'),old='assets/nitro-mass-5kg.jpg',approved='assets/Screenshot_2026_1103_003852.jpg';
  p.image=old;p.variants.find(v=>v.id==='mass-5kg').image=old;
  const legacyJar=p.variants.find(v=>v.id==='mass-3kg');legacyJar.label='3 kg · Pack to confirm';legacyJar.image=approved;
  C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  C.db.prepare('UPDATE inventory SET on_hand=7 WHERE variant_id=?').run('mass-5kg');
  const updated=C.catalogue(null).find(p=>p.id==='nitro-mass');
  assert.equal(updated.image,approved);assert.equal(updated.variants[0].image,approved);assert.equal(updated.variants[0].pricePaise,349900);assert.equal(updated.variants[0].stock,7);assert.equal(updated.variants[1].image,null);assert.equal(updated.variants[1].label,'3 kg · Double Rich Chocolate');
  p.image='assets/custom.jpg';p.variants[0].image='assets/custom-pack.jpg';C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  const custom=C.catalogue(null).find(p=>p.id==='nitro-mass');assert.equal(custom.image,'assets/custom.jpg');assert.equal(custom.variants[0].image,'assets/custom-pack.jpg');
  assert.equal(C.db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
 }finally{C.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('retired Whey imagery is hidden without changing prices, stock or custom images',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-whey-photo-')),C=openCommerce(dir),source=null;
 try{
  const p=C.catalogue(null,true).find(p=>p.id==='potency-whey');
  p.image='assets/potency-whey.png';p.variants[0].image='assets/potency-whey.png';
  C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  C.db.prepare('UPDATE inventory SET on_hand=7 WHERE variant_id=?').run('whey-chocolate');
  const updated=C.catalogue(null).find(p=>p.id==='potency-whey');
  assert.equal(updated.image,source);assert.equal(updated.variants[0].image,source);assert.equal(updated.variants[0].pricePaise,550000);assert.equal(updated.variants[0].stock,7);assert.equal(updated.variants[0].mrpPaise,859900);
  p.image='https://unicornproseries.com/wp-content/uploads/2026/05/Potency-Whey-600x501-1.png';
  p.variants[0].image=p.image;
  C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  const retired=C.catalogue(null).find(p=>p.id==='potency-whey');
  assert.equal(retired.image,null);assert.equal(retired.variants[0].image,null);
  p.image='assets/custom.jpg';p.variants[0].image='assets/custom-pack.jpg';C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  const custom=C.catalogue(null).find(p=>p.id==='potency-whey');assert.equal(custom.image,'assets/custom.jpg');assert.equal(custom.variants[0].image,'assets/custom-pack.jpg');
  p.image=null;p.variants[0].image=null;C.db.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(p),p.id);
  const hidden=C.catalogue(null).find(p=>p.id==='potency-whey');assert.equal(hidden.image,null);assert.equal(hidden.variants[0].image,null);
  assert.equal(C.db.prepare('SELECT COUNT(*) n FROM orders').get().n,0);
 }finally{C.db.close();rmSync(dir,{recursive:true,force:true});}
});
