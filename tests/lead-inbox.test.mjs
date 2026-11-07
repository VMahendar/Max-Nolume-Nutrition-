import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {openCommerce} from '../commerce.mjs';
import {initializeLeadInbox,saveLead,listLeads,updateLead} from '../lead-inbox.mjs';

function withDatabase(fn){
 const dir=mkdtempSync(join(tmpdir(),'mvn-lead-'));let C;
 try{C=openCommerce(dir);initializeLeadInbox(C);return fn(C);}
 finally{C?.db.close();rmSync(dir,{recursive:true,force:true});}
}
test('wholesale enquiry is stored once, private, and follows a manual state workflow',()=>withDatabase(C=>{
 const request={requestKey:randomUUID(),kind:'wholesale',name:'Gym Owner',phone:'9876543210',region:'Puducherry',city:'Karaikal',business:'Example Fitness',businessType:'Gym / fitness studio',gstin:'',requirements:'Potency Whey 5 lb, 4 packs',acknowledgeStorage:true};
 const first=saveLead(C,request);
 assert.match(first.id,/^MVN-LEAD-/);
 assert.equal(first.recorded,true);
 assert.equal(saveLead(C,request).id,first.id);
 assert.equal(listLeads(C).total,1);
 assert.equal(listLeads(C).new,1);
 assert.equal(listLeads(C).rows[0].detail.marketingOptIn,false);
 assert.throws(()=>saveLead(C,{...request,requirements:'changed but same key'}),{status:409});
 assert.throws(()=>saveLead(C,{...request,requestKey:randomUUID(),acknowledgeStorage:false}),{status:400});
 assert.throws(()=>saveLead(C,{...request,requestKey:randomUUID(),phone:'wrong'}),{status:400});
 assert.throws(()=>saveLead(C,{...request,requestKey:randomUUID(),region:'Other'}),{status:400});
 updateLead(C,{id:'owner'}, {id:first.id,status:'quoted',ownerNote:'Follow up on trade terms',followUpAt:'2026-11-07T10:00:00+05:30'});
 const refreshed=listLeads(C);
 assert.equal(refreshed.new,0);
 assert.equal(refreshed.rows[0].status,'quoted');
 assert.equal(refreshed.rows[0].ownerNote,'Follow up on trade terms');
 assert.equal(refreshed.rows[0].followUpAt,'2026-11-07T04:30:00.000Z');
 assert.throws(()=>updateLead(C,{id:'owner'},{id:first.id,status:'published',ownerNote:'',followUpAt:null}),{status:400});
}));
test('retail order enquiry snapshots verified product variants without capturing payment',()=>withDatabase(C=>{
 const product=C.catalogue(null)[0],variant=product.variants.find(v=>Number.isSafeInteger(v.pricePaise));
 assert.ok(variant,'expected a seeded retail variant');
 const saved=saveLead(C,{requestKey:randomUUID(),kind:'retail',name:'Retail Customer',phone:'9876543210',address:'Market Road',city:'Kelambakkam',state:'Tamil Nadu',pincode:'603103',paymentPreference:'Confirm payment on WhatsApp',items:[{variantId:variant.id,quantity:2}],acknowledgeStorage:true});
 assert.equal(saved.recorded,true);
 const row=listLeads(C).rows[0];
 assert.equal(row.detail.lines[0].variantId,variant.id);
 assert.equal(row.detail.totalBeforeOffersPaise,2*variant.pricePaise);
 assert.equal(row.detail.marketingOptIn,false);
 assert.equal(row.status,'new');
 assert.throws(()=>saveLead(C,{requestKey:randomUUID(),kind:'retail',name:'Retail Customer',phone:'9876543210',address:'Market Road',city:'Kelambakkam',state:'Tamil Nadu',pincode:'603103',items:[{variantId:'not-a-real-product',quantity:1}],acknowledgeStorage:true}),{status:409});
}));
