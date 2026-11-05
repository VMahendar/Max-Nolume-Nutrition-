import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export class Problem extends Error {constructor(status,message){super(message);this.status=status;}}
export const fail=(status,message)=>{throw new Problem(status,message);};
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const clean=(x,max=200)=>typeof x==='string'&&x.trim().length>0&&x.length<=max?x.trim():fail(400,'Invalid text field.');
export const integer=(x,min=0,max=100000000)=>Number.isSafeInteger(x)&&x>=min&&x<=max?x:fail(400,'Invalid numeric field.');
export const email=x=>{x=clean(x,199).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))fail(400,'Invalid email address.');return x;};
export async function passwordHash(password){if(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>128)fail(400,'Use a password of 12 to 128 bytes.');const salt=randomBytes(16).toString('hex');return salt+':'+(await scrypt(password,salt,64)).toString('hex');}
export async function passwordMatches(password,stored){if(typeof password!=='string'||Buffer.byteLength(password)>128)return false;const [salt,key]=stored.split(':');const actual=await scrypt(password,salt,64);return timingSafeEqual(actual,Buffer.from(key,'hex'));}
export function openCommerce(dir){mkdirSync(dir,{recursive:true,mode:0o700});const db=new DatabaseSync(resolve(dir,'orders.sqlite'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,token TEXT NOT NULL,provider_id TEXT UNIQUE,payment_id TEXT UNIQUE,status TEXT NOT NULL,payload TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer',created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS dealers(user_id TEXT PRIMARY KEY REFERENCES users(id),kind TEXT NOT NULL,business TEXT NOT NULL,gstin TEXT NOT NULL,status TEXT NOT NULL,reviewed_by TEXT,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS inventory(variant_id TEXT PRIMARY KEY,on_hand INTEGER,version INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invoices(order_id TEXT PRIMARY KEY REFERENCES orders(id),number TEXT UNIQUE NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shipments(order_id TEXT PRIMARY KEY REFERENCES orders(id),status TEXT NOT NULL,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS counters(key TEXT PRIMARY KEY,value INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS user_wishlist(user_id TEXT NOT NULL REFERENCES users(id),variant_id TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(user_id,variant_id));
CREATE TABLE IF NOT EXISTS product_reviews(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),user_id TEXT NOT NULL REFERENCES users(id),rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),title TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),created TEXT NOT NULL,updated TEXT NOT NULL,UNIQUE(product_id,user_id));
CREATE INDEX IF NOT EXISTS product_review_status ON product_reviews(product_id,status);

`);
const columns=new Set(db.prepare('PRAGMA table_info(orders)').all().map(x=>x.name));for(const [name,type] of [['user_id','TEXT'],['request_key','TEXT'],['request_hash','TEXT'],['fulfilment',"TEXT NOT NULL DEFAULT 'unfulfilled'"]])if(!columns.has(name))db.exec(`ALTER TABLE orders ADD COLUMN ${name} ${type}`);
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS order_request ON orders(request_key); CREATE INDEX IF NOT EXISTS user_orders ON orders(user_id);');
function tx(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
const setting=key=>{const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(row.value):null;};
const set=(key,value)=>db.prepare('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));
const audit=(actor,action,target,detail={})=>db.prepare('INSERT INTO audit(actor,action,target,detail,created) VALUES(?,?,?,?,?)').run(actor,action,target,JSON.stringify(detail),new Date().toISOString());
const seedProducts=JSON.parse(readFileSync('data/products.json'));
const approvedMassImage=seedProducts.find(p=>p.id==='nitro-mass')?.variants.find(v=>v.id==='mass-5kg')?.image;
const approvedWheyImage=seedProducts.find(p=>p.id==='potency-whey')?.image;
const retiredWheySources=new Set([
 'assets/potency-whey.png',
 'https://unicornproseries.com/wp-content/uploads/2026/05/Potency-Whey-600x501-1.png',
 'https://static.wixstatic.com/media/1ff000_e90a0275d7d54a2faef71492a305f3f6~mv2.png'
]);
const removeOldWheyPhoto=entry=>!retiredWheySources.has(typeof entry==='string'?entry:entry?.src);

const referenceVariants=new Map(seedProducts.flatMap(p=>p.variants.map(v=>[v.id,{...v,productId:p.id}])));
if(!setting('seeded'))tx(()=>{const seed=seedProducts;for(const p of seed){p.id ||= 'product-'+randomUUID();db.prepare('INSERT INTO products VALUES(?,?)').run(p.id,JSON.stringify(p));for(const v of p.variants)db.prepare('INSERT INTO inventory(variant_id,on_hand) VALUES(?,?)').run(v.id,v.stock);}for(const row of db.prepare("SELECT payload FROM orders WHERE status='paid'").all())for(const line of JSON.parse(row.payload).lines)db.prepare('UPDATE inventory SET on_hand=MAX(0,on_hand-?) WHERE variant_id=?').run(line.quantity,line.variantId);set('store',JSON.parse(readFileSync('data/store.json')));set('tax',{enabled:false,approved:false,sellerStateCode:'33',sellerGstin:'',legalName:'',address:'',shippingRateBps:0,invoicePrefix:'MV'});set('seeded',true);});
function reserved(){const amounts=new Map();for(const row of db.prepare("SELECT payload FROM orders WHERE status IN ('preparing','pending','provider_review')").all())for(const l of JSON.parse(row.payload).lines)amounts.set(l.variantId,(amounts.get(l.variantId)||0)+l.quantity);return amounts;}
function catalogue(user,admin=false){const held=reserved(),tier=pricingTier(user);return db.prepare('SELECT data FROM products ORDER BY rowid').all().map(row=>{const p=JSON.parse(row.data);if(p.id==='potency-whey'){if(retiredWheySources.has(p.image))p.image=null;if(Array.isArray(p.images))p.images=p.images.filter(removeOldWheyPhoto);}if(p.id==='potency-whey'&&approvedWheyImage&&p.image==='assets/potency-whey.png')p.image=approvedWheyImage;if(p.id==='nitro-mass'&&approvedMassImage&&p.image==='assets/nitro-mass-5kg.jpg')p.image=approvedMassImage;if(p.id==='pro-creatine'&&p.image==='assets/pro-creatine.png')p.image=null;if(p.id==='sturdy-pre'&&p.image==='assets/sturdy-pre-workout.png'){const current=seedProducts.find(x=>x.id==='sturdy-pre');p.image=current.image;if(!Array.isArray(p.images)||p.images.length===0)p.images=current.images||[];}p.brand ||= ['potency-whey','nitro-mass','pro-creatine','sturdy-pre','musclevite'].includes(p.id)?'Unicorn Pro Series':'Brand to confirm';p.variants=p.variants.map(v=>{if(p.id==='potency-whey'){if(retiredWheySources.has(v.image))v={...v,image:null};if(Array.isArray(v.images))v={...v,images:v.images.filter(removeOldWheyPhoto)};}if(p.id==='pro-creatine'&&['creatine-blueberry','creatine-cranberry'].includes(v.id)){
 // Supplier's existing Blueberry/Cranberry imagery is for 250 g; do not use on the owner's 100 g SKUs.
 const wrongPack=new Set(['assets/pro-creatine.png','https://unicornproseries.com/wp-content/uploads/2026/05/Pro-Creatine-Blueberry-1.png']);
 if(!Object.hasOwn(v,'image')||wrongPack.has(v.image))v={...v,image:null};
 if(Array.isArray(v.images))v={...v,images:v.images.filter(photo=>!wrongPack.has(typeof photo==='string'?photo:photo?.src))};
}
const reference=referenceVariants.get(v.id);if(reference?.productId===p.id&&reference.image&&((!Object.hasOwn(v,'image'))||v.image===null||v.image==='assets/sturdy-pre-workout.png'||v.image==='assets/pro-creatine.png')){
 const safeVariant=(v.id==='whey-coffee'||v.id==='pre-watermelon');
 if(safeVariant){v={...v,image:reference.image};if(!Array.isArray(v.images)||v.images.length===0)v.images=reference.images||[];}
}if(reference?.productId===p.id&&reference.label===v.label&&reference.prices&&!Object.hasOwn(v,'prices'))v={...v,prices:{...reference.prices}};if(p.id==='potency-whey'&&approvedWheyImage&&reference?.productId===p.id&&reference.label===v.label&&v.image==='assets/potency-whey.png')v={...v,image:approvedWheyImage};if(p.id==='nitro-mass'&&v.id==='mass-5kg'&&approvedMassImage&&v.image==='assets/nitro-mass-5kg.jpg')v={...v,image:approvedMassImage};if(!Object.hasOwn(v,'mrpPaise')&&reference?.productId===p.id&&reference.label===v.label&&Number.isSafeInteger(reference.mrpPaise)&&reference.mrpPaise>=Math.max(v.pricePaise||0,...Object.values(v.prices||{})))v={...v,mrpPaise:reference.mrpPaise};const inv=db.prepare('SELECT * FROM inventory WHERE variant_id=?').get(v.id);let price=v.pricePaise;if(!admin&&tier!=='retail')price=v.prices?.[tier]??null;const result={...v,pricePaise:price,stock:inv?.on_hand===null?null:Math.max(0,(inv?.on_hand??0)-(held.get(v.id)||0))};if(admin)return {...result,onHand:inv?.on_hand,reserved:held.get(v.id)||0,version:inv?.version??0};delete result.prices;return result;});return p;});}
function pricingTier(user){if(!user)return 'retail';const d=db.prepare("SELECT kind FROM dealers WHERE user_id=? AND status='approved'").get(user.id);return d?.kind||'retail';}
function session(req){const raw=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('mvn_session='))?.slice(12);if(!raw)return null;return db.prepare('SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?').get(hash(raw),Date.now())||null;}
function issueSession(user){const token=randomBytes(32).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(token),user.id,Date.now()+7*86400000);return token;}
const safeUser=u=>u?{id:u.id,name:u.name,email:u.email,role:u.role,tier:pricingTier(u),dealer:db.prepare('SELECT kind,business,gstin,status FROM dealers WHERE user_id=?').get(u.id)||null}:null;
function publicOrder(row){const p=JSON.parse(row.payload);return {id:row.id,status:row.status,fulfilment:row.fulfilment,created:row.created,totalPaise:p.totalPaise,lines:p.lines,tax:p.tax,customer:p.customer,shipment:db.prepare('SELECT status,data FROM shipments WHERE order_id=?').get(row.id)||null,invoice:db.prepare('SELECT number FROM invoices WHERE order_id=?').get(row.id)?.number||null};}
return {db,tx,setting,set,audit,catalogue,pricingTier,session,issueSession,safeUser,publicOrder};}
export function taxQuote(order,products,customer,config){if(!config.enabled)return {...order,tax:{enabled:false,totalPaise:0}};if(!config.approved||!/^\d{2}[A-Z0-9]{13}$/.test(config.sellerGstin)||!config.legalName||!config.address)fail(400,'GST setup needs approval and seller details.');const destination=stateCode(customer.state);if(!destination)fail(400,'GST place of supply is not configured.');const intra=destination===config.sellerStateCode;let taxTotal=0,cgst=0,sgst=0,igst=0;const split=(amount,rate)=>{const t=Math.round(amount*rate/(10000+rate));const c=intra?Math.floor(t/2):0;return {taxablePaise:amount-t,taxPaise:t,cgstPaise:c,sgstPaise:intra?t-c:0,igstPaise:intra?0:t};};
const lines=order.lines.map(l=>{const p=products.find(p=>p.variants.some(v=>v.id===l.variantId));if(!/^\d{4,8}$/.test(p.hsn||'')||!Number.isSafeInteger(p.gstRateBps))fail(400,'Product HSN and GST rate must be configured.');const t=split(l.unitPaise*l.quantity,p.gstRateBps);taxTotal+=t.taxPaise;cgst+=t.cgstPaise;sgst+=t.sgstPaise;igst+=t.igstPaise;return {...l,hsn:p.hsn,gstRateBps:p.gstRateBps,...t};});const shipping=split(order.shippingPaise,integer(config.shippingRateBps,0,2800));taxTotal+=shipping.taxPaise;cgst+=shipping.cgstPaise;sgst+=shipping.sgstPaise;igst+=shipping.igstPaise;return {...order,lines,tax:{enabled:true,inclusive:true,placeOfSupply:destination,totalPaise:taxTotal,cgstPaise:cgst,sgstPaise:sgst,igstPaise:igst,shipping,seller:{gstin:config.sellerGstin,name:config.legalName,address:config.address},prefix:config.invoicePrefix}};}
export function stateCode(state){return {'Tamil Nadu':'33','Karnataka':'29','Kerala':'32','Andhra Pradesh':'37','Telangana':'36','Maharashtra':'27','Delhi':'07','Puducherry':'34'}[state];}
