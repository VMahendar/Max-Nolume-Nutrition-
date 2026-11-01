import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {resolve} from 'node:path';import {spawn} from 'node:child_process';import {createHmac} from 'node:crypto';
test('HTTP checkout reserves inventory, verifies payment, and accepts duplicate webhooks',async()=>{
const dir=mkdtempSync(resolve(tmpdir(),'mvn-test-'));mkdirSync(resolve(dir,'data'));mkdirSync(resolve(dir,'public'));
writeFileSync(resolve(dir,'data/products.json'),JSON.stringify([{name:'Test Product',variants:[{id:'a',label:'Chocolate',pricePaise:10000,stock:1}]}]));
writeFileSync(resolve(dir,'data/store.json'),JSON.stringify({address:'Test business address',supportEmail:'test@example.com',serviceStates:['Tamil Nadu'],shippingPaise:500}));
const port=34871,origin='http://localhost:'+port;
const child=spawn(process.execPath,['--import',resolve('tests/mock-provider.mjs'),resolve('server.mjs')],{cwd:dir,env:{...process.env,PORT:String(port),PUBLIC_ORIGIN:origin,PAYMENTS_ENABLED:'true',POLICIES_APPROVED:'true',RAZORPAY_KEY_ID:'test',RAZORPAY_KEY_SECRET:'fixture-secret',RAZORPAY_WEBHOOK_SECRET:'fixture-webhook',DATA_DIR:resolve(dir,'runtime')},stdio:['ignore','pipe','pipe']});
try{await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Server startup timeout')),5000);child.stdout.once('data',()=>{clearTimeout(timer);ok();});child.once('exit',()=>no(Error('Server exited')));});
const post=async(path,body,headers={})=>{const r=await fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:typeof body==='string'?body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
const customer={name:'Test Customer',phone:'9876543210',email:'test@example.com',address:'12 Test Street',city:'Chennai',pincode:'603103',state:'Tamil Nadu'};
const payload={items:[{variantId:'a',quantity:1,pricePaise:1}],customer,acceptedTerms:true};
assert.equal((await post('/api/checkout',payload,{Origin:'https://wrong.example'})).status,403);
const created=await post('/api/checkout',payload);assert.equal(created.status,200,JSON.stringify(created.body));assert.equal(created.body.amount,10500);assert.equal((await post('/api/checkout',payload)).status,400);
const ref={id:created.body.id,token:created.body.token};
assert.equal((await post('/api/verify',{...ref,razorpay_order_id:'order_fixture',razorpay_payment_id:'pay_fixture',razorpay_signature:'0'.repeat(64)})).status,400);
const sig=createHmac('sha256','fixture-secret').update('order_fixture|pay_fixture').digest('hex');const verified=await post('/api/verify',{...ref,razorpay_order_id:'order_fixture',razorpay_payment_id:'pay_fixture',razorpay_signature:sig});assert.equal(verified.body.status,'paid');
const event=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_fixture',order_id:'order_fixture',amount:10500,currency:'INR',status:'captured'}}}});const wh=createHmac('sha256','fixture-webhook').update(event).digest('hex');
for(let i=0;i<2;i++)assert.equal((await post('/api/webhook',event,{'x-razorpay-signature':wh})).status,200);
assert.equal((await post('/api/order-status',ref)).body.status,'paid');assert.equal((await post('/api/order-status',{...ref,token:'wrong'})).status,404);
}finally{child.kill();await new Promise(r=>child.once('exit',r));rmSync(dir,{recursive:true,force:true});}
});
