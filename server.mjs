import http from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {signatureMatches,quote,customerValid} from './lib.mjs';
const root=resolve('public'),products=JSON.parse(readFileSync('data/products.json')),store=JSON.parse(readFileSync('data/store.json'));
const dir=resolve(process.env.DATA_DIR||'runtime');mkdirSync(dir,{recursive:true,mode:0o700});
const db=new DatabaseSync(resolve(dir,'orders.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, token TEXT NOT NULL, provider_id TEXT UNIQUE, payment_id TEXT UNIQUE, status TEXT NOT NULL, payload TEXT NOT NULL, created TEXT NOT NULL);');
const origin=process.env.PUBLIC_ORIGIN||'http://localhost:3000';
const enabled=()=>process.env.PAYMENTS_ENABLED==='true'&&process.env.POLICIES_APPROVED==='true'&&!!store.address&&!!store.supportEmail&&!!process.env.RAZORPAY_KEY_ID&&!!process.env.RAZORPAY_KEY_SECRET&&!!process.env.RAZORPAY_WEBHOOK_SECRET&&Number.isSafeInteger(store.shippingPaise);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const limits=new Map();function rate(ip){const now=Date.now();if(limits.size>10000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);let v=limits.get(ip);if(!v||v.until<now){v={count:0,until:now+60000};limits.set(ip,v);}return ++v.count<=30;}
async function body(req){let out='';for await(const chunk of req){out+=chunk;if(out.length>65536)throw Error('Request too large.');}return out;}
async function razor(path,data){const r=await fetch('https://api.razorpay.com/v1/'+path,{method:data?'POST':'GET',headers:{Authorization:'Basic '+Buffer.from(process.env.RAZORPAY_KEY_ID+':'+process.env.RAZORPAY_KEY_SECRET).toString('base64'),'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('The payment provider is unavailable. Please contact the store before retrying.');return r.json();}
function fulfil(row,payment){const order=JSON.parse(row.payload);if(payment.order_id!==row.provider_id||payment.amount!==order.totalPaise||payment.currency!=='INR'||payment.status!=='captured')throw Error('Payment is not yet captured and verified. Contact support with your order reference.');db.prepare("UPDATE orders SET status='paid',payment_id=? WHERE id=? AND status!='paid'").run(payment.id,row.id);return {id:row.id,status:'paid',totalPaise:order.totalPaise,lines:order.lines};}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');const u=new URL(req.url,'http://localhost');try{
if(u.pathname.startsWith('/api/')){
if(!rate(req.socket.remoteAddress))return json(res,429,{error:'Please try again in a minute.'});
if(req.method==='POST'&&u.pathname!=='/api/webhook'&&req.headers.origin!==origin)return json(res,403,{error:'Request origin not allowed.'});
if(u.pathname==='/api/catalog'&&req.method==='GET')return json(res,200,{products,store:{...store},paymentReady:!!enabled()});
if(u.pathname==='/api/checkout'&&req.method==='POST'){
if(!enabled())return json(res,503,{error:'Online checkout is awaiting store activation. No payment has been taken.'});
const b=JSON.parse(await body(req));if(!customerValid(b.customer,store.serviceStates)||b.acceptedTerms!==true)return json(res,400,{error:'Complete your delivery details and accept the store policies.'});
const id='MV-'+randomUUID().slice(0,18),token=randomUUID();let order;
db.exec('BEGIN IMMEDIATE');try {
const available=structuredClone(products);
for(const existing of db.prepare("SELECT payload FROM orders WHERE status IN ('preparing','pending','paid','provider_review')").all())for(const line of JSON.parse(existing.payload).lines){for(const p of available){const v=p.variants.find(v=>v.id===line.variantId);if(v&&Number.isSafeInteger(v.stock))v.stock-=line.quantity;}}
order=quote(b.items,available,store.shippingPaise);
db.prepare('INSERT INTO orders VALUES(?,?,?,?,?,?,?)').run(id,token,null,null,'preparing',JSON.stringify({...order,customer:b.customer}),new Date().toISOString());
db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
let remote;try{remote=await razor('orders',{amount:order.totalPaise,currency:'INR',receipt:id,notes:{reference:id}});if(remote.amount!==order.totalPaise||remote.currency!=='INR')throw Error('Payment order mismatch.');db.prepare("UPDATE orders SET provider_id=?,status='pending' WHERE id=?").run(remote.id,id);}catch(e){db.prepare("UPDATE orders SET status='provider_review' WHERE id=?").run(id);throw e;}
return json(res,200,{id,token,key:process.env.RAZORPAY_KEY_ID,providerOrderId:remote.id,amount:order.totalPaise,currency:'INR'});}
if(u.pathname==='/api/verify'&&req.method==='POST'){
const b=JSON.parse(await body(req));const row=db.prepare('SELECT * FROM orders WHERE id=? AND token=?').get(String(b.id),String(b.token));if(!row)return json(res,404,{error:'Order not found.'});
if(b.razorpay_order_id!==row.provider_id||!signatureMatches(row.provider_id+'|'+b.razorpay_payment_id,b.razorpay_signature,process.env.RAZORPAY_KEY_SECRET))return json(res,400,{error:'Payment verification failed. Contact support.'});
if(!/^pay_[A-Za-z0-9]+$/.test(b.razorpay_payment_id))throw Error('Invalid payment reference.');return json(res,200,fulfil(row,await razor('payments/'+b.razorpay_payment_id)));}
if(u.pathname==='/api/webhook'&&req.method==='POST'){
const raw=await body(req);if(!signatureMatches(raw,req.headers['x-razorpay-signature'],process.env.RAZORPAY_WEBHOOK_SECRET))return json(res,400,{error:'Invalid signature.'});const b=JSON.parse(raw),p=b.payload?.payment?.entity;
if((b.event==='payment.captured'||b.event==='order.paid')&&p){const row=db.prepare('SELECT * FROM orders WHERE provider_id=?').get(p.order_id);if(row)fulfil(row,p);}return json(res,200,{received:true});}
if(u.pathname==='/api/order-status'&&req.method==='POST'){
const b=JSON.parse(await body(req)),row=db.prepare('SELECT * FROM orders WHERE id=? AND token=?').get(String(b.id),String(b.token));if(!row)return json(res,404,{error:'Order not found.'});const p=JSON.parse(row.payload);return json(res,200,{id:row.id,status:row.status,totalPaise:p.totalPaise,lines:p.lines});}
return json(res,404,{error:'Endpoint not found.'});}
if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'Method not allowed.'});
const path=resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!path.startsWith(root+'/'))return json(res,403,{error:'Forbidden'});let file;try{file=readFileSync(path);}catch{return json(res,404,{error:'Page not found.'});}const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain','.xml':'application/xml'};res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:file);
}catch(e){json(res,400,{error:e instanceof SyntaxError?'Invalid request.':e.message});}});
const portArg=process.argv.indexOf('--port');
server.listen(Number(portArg>=0?process.argv[portArg+1]:process.env.PORT)||3000,'0.0.0.0',()=>console.log('Store running at '+origin));
