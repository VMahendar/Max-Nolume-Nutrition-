import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {resolve} from 'node:path';import {spawn} from 'node:child_process';import {DatabaseSync} from 'node:sqlite';import {createHmac,randomUUID} from 'node:crypto';
const customer={name:'Test Customer',phone:'9876543210',email:'customer@example.com',address:'12 Test Street',city:'Chennai',pincode:'600001',state:'Tamil Nadu'};
async function fixture(extraEnv={}){const dir=mkdtempSync(resolve(tmpdir(),'mvn-ops-'));mkdirSync(resolve(dir,'data'));mkdirSync(resolve(dir,'public'));writeFileSync(resolve(dir,'public/index.html'),'Store fixture');writeFileSync(resolve(dir,'data/products.json'),JSON.stringify([{id:'product',name:'Product',category:'Protein',subtitle:'Test pack',description:'Test description',hsn:'21069099',gstRateBps:1800,variants:[{id:'a',label:'Pack',pricePaise:10000,prices:{gym:9000,wholesale:8000},stock:10}]}]));writeFileSync(resolve(dir,'data/store.json'),JSON.stringify({address:'Business address',supportEmail:'store@example.com',serviceStates:['Tamil Nadu'],shippingPaise:500}));const port=35000+Math.floor(Math.random()*10000),origin='http://localhost:'+port;const child=spawn(process.execPath,['--import',resolve('tests/mock-provider.mjs'),resolve('server.mjs')],{cwd:dir,env:{...process.env,PORT:String(port),PUBLIC_ORIGIN:origin,PAYMENTS_ENABLED:'true',RAZORPAY_TESTED:'true',POLICIES_APPROVED:'true',RAZORPAY_KEY_ID:'rzp_test_fixture',RAZORPAY_KEY_SECRET:'fixture-secret',RAZORPAY_WEBHOOK_SECRET:'fixture-webhook',DATA_DIR:resolve(dir,'runtime'),...extraEnv},stdio:['ignore','pipe','pipe']});let stderr='';child.stderr.on('data',x=>stderr+=x);await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Startup timeout '+stderr)),5000);child.stdout.once('data',()=>{clearTimeout(timer);ok();});child.once('exit',()=>{clearTimeout(timer);no(Error('Server exited '+stderr));});});const db=new DatabaseSync(resolve(dir,'runtime/orders.sqlite'));
const client=()=>{let cookie='';return async(path,body,headers={})=>{const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:r.status,body:await r.json(),headers:r.headers};};};return {dir,db,client,async close(){db.close();if(child.exitCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}rmSync(dir,{recursive:true,force:true});}};}
const password='correct-horse-test-password';
test('accounts isolate orders; dealer approval controls pricing; admin endpoints reject customers',async()=>{const f=await fixture();try{const a=f.client(),b=f.client(),admin=f.client();assert.equal((await a('/api/me/orders')).status,401);assert.equal((await a('/api/register',{name:'Customer',email:customer.email,password,role:'admin'})).status,200);assert.equal((await a('/api/session')).body.user.role,'customer');assert.equal((await a('/api/admin/overview')).status,403);assert.equal((await a('/api/dealer',{kind:'gym',business:'Test Gym',gstin:''})).status,200);assert.equal((await a('/api/catalog')).body.tier,'retail');assert.equal((await a('/api/catalog')).body.products[0].variants[0].prices,undefined);
await admin('/api/register',{name:'Admin',email:'admin@example.com',password});f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();const userId=(await a('/api/session')).body.user.id;assert.equal((await admin('/api/admin/dealer',{userId,status:'approved'})).status,200);assert.equal((await a('/api/catalog')).body.products[0].variants[0].pricePaise,9000);f.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(userId);assert.equal((await a('/api/admin/overview')).body.products[0].variants[0].pricePaise,10000);f.db.prepare("UPDATE users SET role='customer' WHERE id=?").run(userId);
await b('/api/register',{name:'Other',email:'other@example.com',password});const created=await a('/api/checkout',{items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true},{'Idempotency-Key':randomUUID()});assert.equal(created.status,200,JSON.stringify(created.body));assert.equal(created.body.amount,9500);assert.equal((await a('/api/me/orders')).body.orders.length,1);assert.equal((await b('/api/me/orders')).body.orders.length,0);assert.equal((await b('/api/order-status',{id:created.body.id})).status,404);assert.equal((await a('/api/order-status',{id:created.body.id})).status,200);assert.equal((await b('/api/invoice',{id:created.body.id})).status,404);
assert.equal((await a('/api/password',{currentPassword:'wrong',password:'another-strong-password'})).status,401);assert.equal((await a('/api/password',{currentPassword:password,password:'another-strong-password'})).status,200);assert.equal((await a('/api/session')).body.user,null);assert.equal((await a('/api/login',{email:customer.email,password})).status,401);assert.equal((await a('/api/login',{email:customer.email,password:'another-strong-password'})).status,200);await a('/api/logout',{});assert.equal((await a('/api/session')).body.user,null);
}finally{await f.close();}});
test('idempotent checkout holds stock once; paid webhooks deduct once; inventory edits reject stale and reserved stock',async()=>{const f=await fixture();try{const a=f.client();const payload={items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true},headers={'Idempotency-Key':randomUUID()};const results=await Promise.all([a('/api/checkout',payload,headers),a('/api/checkout',payload,headers)]);const created=results.find(x=>x.status===200);assert.ok(created,JSON.stringify(results));const repeat=await a('/api/checkout',payload,headers);assert.equal(repeat.body.id,created.body.id);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,1);assert.equal((await a('/api/catalog')).body.products[0].variants[0].stock,9);assert.equal((await a('/api/checkout',{...payload,items:[{variantId:'a',quantity:2}]},headers)).status,409);
const admin=f.client();await admin('/api/register',{name:'Admin',email:'admin@example.com',password});f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();assert.equal((await admin('/api/admin/inventory',{variantId:'a',onHand:0,version:0,reason:'count'})).status,409);assert.equal((await admin('/api/admin/inventory',{variantId:'a',onHand:12,version:0,reason:'restock'})).status,200);assert.equal((await admin('/api/admin/inventory',{variantId:'a',onHand:20,version:0,reason:'stale'})).status,409);
const event=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_fixture',order_id:'order_fixture',amount:10500,currency:'INR',status:'captured'}}}});assert.equal((await a('/api/webhook',event,{'x-razorpay-signature':'bad'})).status,400);const badEvent=event.replace('10500','1'),badSig=createHmac('sha256','fixture-webhook').update(badEvent).digest('hex');assert.equal((await a('/api/webhook',badEvent,{'x-razorpay-signature':badSig})).status,400);const sig=createHmac('sha256','fixture-webhook').update(event).digest('hex');for(let i=0;i<2;i++)assert.equal((await a('/api/webhook',event,{'x-razorpay-signature':sig})).status,200);assert.equal(f.db.prepare("SELECT on_hand FROM inventory WHERE variant_id='a'").get().on_hand,11);assert.equal((await a('/api/catalog')).body.products[0].variants[0].stock,11);
assert.equal((await admin('/api/admin/fulfilment',{id:created.body.id,status:'delivered'})).status,409);assert.equal((await admin('/api/admin/fulfilment',{id:created.body.id,status:'processing'})).status,200);assert.equal((await admin('/api/admin/fulfilment',{id:created.body.id,status:'shipped',tracking:'AWB123'})).status,200);assert.equal((await admin('/api/admin/fulfilment',{id:created.body.id,status:'delivered'})).status,200);assert.equal((await admin('/api/admin/shipment',{id:created.body.id,weight:1,length:10,breadth:10,height:10})).status,503);
assert.equal((await a('/api/checkout',payload,headers)).status,409);
}finally{await f.close();}});
test('security gates reject cross-origin, private files, invalid products, unapproved tax and missing tier prices',async()=>{const f=await fixture();try{const a=f.client();assert.equal((await a('/api/register',{name:'User',email:customer.email,password},{Origin:'https://evil.example'})).status,403);await a('/api/register',{name:'Admin',email:customer.email,password});f.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(customer.email);const overview=(await a('/api/admin/overview')).body;const p=overview.products[0];assert.equal((await a('/api/admin/product',{...p,image:'javascript:alert(1)'})).status,400);assert.equal((await a('/api/admin/product',{...p,variants:[]})).status,400);assert.equal((await a('/api/admin/tax',{enabled:true,approved:false,sellerStateCode:'33',sellerGstin:'',legalName:'',address:'',shippingRateBps:0,invoicePrefix:'MV'})).status,400);assert.equal((await a('/api/admin/store',{address:'Business address',supportEmail:'store@example.com',shippingPaise:0,serviceStates:['Unknown']})).status,400);
const c=f.client();await c('/api/register',{name:'Customer',email:'other@example.com',password});await c('/api/dealer',{kind:'wholesale',business:'Wholesale',gstin:''});const userId=(await c('/api/session')).body.user.id;await a('/api/admin/dealer',{userId,status:'approved'});p.variants[0].prices={};assert.equal((await a('/api/admin/product',p)).status,200);assert.equal((await c('/api/catalog')).body.products[0].variants[0].pricePaise,null);assert.equal((await c('/api/checkout',{items:[{variantId:'a',quantity:1}],customer:{...customer,email:'other@example.com'},acceptedTerms:true})).status,400);
assert.equal((await a('/runtime/orders.sqlite')).status,404);assert.equal((await a('/data/products.json')).status,404);assert.equal((await a('/.env')).status,404);assert.equal((await a('/api/session')).headers.get('content-security-policy').includes("object-src 'none'"),true);assert.equal((await a('/api/login',{email:customer.email,password})).headers.get('set-cookie').includes('HttpOnly; SameSite=Strict'),true);
}finally{await f.close();}});
test('concurrent distinct checkouts cannot oversell the last unit',async()=>{const f=await fixture();try{f.db.prepare("UPDATE inventory SET on_hand=1 WHERE variant_id='a'").run();const a=f.client(),p={items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true};const results=await Promise.all([a('/api/checkout',p,{'Idempotency-Key':randomUUID()}),a('/api/checkout',p,{'Idempotency-Key':randomUUID()})]);assert.equal(results.filter(x=>x.status===200).length,1);assert.equal(results.filter(x=>x.status===400).length,1);assert.equal((await a('/api/catalog')).body.products[0].variants[0].stock,0);}finally{await f.close();}});
test('definitive provider rejection releases stock; uncertain provider failure preserves reservation and blocks duplicate creation',async()=>{for(const mode of ['rejected','timeout']){const f=await fixture({FIXTURE_PROVIDER_FAILURE:mode});try{const a=f.client(),p={items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true},headers={'Idempotency-Key':randomUUID()};const result=await a('/api/checkout',p,headers);assert.equal(result.status,mode==='rejected'?502:500);assert.equal((await a('/api/catalog')).body.products[0].variants[0].stock,mode==='rejected'?10:9);assert.equal((await a('/api/checkout',p,headers)).status,409);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,1);}finally{await f.close();}}});
test('GST invoices are issued once on capture and retain the original tax snapshot',async()=>{const f=await fixture();try{const a=f.client();await a('/api/register',{name:'Admin',email:customer.email,password});f.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(customer.email);const tax={enabled:true,approved:true,sellerStateCode:'33',sellerGstin:'33AAAAA0000A1Z5',legalName:'Test Seller',address:'Test Business Address',shippingRateBps:1800,invoicePrefix:'MV'};assert.equal((await a('/api/admin/tax',tax)).status,200);const created=await a('/api/checkout',{items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true});const event=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_fixture',order_id:'order_fixture',amount:10500,currency:'INR',status:'captured'}}}});const badEvent=event.replace('10500','1'),badSig=createHmac('sha256','fixture-webhook').update(badEvent).digest('hex');assert.equal((await a('/api/webhook',badEvent,{'x-razorpay-signature':badSig})).status,400);const sig=createHmac('sha256','fixture-webhook').update(event).digest('hex');for(let i=0;i<2;i++)assert.equal((await a('/api/webhook',event,{'x-razorpay-signature':sig})).status,200);const first=(await a('/api/invoice',{id:created.body.id})).body.invoice;assert.equal(first.totalPaise,10500);assert.equal(first.tax.seller.name,'Test Seller');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM invoices').get().n,1);assert.equal(f.db.prepare('SELECT value FROM counters').get().value,1);await a('/api/admin/tax',{...tax,legalName:'Changed Seller'});assert.deepEqual((await a('/api/invoice',{id:created.body.id})).body.invoice,first);const stranger=f.client();assert.equal((await stranger('/api/invoice',{id:created.body.id})).status,404);assert.equal((await stranger('/api/invoice',{id:created.body.id,token:created.body.token})).status,200);
}finally{await f.close();}});
test('mocked Shiprocket creates one shipment and records tracking; duplicate creation is blocked',async()=>{const f=await fixture({SHIPROCKET_ENABLED:'true',SHIPROCKET_TESTED:'true',SHIPROCKET_EMAIL:'fixture@example.com',SHIPROCKET_PASSWORD:'fixture-only',SHIPROCKET_PICKUP:'Fixture'});try{const a=f.client();await a('/api/register',{name:'Admin',email:customer.email,password});f.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(customer.email);const created=await a('/api/checkout',{items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true});assert.equal((await a('/api/admin/reconcile',{id:created.body.id})).status,200);const payload={id:created.body.id,weight:1,length:10,breadth:10,height:10};assert.equal((await a('/api/admin/shipment',payload)).status,200);assert.equal((await a('/api/admin/shipment',payload)).status,409);assert.equal((await a('/api/admin/tracking',{id:created.body.id})).status,200);assert.equal(f.db.prepare('SELECT COUNT(*) n FROM shipments').get().n,1);assert.equal((await a('/api/admin/shipping-rates',{id:created.body.id,pickupPostcode:'600001',weight:1})).status,200);assert.equal((await a('/api/admin/shipping-operation',{id:created.body.id,operation:'pickup'})).status,409);for(const operation of ['awb','pickup','label','manifest']){assert.equal((await a('/api/admin/shipping-operation',{id:created.body.id,operation})).status,200);assert.equal((await a('/api/admin/shipping-operation',{id:created.body.id,operation})).status,409);}await a('/api/admin/fulfilment',{id:created.body.id,status:'processing'});await a('/api/admin/fulfilment',{id:created.body.id,status:'shipped',tracking:'FIXTURE123'});assert.equal((await a('/api/admin/tracking',{id:created.body.id})).status,200);}finally{await f.close();}});
test('uncertain provider reference is recovered only after receipt and amount verification',async()=>{const f=await fixture({FIXTURE_PROVIDER_FAILURE:'timeout'});try{const a=f.client();await a('/api/register',{name:'Admin',email:customer.email,password});f.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(customer.email);const p={items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true},headers={'Idempotency-Key':randomUUID()};assert.equal((await a('/api/checkout',p,headers)).status,500);const row=f.db.prepare('SELECT * FROM orders').get();assert.equal((await a('/api/admin/recover-order',{id:row.id,providerOrderId:'order_lost'})).status,200);const retry=await a('/api/checkout',p,headers);assert.equal(retry.status,200);assert.equal(retry.body.providerOrderId,'order_lost');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM orders').get().n,1);}finally{await f.close();}});
test('guest order import requires both its secret and matching account email',async()=>{const f=await fixture();try{const guest=f.client(),p={items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true};const created=await guest('/api/checkout',p);const a=f.client();await a('/api/register',{name:'Customer',email:customer.email,password});assert.equal((await a('/api/me/claim-order',{id:created.body.id,token:'wrong'})).status,404);assert.equal((await a('/api/me/orders')).body.orders.length,0);assert.equal((await a('/api/me/claim-order',{id:created.body.id,token:created.body.token})).status,200);assert.equal((await a('/api/me/orders')).body.orders.length,1);const b=f.client();await b('/api/register',{name:'Other',email:'other@example.com',password});assert.equal((await b('/api/me/claim-order',{id:created.body.id,token:created.body.token})).status,404);}finally{await f.close();}});
test('valid-shaped credentials cannot activate integrations without testing flags',async()=>{const f=await fixture({RAZORPAY_TESTED:'false',SHIPROCKET_ENABLED:'true',SHIPROCKET_TESTED:'false',SHIPROCKET_EMAIL:'fixture@example.com',SHIPROCKET_PASSWORD:'fixture-only',SHIPROCKET_PICKUP:'Fixture'});try{const a=f.client();assert.equal((await a('/api/catalog')).body.paymentReady,false);assert.equal((await a('/api/checkout',{items:[{variantId:'a',quantity:1}],customer,acceptedTerms:true})).status,503);await a('/api/register',{name:'Admin',email:customer.email,password});f.db.prepare("UPDATE users SET role='admin' WHERE email=?").run(customer.email);assert.equal((await a('/api/admin/overview')).body.shippingReady,false);assert.equal((await a('/api/admin/shipping-rates',{id:'anything',pickupPostcode:'600001',weight:1})).status,503);}finally{await f.close();}});
test('product brands survive administrator edits without changing retail or trade prices',async()=>{
  const f=await fixture();
  try{
    const admin=f.client(),guest=f.client();
    await admin('/api/register',{name:'Admin',email:'admin@example.com',password});
    f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();
    const p=(await admin('/api/admin/overview')).body.products[0];
    const originalPrices=structuredClone(p.variants);
    assert.equal((await guest('/api/admin/product',{...p,brand:'Unapproved edit'})).status,401);
    assert.equal((await admin('/api/admin/product',{...p,brand:'MuscleTech'})).status,200);
    let publicProduct=(await guest('/api/catalog')).body.products[0];
    assert.equal(publicProduct.brand,'MuscleTech');
    assert.equal(publicProduct.variants[0].pricePaise,10000);
    assert.equal(publicProduct.variants[0].prices,undefined);
    const saved=(await admin('/api/admin/overview')).body.products[0];
    assert.deepEqual(saved.variants.map(v=>({pricePaise:v.pricePaise,prices:v.prices})),originalPrices.map(v=>({pricePaise:v.pricePaise,prices:v.prices})));
    delete saved.brand;
    assert.equal((await admin('/api/admin/product',{...saved,description:'Updated pack information'})).status,200);
    publicProduct=(await guest('/api/catalog')).body.products[0];
    assert.equal(publicProduct.brand,'MuscleTech');
    assert.equal(publicProduct.description,'Updated pack information');
    assert.equal((await admin('/api/admin/product',{...saved,brand:'x'.repeat(101)})).status,400);
  }finally{await f.close();}
});
test('admin MRP edits preserve selling prices, survive omitted fields and reject prices above MRP',async()=>{
 const f=await fixture();try{
  const admin=f.client(),guest=f.client();await admin('/api/register',{name:'Admin',email:'admin@example.com',password});f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();
  let p=(await admin('/api/admin/overview')).body.products[0];p.variants[0].mrpPaise=15000;
  assert.equal((await guest('/api/admin/product',p)).status,401);
  assert.equal((await admin('/api/admin/product',p)).status,200);
  let v=(await guest('/api/catalog')).body.products[0].variants[0];assert.equal(v.mrpPaise,15000);assert.equal(v.pricePaise,10000);assert.equal(v.prices,undefined);
  for(const mrpPaise of [0,-1,9999,15000.5])assert.equal((await admin('/api/admin/product',{...p,variants:[{...p.variants[0],mrpPaise}]})).status,400);
  assert.equal((await admin('/api/admin/product',{...p,variants:[{...p.variants[0],prices:{gym:16000}}]})).status,400);
  p=(await admin('/api/admin/overview')).body.products[0];delete p.variants[0].mrpPaise;
  assert.equal((await admin('/api/admin/product',p)).status,200);assert.equal((await guest('/api/catalog')).body.products[0].variants[0].mrpPaise,15000);
  p.variants[0].mrpPaise=null;assert.equal((await admin('/api/admin/product',p)).status,200);
  v=(await guest('/api/catalog')).body.products[0].variants[0];assert.equal(v.mrpPaise,null);assert.equal(v.pricePaise,10000);
 }finally{await f.close();}
});
test('administrator galleries validate original image sources, preserve omitted photos and leave prices/inventory unchanged',async()=>{
 const f=await fixture();try{
  const admin=f.client(),guest=f.client();await admin('/api/register',{name:'Admin',email:'admin@example.com',password});f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();
  let p=(await admin('/api/admin/overview')).body.products[0];
  p.image='assets/front.jpg';p.images=[{src:'assets/front.jpg',label:'Front',alt:'Front pack'},{src:'assets/back.jpg',label:'Back'}];p.variants[0].images=[{src:'assets/pack-back.jpg',label:'Pack label'}];
  assert.equal((await guest('/api/admin/product',p)).status,401);assert.equal((await admin('/api/admin/product',p)).status,200);
  let saved=(await admin('/api/admin/overview')).body.products[0];assert.deepEqual(saved.images.map(x=>x.src),['assets/front.jpg','assets/back.jpg']);assert.equal(saved.variants[0].images[0].src,'assets/pack-back.jpg');assert.equal(saved.variants[0].pricePaise,10000);assert.equal(saved.variants[0].onHand,10);
  for(const images of [[{src:'javascript:alert(1)'}],Array(21).fill('assets/a.jpg'),[{src:'assets/../private.jpg'}],[null]])assert.equal((await admin('/api/admin/product',{...p,images})).status,400);
  assert.equal((await admin('/api/admin/product',{...p,variants:[{...p.variants[0],images:['https://evil.example/a.jpg']}]})).status,400);
  delete p.images;delete p.variants[0].images;assert.equal((await admin('/api/admin/product',p)).status,200);
  saved=(await guest('/api/catalog')).body.products[0];assert.equal(saved.images.length,2);assert.equal(saved.variants[0].images.length,1);assert.equal(saved.variants[0].pricePaise,10000);assert.equal(saved.variants[0].prices,undefined);
  assert.equal((await admin('/api/admin/product',{...p,images:[],variants:[{...p.variants[0],images:[]}]})).status,200);
  saved=(await guest('/api/catalog')).body.products[0];assert.deepEqual(saved.images,[]);assert.deepEqual(saved.variants[0].images,[]);
 }finally{await f.close();}
});


test('dealer portal rejects anonymous and unapproved users while retail catalogue stays retail after approval',async()=>{
 const f=await fixture();try{
 const guest=f.client(),dealer=f.client(),admin=f.client();
 assert.equal((await guest('/api/dealer/catalog')).status,401);
 assert.equal((await guest('/api/retail/catalog')).body.products[0].variants[0].pricePaise,10000);
 await dealer('/api/register',{name:'Portal Dealer',email:'portal@example.com',password:'portal-password-1234'});
 assert.equal((await dealer('/api/dealer/catalog')).status,403);
 await dealer('/api/dealer',{kind:'wholesale',business:'Portal Store',gstin:''});
 assert.equal((await dealer('/api/dealer/catalog')).status,403);
 await admin('/api/register',{name:'Portal Admin',email:'portal-admin@example.com',password:'portal-password-1234'});
 f.db.prepare("UPDATE users SET role='admin' WHERE email='portal-admin@example.com'").run();
 const userId=(await dealer('/api/session')).body.user.id;
 await admin('/api/admin/dealer',{userId,status:'approved'});
 const privateResult=await dealer('/api/dealer/catalog');
 assert.equal(privateResult.status,200);assert.equal(privateResult.body.products[0].variants[0].pricePaise,8000);
 assert.equal(privateResult.body.products[0].variants[0].prices,undefined);
 const retail=await dealer('/api/retail/catalog');assert.equal(retail.body.tier,'retail');assert.equal(retail.body.products[0].variants[0].pricePaise,10000);
 await dealer('/api/logout',{});assert.equal((await dealer('/api/dealer/catalog')).status,401);
 }finally{await f.close();}
});

test('official hosted pack photos are accepted only from manufacturer image paths and have browser CSP support',async()=>{
 const f=await fixture();try{
  const admin=f.client(),guest=f.client();await admin('/api/register',{name:'Admin',email:'admin@example.com',password});f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();
  const p=(await admin('/api/admin/overview')).body.products[0],source="https://unicornproseries.com/wp-content/uploads/2026/05/Potency-Whey-600x501-1.png";
  for(const src of [source,source.replace('https://','https://www.')]){
   assert.equal((await admin('/api/admin/product',{...p,image:src,images:[{src,label:'Pack photo'}],variants:[{...p.variants[0],image:src,images:[src]}]})).status,200);
   const response=await guest('/api/catalog'),saved=response.body.products[0],policy=response.headers.get('content-security-policy');
   assert.equal(saved.image,src);assert.equal(saved.images[0].src,src);assert.equal(saved.variants[0].images[0].src,src);assert.equal(saved.variants[0].pricePaise,10000);assert.equal(saved.variants[0].stock,10);
   assert.ok(policy.includes("img-src 'self' https://revakanya.com https://unicornproseries.com https://www.unicornproseries.com data:"));
   assert.ok(!policy.includes("connect-src 'self' https://unicornproseries.com"));
  }
  const bad=[
   'http://unicornproseries.com/wp-content/uploads/2026/05/pack.png',
   'https://unicornproseries.com.evil.example/wp-content/uploads/2026/05/pack.png',
   'https://unicornproseries.com@evil.example/wp-content/uploads/2026/05/pack.png',
   'https://unicornproseries.com/private/pack.png',
   'https://unicornproseries.com/wp-content/uploads/2026/05/../pack.png',
   'https://unicornproseries.com/wp-content/uploads/2026/05/%2e%2e/pack.png',
   'https://unicornproseries.com/wp-content/uploads/2026/05/pack.svg',
   source+'?redirect=https://evil.example'
  ];
  for(const src of bad){
   assert.equal((await admin('/api/admin/product',{...p,image:src})).status,400,src);
   assert.equal((await admin('/api/admin/product',{...p,images:[src]})).status,400,src);
  }
 }finally{await f.close();}
});

test('wishlists are account-owned and genuine reviews require authenticated submission and administrator approval',async()=>{
 const f=await fixture();try{
  const guest=f.client(),a=f.client(),b=f.client(),admin=f.client();
  assert.equal((await guest('/api/wishlist')).status,401);
  assert.equal((await guest('/api/wishlist',{ids:['a']})).status,401);
  assert.equal((await guest('/api/reviews',{productId:'product',rating:4,title:'Genuine feedback',body:'This is a detailed customer review.'})).status,401);
  await a('/api/register',{name:'Alice Customer',email:'alice@example.com',password});
  await b('/api/register',{name:'Bob Customer',email:'bob@example.com',password});
  await admin('/api/register',{name:'Admin',email:'admin@example.com',password});
  f.db.prepare("UPDATE users SET role='admin' WHERE email='admin@example.com'").run();
  assert.equal((await a('/api/wishlist',{ids:['a','a'],userId:'someone-else'})).status,200);
  assert.deepEqual((await a('/api/wishlist')).body.ids,['a']);assert.deepEqual((await b('/api/wishlist')).body.ids,[]);
  assert.equal((await b('/api/wishlist',{ids:['unknown']})).status,400);
  const payload={productId:'product',rating:4,title:'My product experience',body:'A real test review with enough detail.'};
  assert.equal((await guest('/api/reviews?productId=product')).body.count,0);
  assert.equal((await a('/api/reviews',{...payload,rating:6})).status,400);
  assert.equal((await a('/api/reviews',{...payload,body:'Short'})).status,400);
  assert.equal((await a('/api/reviews',{...payload,productId:'missing'})).status,404);
  assert.equal((await a('/api/reviews',payload)).body.status,'pending');
  let own=(await a('/api/reviews?productId=product')).body;assert.equal(own.myReview.status,'pending');assert.equal(own.count,0);
  assert.equal((await b('/api/reviews?productId=product')).body.myReview,null);
  assert.equal((await b('/api/admin/review',{id:own.myReview.id,status:'approved'})).status,403);
  assert.equal((await admin('/api/admin/overview')).body.reviews.length,1);
  assert.equal((await admin('/api/admin/review',{id:own.myReview.id,status:'approved'})).status,200);
  let published=(await guest('/api/reviews?productId=product')).body;assert.equal(published.count,1);assert.equal(published.average,4);assert.equal(published.reviews[0].author,'Alice');assert.equal(published.reviews[0].email,undefined);assert.equal(published.reviews[0].user_id,undefined);
  assert.equal((await a('/api/reviews',{...payload,rating:5,title:'Updated experience'})).status,200);
  assert.equal((await guest('/api/reviews?productId=product')).body.count,0);
  assert.equal(f.db.prepare('SELECT COUNT(*) count FROM product_reviews').get().count,1);
  assert.equal((await admin('/api/admin/review',{id:own.myReview.id,status:'approved'})).status,200);
  assert.equal((await guest('/api/reviews?productId=product')).body.average,5);
  const product=(await guest('/api/catalog')).body.products[0];assert.equal(product.variants[0].pricePaise,10000);assert.equal(product.variants[0].stock,10);
 }finally{await f.close();}
});
