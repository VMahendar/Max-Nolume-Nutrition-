// Read-only launch gate. Never stores, displays or tests secret values.
// Invoke on the deployment host: npm run launch:audit
import {readFileSync,existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';

export function evaluateLaunch({env={},products=[],store={},tax={},databaseExists=false}={}){
 const yes=x=>x==='true';
 const verified=x=>typeof x==='string'&&x.trim().length>0;
 const checks=[];
 const add=(id,ready,detail)=>checks.push({id,ready:!!ready,detail});
 let host='';
 try{const u=new URL(env.PUBLIC_ORIGIN||'');if(u.protocol==='https:')host=u.hostname;}catch{}
 const custom=verified(env.CUSTOM_DOMAIN)&&host===env.CUSTOM_DOMAIN&&host!=='localhost'&&!host.endsWith('.onrender.com')&&!host.endsWith('.example');
 add('custom_domain',custom,'Owned HTTPS domain with DNS verified and PUBLIC_ORIGIN matching the domain');
 add('durable_database',databaseExists&&yes(env.PERSISTENT_STORAGE_VERIFIED)&&verified(env.DATA_DIR)&&!String(env.DATA_DIR).startsWith('/tmp'),'Persistent database volume with storage verified; the Render Free filesystem must not hold production orders');
 add('offsite_backups',yes(env.OFFSITE_BACKUP_CONFIGURED)&&yes(env.BACKUP_RESTORE_TESTED),'Automated encrypted offsite backups and a successful isolated restore test');
 add('production_mode',env.NODE_ENV==='production'&&env.STAGING_MODE==='false','Production server entry point; staging cannot process payments or shipments');
 const gateway=env.RAZORPAY_KEY_ID?.startsWith('rzp_live_')&&verified(env.RAZORPAY_KEY_SECRET)&&verified(env.RAZORPAY_WEBHOOK_SECRET);
 add('payments',yes(env.PAYMENTS_ENABLED)&&env.PAYMENT_MODE==='live'&&yes(env.RAZORPAY_TESTED)&&yes(env.LIVE_PAYMENTS_APPROVED)&&yes(env.POLICIES_APPROVED)&&gateway,'Razorpay live merchant credentials, captured-payment/webhook testing and explicit activation approval');
 add('shipping',yes(env.SHIPROCKET_ENABLED)&&yes(env.SHIPROCKET_TESTED)&&verified(env.SHIPROCKET_EMAIL)&&verified(env.SHIPROCKET_PASSWORD)&&verified(env.SHIPROCKET_PICKUP),'Shiprocket merchant credentials, pickup location and verified courier tests');
 add('business_settings',verified(store.address)&&verified(store.supportEmail)&&Number.isSafeInteger(store.shippingPaise)&&Array.isArray(store.serviceStates)&&store.serviceStates.length>0,'Verified seller contact address, shipping fee and service regions set in admin');
 add('tax_invoice',tax.enabled===true&&tax.approved===true&&/^\d{2}[A-Z0-9]{13}$/.test(tax.sellerGstin||'')&&verified(tax.legalName)&&verified(tax.address),'Owner-approved legal entity, GSTIN, seller address and GST invoice configuration');
 const all=products.flatMap(p=>(p.variants||[]).map(v=>({p,v})));
 const missingImages=all.filter(({p,v})=>{
  const image=Object.hasOwn(v,'image')?v.image:p.image;
  return !verified(image);
 }).map(({p,v})=>p.name+' / '+v.label);
 add('pack_photographs',all.length>=8&&missingImages.length===0,missingImages.length?missingImages.join('; '):'All current variants have a verified current pack image');
 const missingGallery=all.filter(({p,v})=>{
  const gallery=Object.hasOwn(v,'images')?v.images:p.images;
  if(!Array.isArray(gallery))return true;
  const labels=gallery.map(x=>typeof x==='object'&&x?String(x.label||'').toLowerCase():'');
  return !['front','back','ingredients'].every(required=>labels.some(label=>label.includes(required)));
 }).map(({p,v})=>p.name+' / '+v.label);
 add('product_labels',all.length>=8&&missingGallery.length===0,'Pack-specific front, back and ingredient-label photos confirmed for all variants');
 const stock=all.every(({v})=>Number.isSafeInteger(v.stock)&&v.stock>=0);
 add('stock_counts',stock,'Admin has entered verified on-hand quantities (including intentional zero stock) for every SKU');
 add('verified_email_recovery',yes(env.ACCOUNT_EMAIL_VERIFICATION_TESTED)&&yes(env.PASSWORD_RESET_TESTED),'Verified customer email ownership and self-service account recovery tested');
 return {ready:checks.every(c=>c.ready),passed:checks.filter(c=>c.ready).length,total:checks.length,checks};
}

export function readLaunchStatus(env=process.env){
 const products=JSON.parse(readFileSync(resolve('data/products.json'),'utf8'));
 let store={},tax={},databaseExists=false;
 const path=resolve(env.DATA_DIR||'runtime','orders.sqlite');
 if(existsSync(path)){
  databaseExists=true;
  let db;
  try{
   db=new DatabaseSync(path,{readOnly:true});
   const s=db.prepare("SELECT value FROM settings WHERE key='store'").get();
   const t=db.prepare("SELECT value FROM settings WHERE key='tax'").get();
   store=s?JSON.parse(s.value):{};tax=t?JSON.parse(t.value):{};
   const current=db.prepare('SELECT data FROM products').all().map(row=>JSON.parse(row.data));
   if(current.length)products.splice(0,products.length,...current);
   for(const p of products)for(const v of p.variants){
    const inv=db.prepare('SELECT on_hand FROM inventory WHERE variant_id=?').get(v.id);
    v.stock=inv?.on_hand??null;
   }
  }finally{db?.close()}
 }
 return evaluateLaunch({env,products,store,tax,databaseExists});
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const report=readLaunchStatus();
 console.log(JSON.stringify(report,null,2));
 if(!report.ready&&!process.argv.includes('--report'))process.exitCode=1;
}
