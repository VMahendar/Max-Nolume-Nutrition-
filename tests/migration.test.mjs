import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {resolve} from 'node:path';import {DatabaseSync} from 'node:sqlite';import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
test('legacy paid orders survive migration and reduce seeded physical stock once',()=>{const dir=mkdtempSync(resolve(tmpdir(),'mvn-migrate-'));try{mkdirSync(resolve(dir,'data'));mkdirSync(resolve(dir,'runtime'));writeFileSync(resolve(dir,'data/products.json'),JSON.stringify([{id:'p',name:'Product',variants:[{id:'a',pricePaise:10000,stock:10}]}]));writeFileSync(resolve(dir,'data/store.json'),'{}');const db=new DatabaseSync(resolve(dir,'runtime/orders.sqlite'));db.exec('CREATE TABLE orders(id TEXT PRIMARY KEY,token TEXT NOT NULL,provider_id TEXT UNIQUE,payment_id TEXT UNIQUE,status TEXT NOT NULL,payload TEXT NOT NULL,created TEXT NOT NULL)');db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?)').run('legacy','token','order_old','pay_old','paid',JSON.stringify({lines:[{variantId:'a',quantity:2}],totalPaise:20000}),new Date().toISOString());db.close();const module=pathToFileURL(resolve('commerce.mjs')).href;const code=`import {openCommerce} from ${JSON.stringify(module)};for(let i=0;i<2;i++){const c=openCommerce('runtime');if(c.db.prepare("SELECT on_hand FROM inventory WHERE variant_id='a'").get().on_hand!==8)throw Error('Double deduction');if(c.db.prepare("SELECT status FROM orders WHERE id='legacy'").get().status!=='paid')throw Error('Order lost');c.db.close();}`;execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:dir,stdio:'pipe'});}finally{rmSync(dir,{recursive:true,force:true});}});
test('approved retail prices and variants remain intact in both seed and static catalogue',async()=>{const {readFileSync}=await import('node:fs');const products=JSON.parse(readFileSync('data/products.json')),publicProducts=JSON.parse(readFileSync('public/catalog.json'));assert.deepEqual(publicProducts,products.map(p=>({...p,variants:p.variants.map(({prices,...variant})=>variant)})),'static public catalogue must exclude all private wholesale and gym rates');const prices=Object.fromEntries(products.flatMap(p=>p.variants.map(v=>[v.id,v.pricePaise])));assert.deepEqual(prices,{'whey-chocolate':550000,'whey-coffee':550000,'mass-5kg':349900,'mass-3kg':259900,'creatine-blueberry':89900,'creatine-cranberry':89900,'pre-watermelon':139900,'musclevite-pack':69900});});
test('production refuses HTTP origins and unapproved live payments before opening a listener',()=>{const dir=mkdtempSync(resolve(tmpdir(),'mvn-prod-'));try{mkdirSync(resolve(dir,'data'));mkdirSync(resolve(dir,'public'));writeFileSync(resolve(dir,'data/products.json'),'[]');writeFileSync(resolve(dir,'data/store.json'),'{}');for(const env of [{PUBLIC_ORIGIN:'http://store.example.com'},{PUBLIC_ORIGIN:'https://store.example.com',PAYMENTS_ENABLED:'true',PAYMENT_MODE:'live',LIVE_PAYMENTS_APPROVED:'false'}])assert.throws(()=>execFileSync(process.execPath,[resolve('server.mjs')],{cwd:dir,env:{...process.env,NODE_ENV:'production',DATA_DIR:resolve(dir,'runtime'),...env},stdio:'pipe'}),e=>e.stderr.toString().includes('Production requires HTTPS and explicit approval'));}finally{rmSync(dir,{recursive:true,force:true});}});
test('online backup produces a restorable private SQLite database',()=>{const dir=mkdtempSync(resolve(tmpdir(),'mvn-backup-'));try{const db=new DatabaseSync(resolve(dir,'orders.sqlite'));db.exec("PRAGMA journal_mode=WAL; CREATE TABLE sample(value TEXT); INSERT INTO sample VALUES('preserved');");const destination=resolve(dir,'backup/orders.sqlite');execFileSync(process.execPath,[resolve('deploy/backup.mjs'),destination],{env:{...process.env,DATA_DIR:dir},stdio:'pipe'});const restored=new DatabaseSync(destination,{readOnly:true});assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(restored.prepare('SELECT value FROM sample').get().value,'preserved');restored.close();db.close();}finally{rmSync(dir,{recursive:true,force:true});}});

test('Codex and live Render storefront use identical shopping scripts, styling and product layout',()=>{
 for(const file of ['app.js','style.css','premium.css']){
  assert.equal(readFileSync(file,'utf8'),readFileSync('public/'+file,'utf8'),file+' must not diverge between storefront versions');
 }
 const publicHTML=readFileSync('public/index.html','utf8');
 const rootHTML=readFileSync('index.html','utf8').replaceAll('href="https://max-volume-nutrition-preview.onrender.com/account.html"','href="account.html"').replaceAll('href="https://max-volume-nutrition-preview.onrender.com/dealer.html"','href="dealer.html"');
 assert.equal(rootHTML,publicHTML,'layout and visible catalogue must be the same on Codex and Render');
 assert.match(publicHTML,/id="floatingCart"/);
 assert.match(publicHTML,/id="grid" class="grid"/);
});


test('retail Whey price migration upgrades stored ₹4,999 but preserves custom and wholesale prices',async()=>{
 const {openCommerce}=await import('../commerce.mjs');
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-whey-retail-price-'));
 let c;
 try{
  c=openCommerce(dir);
  const row=c.db.prepare("SELECT data FROM products WHERE id='potency-whey'").get();
  const p=JSON.parse(row.data);
  p.variants.find(v=>v.id==='whey-chocolate').pricePaise=499900;
  p.variants.find(v=>v.id==='whey-coffee').pricePaise=530000;
  const wholesale=p.variants.map(v=>v.prices.wholesale);
  c.db.prepare("UPDATE products SET data=? WHERE id='potency-whey'").run(JSON.stringify(p));
  c.db.prepare("DELETE FROM settings WHERE key='retail-whey-5500-nov2026'").run();
  c.db.close();
  c=openCommerce(dir);
  let current=c.catalogue(null,true).find(p=>p.id==='potency-whey');
  assert.deepEqual(current.variants.map(v=>v.pricePaise),[550000,530000]);
  assert.deepEqual(current.variants.map(v=>v.prices.wholesale),wholesale);
  assert.equal(c.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='retail.price.update'").get().n,1);
  c.db.close();
  c=openCommerce(dir);
  current=c.catalogue(null,true).find(p=>p.id==='potency-whey');
  assert.deepEqual(current.variants.map(v=>v.pricePaise),[550000,530000]);
  assert.equal(c.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='retail.price.update'").get().n,1);
 }finally{try{c?.db.close()}finally{rmSync(dir,{recursive:true,force:true})}}
});


test('Whey retail migration updates old price but respects owner overrides',async()=>{
 const {openCommerce}=await import('../commerce.mjs');
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-whey-price-'));
 let c;
 try{
  c=openCommerce(dir);
  const original=JSON.parse(c.db.prepare("SELECT data FROM products WHERE id='potency-whey'").get().data);
  original.variants[0].pricePaise=499900;
  original.variants[1].pricePaise=530000;
  c.db.prepare("UPDATE products SET data=? WHERE id='potency-whey'").run(JSON.stringify(original));
  c.db.prepare("DELETE FROM settings WHERE key='retail-whey-5500-nov2026'").run();
  c.db.close();
  c=openCommerce(dir);
  let product=c.catalogue(null,true).find(p=>p.id==='potency-whey');
  assert.deepEqual(product.variants.map(v=>v.pricePaise),[550000,530000]);
  assert.deepEqual(product.variants.map(v=>v.prices.wholesale),[385000,385000]);
  c.db.close();
  c=openCommerce(dir);
  product=c.catalogue(null,true).find(p=>p.id==='potency-whey');
  assert.deepEqual(product.variants.map(v=>v.pricePaise),[550000,530000]);
 }finally{try{c?.db.close()}finally{rmSync(dir,{recursive:true,force:true})}}
});
