import {startLocalBackupScheduler} from './deploy/local-backups.mjs';
import {startDriveBackupScheduler} from './deploy/drive-backup.mjs';
import http from 'node:http';
import {validateCampaign,activeCampaigns,campaignQuote} from './promotions.mjs';
import {validateUpdate,activeUpdates,updateConfig,initializeUpdates,whatsappUpdateReadiness,validUpdateSignature,receiveWhatsappUpdates} from './store-updates.mjs';
import {initializeOwnerDesk,recordOwnerEntry} from './owner-desk.mjs';
import {initializeOwnerWork,saveOwnerWork,workContext} from './owner-work.mjs';
import {initializeMarketing,marketingReadiness,enqueueMarketing,startMarketingScheduler,verifyUnsubscribe} from './marketing-automation.mjs';
import {stagingGate} from './staging.mjs';
const allowStaging=stagingGate();
import {isIP} from 'node:net';
import {readFileSync,realpathSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {signatureMatches,quote,customerValid} from './lib.mjs';
import {openCommerce,Problem,fail,hash,clean,integer,email,passwordHash,passwordMatches,taxQuote,stateCode} from './commerce.mjs';
import {razor,shippingReady,shiprocketClient,shipmentPayload} from './integrations.mjs';
const root=realpathSync(resolve('public')),C=openCommerce(resolve(process.env.DATA_DIR||'runtime')),db=C.db;
// First-run retail campaign configuration; later admin edits and deactivations win.
const campaignSeed=resolve('data/retail-campaigns.json');
if(C.setting('campaigns')===null&&existsSync(campaignSeed)){
 const campaigns=JSON.parse(readFileSync(campaignSeed,'utf8')).map(validateCampaign);
 C.tx(()=>{C.set('campaigns',campaigns);C.audit('system','campaigns.initialize','campaigns',{count:campaigns.length});});
}
initializeMarketing(C);
initializeUpdates(C);
initializeOwnerDesk(C);
initializeOwnerWork(C);
const origin=process.env.PUBLIC_ORIGIN||'http://localhost:3000',production=process.env.NODE_ENV==='production';
const previousStoreOrigin='https://max-volume-nutrition-preview.onrender.com';
function canonicalStoreOrigin(){
  const configured=process.env.STORE_PUBLIC_URL;
  if(!configured)return previousStoreOrigin;
  let parsed;
  try{parsed=new URL(configured)}catch{throw Error('STORE_PUBLIC_URL must be a valid HTTPS origin.')}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash||!parsed.hostname||parsed.port)
    throw Error('STORE_PUBLIC_URL must be a bare HTTPS domain without path, query, port or credentials.');
  return parsed.origin;
}
const storePublicUrl=canonicalStoreOrigin();
if(production&&(!origin.startsWith('https://')||process.env.PAYMENTS_ENABLED==='true'&&process.env.PAYMENT_MODE==='live'&&process.env.LIVE_PAYMENTS_APPROVED!=='true'))throw Error('Production requires HTTPS and explicit approval for live payments.');
const enabled=()=>{const s=C.setting('store');const key=process.env.RAZORPAY_KEY_ID||'';return process.env.STAGING_MODE!=='true'&&process.env.PAYMENTS_ENABLED==='true'&&process.env.POLICIES_APPROVED==='true'&&process.env.RAZORPAY_TESTED==='true'&&(process.env.PAYMENT_MODE==='live'?process.env.LIVE_PAYMENTS_APPROVED==='true'&&key.startsWith('rzp_live_'):key.startsWith('rzp_test_'))&&!!s.address&&!!s.supportEmail&&!!process.env.RAZORPAY_KEY_SECRET&&!!process.env.RAZORPAY_WEBHOOK_SECRET&&Number.isSafeInteger(s.shippingPaise);};
const ship=shiprocketClient();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const limits=new Map();function rate(key,max){const now=Date.now();if(limits.size>10000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);let v=limits.get(key);if(!v||v.until<now){v={count:0,until:now+60000};limits.set(key,v);}return ++v.count<=max;}
async function body(req,max=65536){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)fail(413,'Request too large.');chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');}
const cookie=(res,token)=>res.setHeader('Set-Cookie',`mvn_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?604800:0}${production||origin.startsWith('https:')?'; Secure':''}`);
const requireUser=user=>user||fail(401,'Please sign in.');

function businessPhone(value){
 const valueText=clean(value,25).replace(/[\s()+.-]/g,'');
 const digits=valueText.startsWith('91')&&valueText.length===12?valueText.slice(2):valueText;
 if(!/^[6-9]\d{9}$/.test(digits))fail(400,'Enter a valid 10-digit Indian mobile number.');
 return '91'+digits;
}
function businessDetails(b){
 const kind=String(b.kind||'');
 if(!['gym','wholesale'].includes(kind))fail(400,'Choose a gym/studio or a wholesale/supplement retailer.');
 const business=clean(b.business,200),phone=businessPhone(b.phone),city=clean(b.city,100),address=clean(b.address,350);
 const pincode=clean(b.pincode,6);
 if(!/^[1-9]\d{5}$/.test(pincode))fail(400,'Enter a valid six-digit PIN code.');
 const gstin=typeof b.gstin==='string'?b.gstin.trim().toUpperCase():'';
 if(gstin&&!/^\d{2}[A-Z0-9]{13}$/.test(gstin))fail(400,'Invalid GSTIN format.');
 return {kind,business,phone,city,address,pincode,gstin};
}

const admin=user=>{if(requireUser(user).role!=='admin')fail(403,'Administrator access required.');return user;};
const accessible=(row,user,token)=>row&&(user?.role==='admin'||row.user_id&&row.user_id===user?.id||typeof token==='string'&&row.token===token);
function invoice(row,p){if(!p.tax?.enabled)return;const local=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));const year=Number(local.year),start=Number(local.month)>=4?year:year-1;const fy=String(start).slice(-2)+String(start+1).slice(-2);const key='invoice-'+fy;db.prepare('INSERT INTO counters VALUES(?,1) ON CONFLICT(key) DO UPDATE SET value=value+1').run(key);const n=db.prepare('SELECT value FROM counters WHERE key=?').get(key).value;const number=`${p.tax.prefix}/${fy}/${String(n).padStart(6,'0')}`;if(number.length>16)fail(400,'Invoice number exceeds configured limit.');db.prepare('INSERT INTO invoices VALUES(?,?,?)').run(row.id,number,JSON.stringify({number,date:new Date().toISOString(),orderId:row.id,...p}));}
function fulfil(row,payment){return C.tx(()=>{row=db.prepare('SELECT * FROM orders WHERE id=?').get(row.id);const p=JSON.parse(row.payload);if(payment.order_id!==row.provider_id||payment.amount!==p.totalPaise||payment.currency!=='INR'||payment.status!=='captured'||!/^pay_[A-Za-z0-9]+$/.test(payment.id||''))fail(400,'Payment is not captured and verified. Contact support.');if(row.status==='paid'){if(row.payment_id!==payment.id)fail(409,'Payment reference conflict.');return C.publicOrder(row);}if(!['preparing','pending','provider_review'].includes(row.status))fail(409,'Payment requires administrator reconciliation.');for(const line of p.lines){const result=db.prepare('UPDATE inventory SET on_hand=on_hand-?,version=version+1 WHERE variant_id=? AND on_hand>=?').run(line.quantity,line.variantId,line.quantity);if(result.changes!==1)fail(409,'Inventory reconciliation required.');}db.prepare("UPDATE orders SET status='paid',payment_id=? WHERE id=?").run(payment.id,row.id);invoice(row,p);C.audit('provider','payment.captured',row.id);return C.publicOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(row.id));});}
function checkoutResponse(row){const p=JSON.parse(row.payload);if(row.status==='paid')fail(409,'This order is already paid. View your order history.');if(!row.provider_id)fail(409,'Payment creation needs reconciliation. Do not create another order.');if(row.status!=='pending')fail(409,'This checkout is no longer payable.');return {id:row.id,token:row.token,key:process.env.RAZORPAY_KEY_ID,providerOrderId:row.provider_id,amount:p.totalPaise,currency:'INR'};}
const server=http.createServer(async(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://revakanya.com https://unicornproseries.com https://www.unicornproseries.com data: https://static.wixstatic.com; connect-src 'self' https://*.razorpay.com; frame-src https://*.razorpay.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");if(production)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
try{if(!await allowStaging(req,res))return;const u=new URL(req.url,'http://localhost');if(u.pathname==='/healthz')return json(res,200,{ok:true});
if(/^\/assets\/updates\/[a-z0-9-]+\.jpg$/.test(u.pathname)&&['GET','HEAD'].includes(req.method)){
 const image=db.prepare('SELECT content FROM store_update_images WHERE path=?').get(u.pathname.slice(1));if(!image)fail(404,'Image not found.');res.writeHead(200,{'Content-Type':'image/jpeg'});return res.end(req.method==='HEAD'?undefined:image.content);
}
if(u.pathname.startsWith('/api/')){
const forwarded=String(req.headers['x-forwarded-for']||'').split(',').at(-1).trim();const ip=process.env.TRUST_PROXY==='true'&&isIP(forwarded)?forwarded:req.socket.remoteAddress;if(!rate('general:'+ip,240))fail(429,'Please try again in a minute.');if(req.method==='POST'&&!['/api/webhook','/api/marketing/unsubscribe','/api/whatsapp/store-updates'].includes(u.pathname)&&req.headers.origin!==origin)fail(403,'Request origin not allowed.');const user=C.session(req),path=u.pathname;
if(path==='/api/store-updates'&&req.method==='GET')return json(res,200,{updates:activeUpdates(updateConfig(C).posts,u.searchParams.get('surface')||'web')});
if(path==='/api/whatsapp/store-updates'){
 if(!whatsappUpdateReadiness().ready)fail(503,'WhatsApp update intake is disconnected.');
 if(req.method==='GET'){
  if(u.searchParams.get('hub.mode')!=='subscribe'||u.searchParams.get('hub.verify_token')!==process.env.WHATSAPP_UPDATES_VERIFY_TOKEN||!/^\d{1,100}$/.test(u.searchParams.get('hub.challenge')||''))fail(403,'Invalid webhook verification.');
  res.writeHead(200,{'Content-Type':'text/plain'});return res.end(u.searchParams.get('hub.challenge'));
 }
 if(req.method!=='POST')fail(405,'Method not allowed.');
 const raw=await body(req);if(!validUpdateSignature(raw,req.headers['x-hub-signature-256'],process.env.WHATSAPP_APP_SECRET))fail(403,'Invalid webhook signature.');
 receiveWhatsappUpdates(C,JSON.parse(raw));return json(res,200,{received:true});
}
if(path==='/api/catalog'&&req.method==='GET'){const s=C.setting('store');return json(res,200,{products:C.catalogue(user),store:{name:s.name,phone:s.phone,currency:s.currency,shippingPaise:s.shippingPaise,serviceStates:s.serviceStates},tier:C.pricingTier(user),paymentReady:!!enabled()});}
if(path==='/api/marketing/unsubscribe'&&req.method==='GET'){res.writeHead(302,{Location:'/unsubscribe.html?token='+encodeURIComponent(u.searchParams.get('token')||'')});res.end();return;}
if(path==='/api/marketing/unsubscribe'&&req.method==='POST'){
 let token;try{token=verifyUnsubscribe(u.searchParams.get('token'),process.env.MARKETING_LINK_SECRET);}catch(error){fail(400,error.message);}
 await body(req);
 C.tx(()=>{const now=new Date().toISOString();db.prepare("UPDATE marketing_preferences SET cadence_days=0,festival_opt_in=0,email_opt_in=0,whatsapp_opt_in=0,phone='',consented_at=NULL,updated_at=? WHERE user_id=? AND consented_at=?").run(now,token.u,token.c);db.prepare("UPDATE marketing_outbox SET status='cancelled' WHERE user_id=? AND consent=? AND status='queued'").run(token.u,token.c);});return json(res,200,{ok:true});
}
if(path==='/api/promotions'&&req.method==='GET')return json(res,200,{campaigns:activeCampaigns(C.setting('campaigns'),u.searchParams.get('surface')||'web')});
if(path==='/api/promotion-quote'&&req.method==='POST'){
 if(C.pricingTier(user)!=='retail')fail(403,'These offers are for retail customers. Wholesale and gym quotations have separate prices and trade schemes.');
 const b=JSON.parse(await body(req));try{return json(res,200,campaignQuote({campaigns:C.setting('campaigns'),products:C.catalogue(null),items:b.items,code:b.code,surface:b.surface}));}catch(error){fail(400,error.message);}
}
if(path==='/api/retail/catalog'&&req.method==='GET')return json(res,200,{products:C.catalogue(null),tier:'retail',paymentReady:!!enabled()});
if(path==='/api/dealer/catalog'&&req.method==='GET'){requireUser(user);if(C.pricingTier(user)==='retail')fail(403,'Dealer approval is required.');return json(res,200,{products:C.catalogue(user),tier:C.pricingTier(user)});}
if(path==='/api/session'&&req.method==='GET')return json(res,200,{user:C.safeUser(user)});
if(path==='/api/wishlist'){
 requireUser(user);
 const valid=new Set(C.catalogue(user).flatMap(p=>p.variants.map(v=>v.id)));
 if(req.method==='POST'){
  const b=JSON.parse(await body(req));
  if(!Array.isArray(b.ids)||b.ids.length>100||b.ids.some(id=>typeof id!=='string'||!valid.has(id)))fail(400,'Choose valid products for your wishlist.');
  const ids=[...new Set(b.ids)];C.tx(()=>{db.prepare('DELETE FROM user_wishlist WHERE user_id=?').run(user.id);for(const id of ids)db.prepare('INSERT INTO user_wishlist VALUES(?,?,?)').run(user.id,id,new Date().toISOString());});
 }else if(req.method!=='GET')fail(405,'Method not allowed.');
 return json(res,200,{ids:db.prepare('SELECT variant_id FROM user_wishlist WHERE user_id=? ORDER BY created').all(user.id).map(r=>r.variant_id).filter(id=>valid.has(id))});
}
if(path==='/api/reviews'){
 if(req.method==='GET'){
  const productId=u.searchParams.get('productId');if(!db.prepare('SELECT id FROM products WHERE id=?').get(String(productId)))fail(404,'Product not found.');
  const rows=db.prepare("SELECT r.id,r.rating,r.title,r.body,r.created,u.name FROM product_reviews r JOIN users u ON u.id=r.user_id WHERE r.product_id=? AND r.status='approved' ORDER BY r.created DESC LIMIT 100").all(productId);
  const reviews=rows.map(r=>({id:r.id,rating:r.rating,title:r.title,body:r.body,created:r.created,author:r.name.trim().split(/\s+/)[0]||'Customer'}));
  const summary=db.prepare("SELECT COUNT(*) count,AVG(rating) average FROM product_reviews WHERE product_id=? AND status='approved'").get(productId);
  const own=user?db.prepare('SELECT id,rating,title,body,status,updated FROM product_reviews WHERE product_id=? AND user_id=?').get(productId,user.id):null;
  return json(res,200,{reviews,count:summary.count,average:summary.average||0,myReview:own||null});
 }
 if(req.method!=='POST')fail(405,'Method not allowed.');requireUser(user);if(!rate('review:'+user.id,8))fail(429,'Please wait before updating your review.');
 const b=JSON.parse(await body(req)),productId=clean(b.productId,80),rating=integer(b.rating,1,5),title=clean(b.title,120),text=clean(b.body,3000);
 if(text.length<20)fail(400,'Please write at least 20 characters.');if(!db.prepare('SELECT id FROM products WHERE id=?').get(productId))fail(404,'Product not found.');
 const now=new Date().toISOString();C.tx(()=>{db.prepare("INSERT INTO product_reviews VALUES(?,?,?,?,?,?,'pending',?,?) ON CONFLICT(product_id,user_id) DO UPDATE SET rating=excluded.rating,title=excluded.title,body=excluded.body,status='pending',updated=excluded.updated").run(randomUUID(),productId,user.id,rating,title,text,now,now);C.audit(user.id,'review.submit',productId);});
 return json(res,200,{ok:true,status:'pending',message:'Your review is awaiting approval.'});
}

if(path==='/api/me/marketing'&&req.method==='GET'){
 requireUser(user);
 const row=db.prepare('SELECT * FROM marketing_preferences WHERE user_id=?').get(user.id);
 return json(res,200,{preferences:row?{cadenceDays:row.cadence_days,festivalUpdates:!!row.festival_opt_in,
  emailOptIn:!!row.email_opt_in,whatsappOptIn:!!row.whatsapp_opt_in,phone:row.phone,updatedAt:row.updated_at}
  :{cadenceDays:0,festivalUpdates:false,emailOptIn:false,whatsappOptIn:false,phone:'',updatedAt:null}});
}
if(path==='/api/me/marketing'&&req.method==='POST'){
 requireUser(user);
 if(!rate('marketing-pref:'+user.id,12))fail(429,'Too many changes. Try again later.');
 const b=JSON.parse(await body(req)),cadenceDays=Number(b.cadenceDays);
 if(![0,15,30].includes(cadenceDays))fail(400,'Choose no reminders, every 15 days, or every 30 days.');
 const emailOptIn=b.emailOptIn===true,whatsappOptIn=b.whatsappOptIn===true,festivalUpdates=b.festivalUpdates===true;
 const subscribed=(cadenceDays>0||festivalUpdates)&&(emailOptIn||whatsappOptIn);
 if((cadenceDays>0||festivalUpdates)&&!subscribed)fail(400,'Choose at least one channel for updates.');
 if(subscribed&&b.explicitConsent!==true)fail(400,'Please agree to receive the selected updates.');
 const phone=whatsappOptIn?businessPhone(b.phone):'';
 const now=new Date().toISOString();
 C.tx(()=>{
   const previous=db.prepare('SELECT * FROM marketing_preferences WHERE user_id=?').get(user.id);
   const same=!!previous&&previous.cadence_days===cadenceDays&&previous.email_opt_in===Number(emailOptIn&&subscribed)&&
     previous.whatsapp_opt_in===Number(whatsappOptIn&&subscribed)&&previous.festival_opt_in===Number(festivalUpdates&&subscribed)&&previous.phone===phone;
   const consentedAt=subscribed?(same&&previous?.consented_at?previous.consented_at:now):null;
   db.prepare('INSERT INTO marketing_preferences(user_id,phone,email_opt_in,whatsapp_opt_in,cadence_days,festival_opt_in,consented_at,updated_at,last_reorder_contact_at,last_festival_contact_at) '+
     'VALUES(?,?,?,?,?,?,?,?,NULL,NULL) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,email_opt_in=excluded.email_opt_in,whatsapp_opt_in=excluded.whatsapp_opt_in,'+
     'cadence_days=excluded.cadence_days,festival_opt_in=excluded.festival_opt_in,consented_at=excluded.consented_at,updated_at=excluded.updated_at,'+
     'last_reorder_contact_at=CASE WHEN ? THEN marketing_preferences.last_reorder_contact_at ELSE NULL END,'+
     'last_festival_contact_at=CASE WHEN ? THEN marketing_preferences.last_festival_contact_at ELSE NULL END')
    .run(user.id,phone,Number(emailOptIn&&subscribed),Number(whatsappOptIn&&subscribed),
      subscribed?cadenceDays:0,Number(festivalUpdates&&subscribed),consentedAt,now,Number(same),Number(same));
   C.audit(user.id,subscribed?'marketing.optin':'marketing.optout',user.id,{cadenceDays,festivalUpdates});
 });
 return json(res,200,{ok:true,subscribed});
}
if(path==='/api/me/claim-order'&&req.method==='POST'){requireUser(user);const b=JSON.parse(await body(req));C.tx(()=>{const row=db.prepare('SELECT * FROM orders WHERE id=? AND token=?').get(String(b.id),String(b.token));if(!row||row.user_id&&row.user_id!==user.id||JSON.parse(row.payload).customer.email.toLowerCase()!==user.email)fail(404,'Order not found for this account.');db.prepare('UPDATE orders SET user_id=? WHERE id=?').run(user.id,row.id);C.audit(user.id,'order.claim',row.id);});return json(res,200,{ok:true});}
if(path==='/api/me/orders'&&req.method==='GET'){requireUser(user);return json(res,200,{orders:db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY created DESC LIMIT 100').all(user.id).map(C.publicOrder)});}
if(path==='/api/invoice'&&req.method==='POST'){const b=JSON.parse(await body(req)),row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(!accessible(row,user,b.token))fail(404,'Order not found.');const inv=db.prepare('SELECT data FROM invoices WHERE order_id=?').get(row.id);if(!inv)fail(404,'No GST invoice issued for this order.');return json(res,200,{invoice:JSON.parse(inv.data)});}

if(path==='/api/dealer/register'&&req.method==='POST'){
 if(!rate('dealer-auth:'+ip,5))fail(429,'Too many registration attempts. Try again later.');
 const b=JSON.parse(await body(req)),mail=email(b.email),name=clean(b.name,100),details=businessDetails(b);
 if(!rate('account:'+hash(mail),8))fail(429,'Too many attempts for this email.');
 const pass=await passwordHash(b.password);
 let account;
 C.tx(()=>{
   if(db.prepare('SELECT id FROM users WHERE email=?').get(mail))fail(409,'An account already exists. Sign in to apply for business pricing.');
   const id=randomUUID(),now=new Date().toISOString();
   db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,mail,name,pass,'customer',now);
   db.prepare("INSERT INTO dealers(user_id,kind,business,gstin,status,reviewed_by,created) VALUES(?,?,?,?, 'pending',NULL,?)").run(id,details.kind,details.business,details.gstin,now);
   db.prepare('INSERT INTO dealer_profiles(user_id,phone,city,address,pincode,notes,updated) VALUES(?,?,?,?,?,?,?)')
     .run(id,details.phone,details.city,details.address,details.pincode,'',now);
   C.audit(id,'dealer.register',id,{kind:details.kind});
   account=db.prepare('SELECT * FROM users WHERE id=?').get(id);
 });
 cookie(res,C.issueSession(account));
 return json(res,201,{user:C.safeUser(account),status:'pending'});
}
if(path==='/api/dealer/apply'&&req.method==='POST'){
 requireUser(user);
 if(!rate('dealer-apply:'+user.id,5))fail(429,'Please try again later.');
 const details=businessDetails(JSON.parse(await body(req)));
 C.tx(()=>{
   const previous=db.prepare('SELECT status FROM dealers WHERE user_id=?').get(user.id);
   if(previous&&previous.status!=='rejected')fail(409,'A business application is already under review.');
   const now=new Date().toISOString();
   db.prepare("INSERT INTO dealers(user_id,kind,business,gstin,status,reviewed_by,created) VALUES(?,?,?,?, 'pending',NULL,?) ON CONFLICT(user_id) DO UPDATE SET kind=excluded.kind,business=excluded.business,gstin=excluded.gstin,status='pending',reviewed_by=NULL")
     .run(user.id,details.kind,details.business,details.gstin,now);
   db.prepare('INSERT INTO dealer_profiles(user_id,phone,city,address,pincode,notes,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,city=excluded.city,address=excluded.address,pincode=excluded.pincode,updated=excluded.updated')
     .run(user.id,details.phone,details.city,details.address,details.pincode,'',now);
   C.audit(user.id,'dealer.apply',user.id,{kind:details.kind});
 });
 return json(res,200,{user:C.safeUser(user),status:'pending'});
}
if(['/api/register','/api/login'].includes(path)&&req.method==='POST'){
if(!rate('auth:'+ip,10))fail(429,'Too many attempts. Try again in a minute.');const b=JSON.parse(await body(req)),mail=email(b.email);if(!rate('account:'+hash(mail),10))fail(429,'Too many attempts. Try again in a minute.');let account;
if(path==='/api/register'){const pass=await passwordHash(b.password),name=clean(b.name,100);if(db.prepare('SELECT id FROM users WHERE email=?').get(mail))fail(400,'Unable to register with these details.');const id=randomUUID();db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,mail,name,pass,'customer',new Date().toISOString());account=db.prepare('SELECT * FROM users WHERE id=?').get(id);C.audit(id,'account.register',id);}else{account=db.prepare('SELECT * FROM users WHERE email=?').get(mail);const dummy='0123456789abcdef0123456789abcdef:'+('0'.repeat(128));const valid=await passwordMatches(b.password,account?.password||dummy);if(!account||!valid)fail(401,'Email or password is incorrect.');}
const old=req.headers.cookie?.match(/(?:^|;\s*)mvn_session=([^;]+)/)?.[1];if(old)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(old));cookie(res,C.issueSession(account));return json(res,200,{user:C.safeUser(account)});}
if(path==='/api/logout'&&req.method==='POST'){const old=req.headers.cookie?.match(/(?:^|;\s*)mvn_session=([^;]+)/)?.[1];if(old)db.prepare('DELETE FROM sessions WHERE token=?').run(hash(old));cookie(res,'');return json(res,200,{ok:true});}
if(path==='/api/password'&&req.method==='POST'){requireUser(user);if(!rate('password:'+ip,5))fail(429,'Please try again later.');const b=JSON.parse(await body(req));if(!await passwordMatches(b.currentPassword,user.password))fail(401,'Current password is incorrect.');const pass=await passwordHash(b.password);C.tx(()=>{db.prepare('UPDATE users SET password=? WHERE id=?').run(pass,user.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);C.audit(user.id,'account.password',user.id);});cookie(res,'');return json(res,200,{ok:true});}
if(path==='/api/dealer'&&req.method==='POST'){requireUser(user);const b=JSON.parse(await body(req));if(!['gym','wholesale'].includes(b.kind))fail(400,'Choose gym or wholesale.');const business=clean(b.business,200),gstin=typeof b.gstin==='string'?b.gstin.trim().toUpperCase():'';if(gstin&&!/^\d{2}[A-Z0-9]{13}$/.test(gstin))fail(400,'Invalid GSTIN format.');C.tx(()=>{const previous=db.prepare('SELECT status FROM dealers WHERE user_id=?').get(user.id);if(previous&&previous.status!=='rejected')fail(409,'An application already exists.');db.prepare("INSERT INTO dealers VALUES(?,?,?,?, 'pending',NULL,?) ON CONFLICT(user_id) DO UPDATE SET kind=excluded.kind,business=excluded.business,gstin=excluded.gstin,status='pending',reviewed_by=NULL").run(user.id,b.kind,business,gstin,new Date().toISOString());C.audit(user.id,'dealer.apply',user.id);});return json(res,200,{user:C.safeUser(user)});}
if(path==='/api/checkout'&&req.method==='POST'){
if(!enabled())fail(503,'Online checkout is awaiting store activation. No payment has been taken.');const b=JSON.parse(await body(req)),store=C.setting('store');if(!customerValid(b.customer,store.serviceStates)||b.acceptedTerms!==true)fail(400,'Complete your delivery details and accept the store policies.');if(user&&b.customer.email.toLowerCase()!==user.email)fail(400,'Use your account email for this order.');const gstin=typeof b.customer.gstin==='string'?b.customer.gstin.toUpperCase().trim():'';if(gstin&&!/^\d{2}[A-Z0-9]{13}$/.test(gstin))fail(400,'Invalid GSTIN.');const customer=Object.fromEntries(['name','phone','email','address','city','pincode','state'].map(k=>[k,b.customer[k].trim()]));if(gstin)customer.gstin=gstin;
const requestKey=req.headers['idempotency-key'];if(requestKey&&!/^[a-f0-9-]{32,64}$/i.test(requestKey))fail(400,'Invalid checkout request key.');const key=requestKey?hash((user?.id||'guest')+':'+requestKey):null,fingerprint=hash(JSON.stringify({items:b.items,customer,terms:true}));let row;
C.tx(()=>{if(key){const previous=db.prepare('SELECT * FROM orders WHERE request_key=?').get(key);if(previous){if(previous.request_hash!==fingerprint)fail(409,'Checkout details changed. Start a new checkout.');row=previous;return;}}if(!rate('checkout:'+ip,5))fail(429,'Too many new checkouts. Review your existing orders before retrying.');const products=C.catalogue(user);let order=quote(b.items,products,store.shippingPaise);order=taxQuote(order,products,customer,C.setting('tax'));order.customer=customer;order.tier=C.pricingTier(user);const id='MV-'+randomUUID().slice(0,18),token=randomBytes(32).toString('hex');db.prepare('INSERT INTO orders(id,token,status,payload,created,user_id,request_key,request_hash) VALUES(?,?,?,?,?,?,?,?)').run(id,token,'preparing',JSON.stringify(order),new Date().toISOString(),user?.id||null,key,fingerprint);row=db.prepare('SELECT * FROM orders WHERE id=?').get(id);});
if(row.status!=='preparing'||row.provider_id)return json(res,200,checkoutResponse(row));
// Only the request that inserted this row may call the provider. Claim it synchronously before awaiting.
if(db.prepare("UPDATE orders SET status='provider_review' WHERE id=? AND status='preparing'").run(row.id).changes!==1)fail(409,'Payment creation is in progress. Retry this checkout shortly.');const p=JSON.parse(row.payload);
try{const remote=await razor('orders',{amount:p.totalPaise,currency:'INR',receipt:row.id,notes:{reference:row.id}});if(remote.amount!==p.totalPaise||remote.currency!=='INR'||!/^order_[A-Za-z0-9]+$/.test(remote.id||''))fail(502,'Payment order mismatch. Reconciliation required.');db.prepare("UPDATE orders SET provider_id=?,status='pending' WHERE id=?").run(remote.id,row.id);}catch(e){if(e.definitive)db.prepare("UPDATE orders SET status='failed' WHERE id=?").run(row.id);throw e;}return json(res,200,checkoutResponse(db.prepare('SELECT * FROM orders WHERE id=?').get(row.id)));}
if(path==='/api/verify'&&req.method==='POST'){const b=JSON.parse(await body(req)),row=db.prepare('SELECT * FROM orders WHERE id=? AND token=?').get(String(b.id),String(b.token));if(!row)fail(404,'Order not found.');if(b.razorpay_order_id!==row.provider_id||!signatureMatches(row.provider_id+'|'+b.razorpay_payment_id,b.razorpay_signature,process.env.RAZORPAY_KEY_SECRET))fail(400,'Payment verification failed. Contact support.');if(!/^pay_[A-Za-z0-9]+$/.test(b.razorpay_payment_id))fail(400,'Invalid payment reference.');return json(res,200,fulfil(row,await razor('payments/'+b.razorpay_payment_id)));}
if(path==='/api/webhook'&&req.method==='POST'){const raw=await body(req);if(!signatureMatches(raw,req.headers['x-razorpay-signature'],process.env.RAZORPAY_WEBHOOK_SECRET))fail(400,'Invalid signature.');const b=JSON.parse(raw),p=b.payload?.payment?.entity;if(['payment.captured','order.paid'].includes(b.event)&&p){const row=db.prepare('SELECT * FROM orders WHERE provider_id=?').get(p.order_id);if(!row)fail(503,'Payment order is awaiting reconciliation.');fulfil(row,p);}return json(res,200,{received:true});}
if(path==='/api/order-status'&&req.method==='POST'){const b=JSON.parse(await body(req)),row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(!accessible(row,user,b.token))fail(404,'Order not found.');return json(res,200,C.publicOrder(row));}
if(path.startsWith('/api/admin/')){admin(user);
if(path==='/api/admin/my-work'&&req.method==='GET')return json(res,200,{...workContext,requests:db.prepare('SELECT id,request,created FROM owner_work ORDER BY rowid DESC LIMIT 100').all()});
if(path==='/api/admin/my-work'&&req.method==='POST'){if(!rate('owner-work:'+user.id,20))fail(429,'Please wait before adding another request.');return json(res,200,{request:saveOwnerWork(C,user,JSON.parse(await body(req))),...workContext});}
if(path==='/api/admin/owner-desk'&&req.method==='GET')return json(res,200,{products:C.catalogue(user,true),entries:db.prepare('SELECT payload FROM owner_entries ORDER BY created DESC LIMIT 100').all().map(r=>{const {request,...entry}=JSON.parse(r.payload);return entry;})});
if(path==='/api/admin/owner-desk'&&req.method==='POST')return json(res,200,{entry:recordOwnerEntry(C,user,JSON.parse(await body(req)))});
if(path==='/api/admin/store-update-image'&&req.method==='POST'){
 if(!rate('update-image:'+user.id,5))fail(429,'Please wait before uploading another photo.');
 const b=JSON.parse(await body(req,2100000));if(typeof b.jpeg!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(b.jpeg))fail(400,'Upload a JPEG photo.');
 const content=Buffer.from(b.jpeg.split(',')[1],'base64');if(content.length>1500000||content.length<20||content[0]!==255||content[1]!==216||content[2]!==255||content.at(-2)!==255||content.at(-1)!==217)fail(400,'Use a valid photo smaller than 1.5 MB.');
 const path='assets/updates/'+randomUUID()+'.jpg';C.tx(()=>{db.prepare('INSERT INTO store_update_images VALUES(?,?)').run(path,content);C.audit(user.id,'store-update.image',path);});return json(res,200,{path});
}
if(path==='/api/admin/store-updates'&&req.method==='GET')return json(res,200,{...updateConfig(C),whatsapp:whatsappUpdateReadiness()});
if(path==='/api/admin/store-updates'&&req.method==='POST'){
 const b=JSON.parse(await body(req));
 if(!Array.isArray(b.posts)||b.posts.length>40)fail(400,'Keep up to 40 updates; remove old drafts when full.');
 let posts;try{posts=b.posts.map(validateUpdate);}catch(error){fail(400,error.message);}
 if(new Set(posts.map(p=>p.id)).size!==posts.length)fail(400,'Update IDs must be unique.');
 C.tx(()=>{const current=updateConfig(C);if(b.revision!==current.revision)fail(409,'Updates changed elsewhere. Reload updates before saving.');C.set('storeUpdates',{revision:current.revision+1,posts});C.audit(user.id,'store-updates.save','store-updates',{count:posts.length});});return json(res,200,{ok:true});
}
if(path==='/api/admin/marketing/automation'&&req.method==='GET')return json(res,200,{config:C.setting('marketingAutomation'),readiness:marketingReadiness(),counts:db.prepare('SELECT status,COUNT(*) count FROM marketing_outbox GROUP BY status').all(),recent:db.prepare('SELECT id,kind,status,created,accepted,error FROM marketing_outbox ORDER BY created DESC LIMIT 30').all()});
if(path==='/api/admin/marketing/automation'&&req.method==='POST'){
 const b=JSON.parse(await body(req));if(!Array.isArray(b.announcements)||b.announcements.length>30)fail(400,'Provide up to 30 announcements.');
 const announcements=b.announcements.map(a=>{const id=clean(a.id,60),title=clean(a.title,120),text=clean(a.text,1000),startsAt=String(a.startsAt||''),endsAt=String(a.endsAt||'');if(!/^[a-z0-9-]+$/.test(id)||!Number.isFinite(Date.parse(startsAt))||!Number.isFinite(Date.parse(endsAt))||Date.parse(startsAt)>=Date.parse(endsAt)||!/(?:Z|[+-]\d\d:\d\d)$/.test(startsAt)||!/(?:Z|[+-]\d\d:\d\d)$/.test(endsAt))fail(400,'Use valid IDs and timezone-aware notification dates.');return {id,title,text,startsAt,endsAt,enabled:a.enabled===true}});
 if(new Set(announcements.map(a=>a.id)).size!==announcements.length)fail(400,'Announcement IDs must be unique.');
 C.tx(()=>{C.set('marketingAutomation',{enabled:b.enabled===true,announcements});C.audit(user.id,'marketing.automation.configure','marketing',{enabled:b.enabled===true,announcements:announcements.length});});return json(res,200,{ok:true,readiness:marketingReadiness()});
}
if(path==='/api/admin/marketing/preview'&&req.method==='POST'){const added=enqueueMarketing(C);return json(res,200,{added,sent:0});}
if(path==='/api/admin/marketing/audience'&&req.method==='GET'){
 const members=db.prepare('SELECT u.id,u.name,u.email,m.phone,m.email_opt_in,m.whatsapp_opt_in,'+
 'm.cadence_days,m.festival_opt_in,m.consented_at,m.last_reorder_contact_at,m.last_festival_contact_at '+
 'FROM marketing_preferences m JOIN users u ON u.id=m.user_id '+
 'WHERE m.consented_at IS NOT NULL AND (m.email_opt_in=1 OR m.whatsapp_opt_in=1) '+
 'ORDER BY u.created DESC LIMIT 500').all();
 const now=Date.now();
 return json(res,200,{automaticSending:marketingReadiness().ready&&C.setting('marketingAutomation')?.enabled===true,subscribers:members.map(m=>{
 const last=m.last_reorder_contact_at||m.consented_at;
 const nextDue=m.cadence_days>0?new Date(Date.parse(last)+m.cadence_days*86400000).toISOString():null;
 return {id:m.id,name:m.name,email:m.email,phone:m.phone,emailOptIn:!!m.email_opt_in,
 whatsappOptIn:!!m.whatsapp_opt_in,cadenceDays:m.cadence_days,festivalUpdates:!!m.festival_opt_in,
 nextDue,reorderDue:nextDue?Date.parse(nextDue)<=now:false};
 })});
}
if(path==='/api/admin/marketing/mark'&&req.method==='POST'){
 const b=JSON.parse(await body(req));
 if(!['reorder','festival'].includes(b.kind))fail(400,'Unknown contact category.');
 const person=db.prepare('SELECT * FROM marketing_preferences WHERE user_id=?').get(String(b.userId||''));
 if(!person?.consented_at||(!person.email_opt_in&&!person.whatsapp_opt_in))fail(409,'No active permission to contact this customer.');
 if((b.kind==='reorder'&&!person.cadence_days)||(b.kind==='festival'&&!person.festival_opt_in))
   fail(409,'Customer has not consented to this message type.');
 const col=b.kind==='reorder'?'last_reorder_contact_at':'last_festival_contact_at';
 C.tx(()=>{
  db.prepare('UPDATE marketing_preferences SET '+col+'=? WHERE user_id=?').run(new Date().toISOString(),b.userId);
  C.audit(user.id,'marketing.manual_contact_recorded',b.userId,{kind:b.kind});
 });
 return json(res,200,{ok:true});
}
if(path==='/api/admin/promotions'&&req.method==='GET')return json(res,200,{campaigns:C.setting('campaigns')||[]});
if(path==='/api/admin/overview'&&req.method==='GET')return json(res,200,{products:C.catalogue(user,true),dealers:db.prepare('SELECT d.*,u.email,u.name,dp.phone,dp.city,dp.address,dp.pincode FROM dealers d JOIN users u ON u.id=d.user_id LEFT JOIN dealer_profiles dp ON dp.user_id=d.user_id ORDER BY d.created DESC LIMIT 100').all(),orders:db.prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 100').all().map(C.publicOrder),store:C.setting('store'),tax:C.setting('tax'),shippingReady:!!shippingReady(),paymentReady:!!enabled(),reviews:db.prepare('SELECT r.*,u.name FROM product_reviews r JOIN users u ON u.id=r.user_id ORDER BY r.updated DESC LIMIT 100').all(),audit:db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all()});
if(req.method!=='POST')fail(405,'Method not allowed.');const b=JSON.parse(await body(req));
if(path==='/api/admin/promotions'){
 if(!Array.isArray(b.campaigns)||b.campaigns.length>30)fail(400,'Provide up to 30 campaigns.');
 let campaigns;try{campaigns=b.campaigns.map(validateCampaign);}catch(error){fail(400,error.message);}
 if(new Set(campaigns.map(c=>c.id)).size!==campaigns.length||new Set(campaigns.map(c=>c.code)).size!==campaigns.length)fail(400,'Campaign IDs and codes must be unique.');
 C.tx(()=>{C.set('campaigns',campaigns);C.audit(user.id,'campaigns.save','campaigns',{count:campaigns.length});});return json(res,200,{ok:true});
}
if(path==='/api/admin/review'){
 if(!['approved','rejected'].includes(b.status))fail(400,'Choose an approved review status.');
 const row=db.prepare('SELECT id FROM product_reviews WHERE id=?').get(String(b.id));if(!row)fail(404,'Review not found.');
 C.tx(()=>{db.prepare('UPDATE product_reviews SET status=?,updated=? WHERE id=?').run(b.status,new Date().toISOString(),row.id);C.audit(user.id,'review.'+b.status,row.id);});return json(res,200,{ok:true});
}
if(path==='/api/admin/dealer'){if(!['approved','rejected'].includes(b.status))fail(400,'Invalid approval status.');C.tx(()=>{const d=db.prepare('SELECT * FROM dealers WHERE user_id=?').get(String(b.userId));if(!d)fail(404,'Application not found.');db.prepare('UPDATE dealers SET status=?,reviewed_by=? WHERE user_id=?').run(b.status,user.id,b.userId);C.audit(user.id,'dealer.'+b.status,b.userId);});return json(res,200,{ok:true});}
if(path==='/api/admin/product'){const id=clean(b.id,80);if(!/^[a-z0-9-]+$/.test(id))fail(400,'Invalid product ID.');const existing=db.prepare('SELECT data FROM products WHERE id=?').get(id);const old=existing?JSON.parse(existing.data):null;const p={id,name:clean(b.name,100),brand:b.brand?clean(b.brand,100):old?.brand||(['potency-whey','nitro-mass','pro-creatine','sturdy-pre','musclevite'].includes(id)?'Unicorn Pro Series':'Brand to confirm'),category:clean(b.category,80),subtitle:clean(b.subtitle,200),description:clean(b.description,4000),image:validImage(b.image),hsn:b.hsn?clean(b.hsn,8):null,gstRateBps:b.gstRateBps===null||b.gstRateBps===undefined?null:integer(b.gstRateBps,0,2800)};if(Object.hasOwn(b,'images'))p.images=validImages(b.images);else if(Object.hasOwn(old||{},'images'))p.images=old.images;if(p.hsn&&!/^\d{4,8}$/.test(p.hsn))fail(400,'Invalid HSN.');if(!Array.isArray(b.variants)||!b.variants.length||b.variants.length>30)fail(400,'Add between 1 and 30 variants.');const ids=new Set();p.variants=b.variants.map(v=>{const vid=clean(v.id,80);if(!/^[a-z0-9-]+$/.test(vid)||ids.has(vid))fail(400,'Invalid or duplicate variant ID.');ids.add(vid);const other=db.prepare('SELECT data FROM products WHERE id!=?').all(id).some(r=>JSON.parse(r.data).variants.some(v=>v.id===vid));if(other)fail(409,'Variant belongs to another product.');const prices={};for(const tier of ['gym','wholesale'])if(v.prices?.[tier]!==undefined&&v.prices[tier]!==null)prices[tier]=integer(v.prices[tier],1);const result={id:vid,label:clean(v.label,200),pricePaise:v.pricePaise===null?null:integer(v.pricePaise,1),prices};const previous=old?.variants.find(x=>x.id===vid);if(Object.hasOwn(v,'mrpPaise')||Object.hasOwn(previous||{},'mrpPaise')){const mrp=Object.hasOwn(v,'mrpPaise')?v.mrpPaise:previous.mrpPaise;result.mrpPaise=mrp===null?null:integer(mrp,1);if(result.mrpPaise!==null&&result.mrpPaise<Math.max(result.pricePaise||0,...Object.values(prices)))fail(400,'MRP cannot be lower than a selling price.');}if(Object.hasOwn(v,'image'))result.image=validImage(v.image);if(Object.hasOwn(v,'images'))result.images=validImages(v.images);else if(Object.hasOwn(previous||{},'images'))result.images=previous.images;return result;});if(old&&old.variants.some(v=>!ids.has(v.id)))fail(400,'Existing variants cannot be deleted; set stock to zero instead.');C.tx(()=>{db.prepare('INSERT INTO products VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(p));for(const v of p.variants)db.prepare('INSERT OR IGNORE INTO inventory(variant_id,on_hand) VALUES(?,NULL)').run(v.id);C.audit(user.id,'product.save',id);});return json(res,200,{ok:true});}
if(path==='/api/admin/inventory'){const id=clean(b.variantId,80),quantity=integer(b.onHand),version=integer(b.version),reason=clean(b.reason,300);C.tx(()=>{const v=C.catalogue(user,true).flatMap(p=>p.variants).find(v=>v.id===id);if(!v)fail(404,'Variant not found.');if(quantity<v.reserved)fail(409,'Stock cannot be lower than active reservations.');if(db.prepare('UPDATE inventory SET on_hand=?,version=version+1 WHERE variant_id=? AND version=?').run(quantity,id,version).changes!==1)fail(409,'Inventory changed. Refresh before saving.');C.audit(user.id,'inventory.adjust',id,{quantity,reason});});return json(res,200,{ok:true});}
if(path==='/api/admin/store'){const s=C.setting('store');s.address=clean(b.address,500);s.supportEmail=email(b.supportEmail);s.shippingPaise=integer(b.shippingPaise);if(!Array.isArray(b.serviceStates)||!b.serviceStates.length||b.serviceStates.some(x=>!stateCode(x)))fail(400,'Use supported delivery states.');s.serviceStates=b.serviceStates;C.tx(()=>{C.set('store',s);C.audit(user.id,'store.update','store');});return json(res,200,{ok:true});}
if(path==='/api/admin/tax'){const tax={enabled:b.enabled===true,approved:b.approved===true,sellerStateCode:clean(b.sellerStateCode,2),sellerGstin:typeof b.sellerGstin==='string'?b.sellerGstin.toUpperCase():'',legalName:typeof b.legalName==='string'?b.legalName.trim():'',address:typeof b.address==='string'?b.address.trim():'',shippingRateBps:integer(b.shippingRateBps,0,2800),invoicePrefix:clean(b.invoicePrefix,4)};if(!/^[A-Z0-9]{1,4}$/.test(tax.invoicePrefix))fail(400,'Use up to four letters or digits for invoice prefix.');if(tax.enabled&&(!tax.approved||!/^\d{2}[A-Z0-9]{13}$/.test(tax.sellerGstin)||!tax.legalName||!tax.address||tax.sellerGstin.slice(0,2)!==tax.sellerStateCode))fail(400,'Complete and approve GST setup.');C.tx(()=>{C.set('tax',tax);C.audit(user.id,'tax.update','tax');});return json(res,200,{ok:true});}
if(path==='/api/admin/fulfilment'){const row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(!row)fail(404,'Order not found.');const transitions={unfulfilled:['processing'],processing:['shipped'],shipped:['delivered']};if(row.status!=='paid'||!transitions[row.fulfilment]?.includes(b.status))fail(409,'Invalid fulfilment transition.');const tracking=b.status==='shipped'?clean(b.tracking,200):null;C.tx(()=>{db.prepare('UPDATE orders SET fulfilment=? WHERE id=?').run(b.status,row.id);if(tracking){const old=db.prepare('SELECT * FROM shipments WHERE order_id=?').get(row.id);db.prepare('INSERT INTO shipments VALUES(?,?,?) ON CONFLICT(order_id) DO UPDATE SET data=excluded.data').run(row.id,'shipped',JSON.stringify({...old?JSON.parse(old.data):{},trackingReference:tracking}));}C.audit(user.id,'order.'+b.status,row.id,{tracking});});return json(res,200,{ok:true});}
if(path==='/api/admin/recover-order'){const row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(!row||row.provider_id||row.status!=='provider_review')fail(409,'Order does not need recovery.');if(!/^order_[A-Za-z0-9]+$/.test(b.providerOrderId||''))fail(400,'Invalid provider order ID.');const remote=await razor('orders/'+b.providerOrderId),p=JSON.parse(row.payload);if(remote.receipt!==row.id||remote.amount!==p.totalPaise||remote.currency!=='INR')fail(409,'Provider order does not match this receipt and amount.');C.tx(()=>{db.prepare("UPDATE orders SET provider_id=?,status='pending' WHERE id=? AND provider_id IS NULL").run(b.providerOrderId,row.id);C.audit(user.id,'order.recover',row.id,{providerOrderId:b.providerOrderId});});return json(res,200,{ok:true});}
if(path==='/api/admin/reconcile'){const row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(!row?.provider_id)fail(409,'Unknown provider outcome. Reconcile receipt in Razorpay dashboard; stock remains held.');const remote=await razor('orders/'+row.provider_id+'/payments');const payment=remote.items?.find(x=>x.status==='captured');if(payment){const paid=fulfil(row,payment);C.audit(user.id,'order.reconcile',row.id);return json(res,200,paid);}return json(res,200,{status:row.status,message:'No captured payment found. Reservation retained because this provider order may still be paid.'});}
if(path==='/api/admin/shipping-rates'){if(!shippingReady())fail(503,'Shiprocket is disabled.');const row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(!row)fail(404,'Order not found.');if(!/^[1-9]\d{5}$/.test(b.pickupPostcode||'')||typeof b.weight!=='number'||b.weight<=0||b.weight>1000)fail(400,'Enter a pickup PIN code and packed weight in kg.');const result=await ship.serviceability({pickup_postcode:b.pickupPostcode,delivery_postcode:JSON.parse(row.payload).customer.pincode,cod:'0',weight:String(b.weight)});return json(res,200,{rates:result});}
if(path==='/api/admin/shipping-operation'){if(!shippingReady())fail(503,'Shiprocket is disabled.');const op=b.operation;if(!['awb','pickup','label','manifest'].includes(op))fail(400,'Invalid shipping operation.');let shipment;C.tx(()=>{const row=db.prepare('SELECT * FROM shipments WHERE order_id=?').get(String(b.id));shipment=row?JSON.parse(row.data):null;if(!shipment?.shipmentId)fail(409,'Create a provider shipment first.');shipment.operations ||= {};if(Object.values(shipment.operations).some(v=>!v.completed))fail(409,'A shipping operation is in progress or needs reconciliation.');if(shipment.operations[op])fail(409,'Operation already completed or needs provider reconciliation.');if(op!=='awb'&&!shipment.awb)fail(409,'Assign an AWB first.');if(op==='manifest'&&!shipment.operations.pickup?.completed)fail(409,'Schedule pickup first.');if(op==='awb'&&b.courierId!==undefined)integer(b.courierId,1);shipment.operations[op]={started:new Date().toISOString()};db.prepare('UPDATE shipments SET data=? WHERE order_id=?').run(JSON.stringify(shipment),b.id);});try{const result=await ship[op](shipment.shipmentId,b.courierId);if(op==='awb'){if(result.awb_assign_status!==1||!result.response?.data?.awb_code)fail(502,'AWB result requires reconciliation.');shipment.awb=String(result.response.data.awb_code);}if(op==='pickup'&&result.pickup_status!==1)fail(502,'Pickup result requires reconciliation.');if(op==='label'&&(result.label_created!==1||typeof result.label_url!=='string'||!result.label_url.startsWith('https://')))fail(502,'Label result requires reconciliation.');if(op==='manifest'&&(typeof result.manifest_url!=='string'||!result.manifest_url.startsWith('https://')))fail(502,'Manifest result requires reconciliation.');shipment=JSON.parse(db.prepare('SELECT data FROM shipments WHERE order_id=?').get(b.id).data);if(op==='awb')shipment.awb=String(result.response.data.awb_code);shipment.operations[op]={completed:true,result};db.prepare('UPDATE shipments SET status=?,data=? WHERE order_id=?').run(op+'_completed',JSON.stringify(shipment),b.id);C.audit(user.id,'shipment.'+op,b.id);return json(res,200,{ok:true,result});}catch(e){shipment.operations[op]={review:true};db.prepare("UPDATE shipments SET status='provider_review',data=? WHERE order_id=?").run(JSON.stringify(shipment),b.id);throw e;}}
if(path==='/api/admin/shipment'){if(!shippingReady())fail(503,'Shiprocket is disabled pending credentials and completed testing.');const row=db.prepare('SELECT * FROM orders WHERE id=?').get(String(b.id));if(row?.status!=='paid')fail(409,'Only paid orders can be shipped.');const payload=shipmentPayload(row,b);C.tx(()=>{if(db.prepare('SELECT 1 FROM shipments WHERE order_id=?').get(row.id))fail(409,'Shipment already exists or needs reconciliation.');db.prepare('INSERT INTO shipments VALUES(?,?,?)').run(row.id,'creating','{}');});try{const result=await ship.create(payload);if(!Number.isSafeInteger(result.shipment_id)||!Number.isSafeInteger(result.order_id))fail(502,'Shipping result requires reconciliation.');db.prepare('UPDATE shipments SET status=?,data=? WHERE order_id=?').run('created',JSON.stringify({shipmentId:result.shipment_id,providerOrderId:result.order_id}),row.id);C.audit(user.id,'shipment.create',row.id);return json(res,200,{ok:true});}catch(e){db.prepare("UPDATE shipments SET status='provider_review' WHERE order_id=?").run(row.id);throw e;}}
if(path==='/api/admin/tracking'){const row=db.prepare('SELECT * FROM shipments WHERE order_id=?').get(String(b.id));const shipment=row?JSON.parse(row.data):null;if(!shipment?.shipmentId)fail(409,'No provider shipment to track.');const tracking=await ship.track(shipment.shipmentId);C.tx(()=>{const latest=JSON.parse(db.prepare('SELECT data FROM shipments WHERE order_id=?').get(b.id).data);db.prepare('UPDATE shipments SET data=? WHERE order_id=?').run(JSON.stringify({...latest,tracking}),b.id);});return json(res,200,{tracking});}
fail(404,'Endpoint not found.');}
fail(404,'Endpoint not found.');}
if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');const path=resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!path.startsWith(root+sep))fail(403,'Forbidden');let file;try{if(!realpathSync(path).startsWith(root+sep))fail(403,'Forbidden');file=readFileSync(path);if(storePublicUrl!==previousStoreOrigin&&['/','/index.html','/robots.txt','/sitemap.xml'].includes(u.pathname))file=Buffer.from(file.toString('utf8').replaceAll(previousStoreOrigin,storePublicUrl));if(process.env.STAGING_MODE==='true'&&extname(path)==='.html'){const storefront=process.env.STAGING_PUBLIC_BROWSING==='true'&&['/','/index.html','/mobile-app.html'].includes(u.pathname);const banner=`${process.env.STAGING_PUBLIC_BROWSING==='true'?'TEST PREVIEW':'PRIVATE STAGING'} · TEST DATA ONLY · PAYMENTS AND SHIPPING DISABLED`;if(!storefront)file=Buffer.from(file.toString('utf8').replace(/<body(?:\s[^>]*)?>/i,openTag=>`${openTag}<div class="staging-banner" role="status">${banner}</div>`));}}catch(e){if(e instanceof Problem)throw e;fail(404,'Page not found.');}const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8'};res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:file);
}catch(e){if(!(e instanceof Problem)&&!(e instanceof SyntaxError))console.error('Request failed:',e.code||e.name);json(res,e instanceof Problem?e.status:e instanceof SyntaxError?400:500,{error:e instanceof Problem?e.message:e instanceof SyntaxError?'Invalid request.':'Request could not be completed. Contact support before retrying.'});}});
function validImages(value){
 if(value===null)return [];
 if(!Array.isArray(value)||value.length>20)fail(400,'Add up to 20 product photos.');
 const seen=new Set();
 return value.flatMap((entry,index)=>{
  const src=validImage(typeof entry==='string'?entry:entry?.src);
  if(!src)fail(400,'Each product photo needs an approved image path.');
  if(seen.has(src))return [];seen.add(src);
  return [{src,label:typeof entry==='object'&&entry?.label?clean(entry.label,80):'View '+(index+1),alt:typeof entry==='object'&&entry?.alt?clean(entry.alt,300):''}];
 });
}
function validImage(value){
 if(value===undefined||value===null||value==='')return null;
 value=clean(value,500);
 const local=/^assets\/[a-zA-Z0-9_.\/-]+\.(png|jpg|jpeg|webp)$/.test(value);
 const legacy=/^https:\/\/revakanya\.com\/assets\/imgs\/[^<>"']+$/.test(value);
 const official=/^https:\/\/(?:www\.)?unicornproseries\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-zA-Z0-9_.\/-]+\.(?:png|jpe?g|webp)$/.test(value);
 if((!local&&!legacy&&!official)||value.includes('..'))fail(400,'Use an approved local asset or manufacturer image.');
 return value;
}
startLocalBackupScheduler();
const stopMarketing=startMarketingScheduler(C);
const stopDriveBackup=startDriveBackupScheduler(resolve(process.env.DATA_DIR||'runtime'));
server.requestTimeout=30000;server.headersTimeout=15000;const portArg=process.argv.indexOf('--port');server.listen(Number(portArg>=0?process.argv[portArg+1]:process.env.PORT)||3000,process.env.HOST||'0.0.0.0',()=>console.log('Store running at '+origin));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{stopMarketing();stopDriveBackup?.();server.close(()=>{db.close();process.exit(0);});});
