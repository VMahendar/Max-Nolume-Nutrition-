import {existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {openCommerce,passwordHash} from '../commerce.mjs';
if(process.env.STAGING_MODE!=='true'||!process.env.DATA_DIR)throw Error('Explicit STAGING_MODE and isolated DATA_DIR are required.');
const dir=resolve(process.env.DATA_DIR),marker=resolve(dir,'staging-only.json');
if(existsSync(marker)){const value=JSON.parse(readFileSync(marker,'utf8'));if(value.purpose!=='mvn-staging-test-data'||value.version!==1)throw Error('Unrecognized data directory.');console.log('Existing isolated staging data retained.');process.exit(0);}
if(existsSync(resolve(dir,'orders.sqlite')))throw Error('Refusing to seed an existing unmarked database. Production data must never be imported into staging.');
for(const key of ['STAGING_ADMIN_PASSWORD','STAGING_CUSTOMER_PASSWORD'])if(typeof process.env[key]!=='string'||process.env[key].length<16)throw Error(key+' must contain at least 16 characters.');
const adminHash=await passwordHash(process.env.STAGING_ADMIN_PASSWORD),customerHash=await passwordHash(process.env.STAGING_CUSTOMER_PASSWORD);
mkdirSync(dir,{recursive:true,mode:0o700});const C=openCommerce(dir);
try{C.tx(()=>{
 const now=new Date().toISOString();
 for(const [id,email,name,password,role] of [['staging-admin','staging-admin@example.test','Staging Administrator',adminHash,'admin'],['staging-customer','staging-customer@example.test','Staging Customer',customerHash,'customer']])C.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,email,name,password,role,now);
 C.db.prepare('UPDATE inventory SET on_hand=10,version=version+1').run();
 const store=C.setting('store');store.address='TEST DATA ONLY — Staging demonstration';store.supportEmail='support@example.test';store.shippingPaise=0;C.set('store',store);C.set('tax',{...C.setting('tax'),enabled:false,approved:false});
 C.db.prepare('INSERT INTO dealers VALUES(?,?,?,?,?,?,?)').run('staging-customer','wholesale','TEST — Demonstration Wholesale Business','','pending',null,now);
 const products=C.catalogue(null),p=products.find(p=>p.id==='nitro-mass'),v=p?.variants.find(v=>v.id==='mass-5kg');
 if(v){const order={lines:[{variantId:v.id,quantity:1,name:p.name,variant:v.label,unitPaise:v.pricePaise}],subtotalPaise:v.pricePaise,shippingPaise:0,totalPaise:v.pricePaise,currency:'INR',tier:'retail',tax:{enabled:false,totalPaise:0},customer:{name:'TEST — Staging Customer',email:'staging-customer@example.test',phone:'9000000000',address:'TEST ADDRESS — Not for delivery',city:'Chennai',pincode:'600001',state:'Tamil Nadu'},testData:true};C.db.prepare('INSERT INTO orders(id,token,status,payload,created,user_id) VALUES(?,?,?,?,?,?)').run('TEST-MV-DEMO-001',randomBytes(32).toString('hex'),'paid',JSON.stringify(order),now,'staging-customer');C.db.prepare('UPDATE inventory SET on_hand=on_hand-1 WHERE variant_id=?').run(v.id);}
 C.audit('staging-init','staging.seed','test-only',{synthetic:true,realIntegrations:false});
 });writeFileSync(marker,JSON.stringify({purpose:'mvn-staging-test-data',version:1}),{mode:0o600,flag:'wx'});console.log('Isolated staging test data initialized.');
}finally{C.db.close();}
