import {randomUUID} from 'node:crypto';
import {fail,clean,integer} from './commerce.mjs';

export function initializeOwnerDesk(C){
 C.db.exec(`CREATE TABLE IF NOT EXISTS owner_entries(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,payload TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS store_update_images(path TEXT PRIMARY KEY,content BLOB NOT NULL);`);
}
export function recordOwnerEntry(C,user,b){
 if(b.confirmed!==true)fail(400,'Review and confirm this stock movement first.');
 const requestKey=clean(b.requestKey,80);if(!/^[a-z0-9-]+$/.test(requestKey))fail(400,'Invalid entry reference.');
 const kind=b.kind;if(!['purchase','sale'].includes(kind))fail(400,'Choose stock received or a completed manual sale.');
 const variantId=clean(b.variantId,80),quantity=integer(b.quantity,1,10000),unitPaise=integer(b.unitPaise,0,10000000),version=integer(b.version);
 const contact=clean(b.contact,160),reference=clean(b.reference,160),note=b.note?clean(b.note,500):'';
 const request={kind,variantId,quantity,unitPaise,version,contact,reference,note};
 return C.tx(()=>{
  const previous=C.db.prepare('SELECT payload FROM owner_entries WHERE request_key=?').get(requestKey);
  if(previous){const entry=JSON.parse(previous.payload);if(JSON.stringify(entry.request)!==JSON.stringify(request))fail(409,'This reference was used for a different entry.');return entry;}
  if(C.db.prepare("SELECT 1 FROM owner_entries WHERE json_extract(payload,'$.kind')=? AND json_extract(payload,'$.contact')=? AND json_extract(payload,'$.reference')=? AND json_extract(payload,'$.variantId')=?").get(kind,contact,reference,variantId))fail(409,'This product and bill/order reference were already recorded for this supplier/customer.');
  const product=C.catalogue(user,true).find(p=>p.variants.some(v=>v.id===variantId)),variant=product?.variants.find(v=>v.id===variantId);
  if(!variant)fail(404,'Choose a product pack.');
  if(!Number.isSafeInteger(variant.onHand))fail(409,'Count and set the starting stock in Inventory first.');
  const onHand=variant.onHand+(kind==='purchase'?quantity:-quantity);
  if(onHand<variant.reserved)fail(409,'Not enough unreserved stock for this sale.');
  if(onHand>100000000)fail(400,'Stock quantity is too large.');
  if(C.db.prepare('UPDATE inventory SET on_hand=?,version=version+1 WHERE variant_id=? AND version=?').run(onHand,variantId,version).changes!==1)fail(409,'Stock changed. Reload the desk and review again.');
  const entry={id:randomUUID(),...request,request,product:product.name,pack:variant.label,totalPaise:quantity*unitPaise,created:new Date().toISOString()};
  C.db.prepare('INSERT INTO owner_entries VALUES(?,?,?,?)').run(entry.id,requestKey,JSON.stringify(entry),entry.created);
  C.audit(user.id,'owner.'+kind,entry.id,{variantId,quantity,onHand});return entry;
 });
}
