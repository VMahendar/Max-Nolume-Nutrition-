import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {openCommerce} from '../commerce.mjs';

test('eight verified retail variants retain published customer prices and private approved dealer tiers',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-launch-prices-'));
 let c;
 try{
  c=openCommerce(dir);
  const guest=c.catalogue(null);
  const variants=guest.flatMap(p=>p.variants);
  assert.equal(variants.length,8);
  const retail={
   'whey-chocolate':499900,'whey-coffee':499900,'mass-5kg':349900,'mass-3kg':259900,
   'creatine-blueberry':89900,'creatine-cranberry':89900,'pre-watermelon':139900,'musclevite-pack':69900
  };
  for(const v of variants){assert.equal(v.pricePaise,retail[v.id],v.id+' retail price');assert.equal(Object.hasOwn(v,'prices'),false,'never expose private rates to guest');}
  for(const [id,kind] of [['gym','gym'],['wholesale','wholesale'],['pending','wholesale']]){
   c.db.prepare('INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)')
    .run(id,id+'@example.test',id,'testing-only','customer','2026-11-05T00:00:00Z');
   c.db.prepare('INSERT INTO dealers(user_id,kind,business,gstin,status,reviewed_by,created) VALUES(?,?,?,?,?,?,?)')
    .run(id,kind,'Test '+id,'',id==='pending'?'pending':'approved',null,'2026-11-05T00:00:00Z');
  }
  const wholesale=Object.fromEntries(c.catalogue({id:'wholesale'}).flatMap(p=>p.variants.map(v=>[v.id,v.pricePaise])));
  const gym=Object.fromEntries(c.catalogue({id:'gym'}).flatMap(p=>p.variants.map(v=>[v.id,v.pricePaise])));
  const pending=Object.fromEntries(c.catalogue({id:'pending'}).flatMap(p=>p.variants.map(v=>[v.id,v.pricePaise])));
  const expected={
   'whey-chocolate':[385000,420000],'whey-coffee':[385000,420000],
   'mass-5kg':[265000,285000],'mass-3kg':[195000,215000],
   'creatine-blueberry':[65000,75000],'creatine-cranberry':[65000,75000],
   'pre-watermelon':[105000,115000],'musclevite-pack':[45000,50000]
  };
  for(const [id,[bulk,studio]]of Object.entries(expected)){
   assert.equal(wholesale[id],bulk,id+' wholesale');
   assert.equal(gym[id],studio,id+' gym');
   assert.equal(pending[id],retail[id],id+' pending dealer still retail');
  }
  // Simulate a database that was seeded before wholesale prices were added.
  const row=c.db.prepare("SELECT data FROM products WHERE id='potency-whey'").get();
  const old=JSON.parse(row.data);
  delete old.variants[0].prices;
  old.variants[1].prices={wholesale:370000}; // Admin override must win.
  c.db.prepare("UPDATE products SET data=? WHERE id='potency-whey'").run(JSON.stringify(old));
  const updated=c.catalogue({id:'wholesale'}).find(p=>p.id==='potency-whey');
  assert.equal(updated.variants[0].pricePaise,385000,'populate missing tier without data migration');
  assert.equal(updated.variants[1].pricePaise,370000,'preserve existing custom wholesale override');
  assert.equal(c.catalogue(null).find(p=>p.id==='potency-whey').variants[1].pricePaise,499900,'retail untouched');
 }finally{try{c?.db.close()}finally{rmSync(dir,{recursive:true,force:true})}}
});

test('public catalogue never uses Cranberry artwork for Blueberry or 5kg bucket for 3kg box',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-launch-media-'));
 let c;
 try{
  c=openCommerce(dir);
  const all=c.catalogue(null),creatine=all.find(p=>p.id==='pro-creatine'),mass=all.find(p=>p.id==='nitro-mass');
  assert.equal(creatine.image,null);
  assert.equal(creatine.variants.find(v=>v.id==='creatine-blueberry').image,null,'250g Blueberry image must not misrepresent the listed 100g SKU');
  assert.equal(creatine.variants.find(v=>v.id==='creatine-cranberry').image,null,'existing Cranberry image is 250g, not verified for 100g');
  assert.equal(mass.variants.find(v=>v.id==='mass-3kg').image,null);
  assert.ok(mass.variants.find(v=>v.id==='mass-5kg').image.includes('Screenshot_2026_1103'));
  const whey=all.find(p=>p.id==='potency-whey'),pre=all.find(p=>p.id==='sturdy-pre');
  assert.equal(whey.variants.find(v=>v.id==='whey-chocolate').image,null,'Chocolate must not borrow the Coffee pack picture');
  assert.equal(whey.variants.find(v=>v.id==='whey-coffee').image,'https://unicornproseries.com/wp-content/uploads/2026/09/Potency-Whey.png');
  assert.equal(pre.variants.find(v=>v.id==='pre-watermelon').image,'https://unicornproseries.com/wp-content/uploads/2026/07/Stuedy-Watermelon.png');
  // Simulate legacy database retaining old generic Cranberry image.
  const old=JSON.parse(c.db.prepare("SELECT data FROM products WHERE id='pro-creatine'").get().data);
  old.image='assets/pro-creatine.png';delete old.variants[0].image;delete old.variants[1].image;
  c.db.prepare("UPDATE products SET data=? WHERE id='pro-creatine'").run(JSON.stringify(old));
  const corrected=c.catalogue(null).find(p=>p.id==='pro-creatine');
  assert.equal(corrected.image,null);
  assert.equal(corrected.variants[0].image,null,'legacy image may not override the confirmed 100g placeholder');
  assert.equal(corrected.variants[1].image,null,'legacy Cranberry image must be held back until 100g photo verified');
 }finally{try{c?.db.close()}finally{rmSync(dir,{recursive:true,force:true})}}
});
