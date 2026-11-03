import {DatabaseSync} from 'node:sqlite';import {resolve} from 'node:path';
const db=new DatabaseSync(resolve(process.env.DATA_DIR||'runtime','orders.sqlite'),{readOnly:true});
const rows=db.prepare('SELECT id,status,payment_id,created,payload FROM orders ORDER BY created DESC LIMIT 50').all();
for(const r of rows){const p=JSON.parse(r.payload);console.log(JSON.stringify({reference:r.id,status:r.status,payment:r.payment_id,created:r.created,totalINR:p.totalPaise/100,customer:p.customer,items:p.lines}));}
