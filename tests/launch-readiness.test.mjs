import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateLaunch} from '../deploy/launch-readiness.mjs';

function fixture(){
 const prices={'whey-chocolate':550000,'whey-coffee':550000,'mass-5kg':349900,'mass-3kg':259900,'creatine-blueberry':89900,'creatine-cranberry':89900,'pre-watermelon':180000,'musclevite-pack':69900};
 return Object.entries(prices).map(([id,pricePaise])=>({name:id,image:'assets/current-'+id+'.png',variants:[{id,label:id,pricePaise,stock:5,images:[{src:'assets/front.png',label:'Front'},{src:'assets/back.png',label:'Back'},{src:'assets/ingredients.png',label:'Ingredients'}]}]}));
}
const readyEnv={
 NODE_ENV:'production',STAGING_MODE:'false',PUBLIC_ORIGIN:'https://maxvolumenutrition.in',CUSTOM_DOMAIN:'maxvolumenutrition.in',
 DATA_DIR:'/var/data/mvn',PERSISTENT_STORAGE_VERIFIED:'true',
 OFFSITE_BACKUP_CONFIGURED:'true',BACKUP_RESTORE_TESTED:'true',
 PAYMENTS_ENABLED:'true',PAYMENT_MODE:'live',RAZORPAY_TESTED:'true',LIVE_PAYMENTS_APPROVED:'true',POLICIES_APPROVED:'true',
 RAZORPAY_KEY_ID:'rzp_live_testfixture',RAZORPAY_KEY_SECRET:'testing-only',RAZORPAY_WEBHOOK_SECRET:'testing-only',
 SHIPROCKET_ENABLED:'true',SHIPROCKET_TESTED:'true',SHIPROCKET_EMAIL:'fixture@example.test',SHIPROCKET_PASSWORD:'fixture',SHIPROCKET_PICKUP:'Warehouse',
 ACCOUNT_EMAIL_VERIFICATION_TESTED:'true',PASSWORD_RESET_TESTED:'true'
};
const store={address:'Verified address',supportEmail:'support@example.test',shippingPaise:20000,serviceStates:['Tamil Nadu']};
const tax={enabled:true,approved:true,sellerGstin:'33ABCDE1234F1Z5',legalName:'Test Firm',address:'Test Business Address'};

test('launch gate only reports ready when every external dependency is explicitly verified',()=>{
 const p=fixture();
 const a=evaluateLaunch({env:readyEnv,products:p,store,tax,databaseExists:true});
 assert.equal(a.ready,true);
 assert.equal(a.passed,a.total);
 for(const [field,value]of [['STAGING_MODE','true'],['PERSISTENT_STORAGE_VERIFIED','false'],['OFFSITE_BACKUP_CONFIGURED','false'],['RAZORPAY_TESTED','false'],['SHIPROCKET_TESTED','false'],['PAYMENT_MODE','test'],['CUSTOM_DOMAIN','example.com'],['ACCOUNT_EMAIL_VERIFICATION_TESTED','false']]){
  const report=evaluateLaunch({env:{...readyEnv,[field]:value},products:p,store,tax,databaseExists:true});
  assert.equal(report.ready,false,field+' must block production launch');
 }
});
test('missing pack photos and ingredients prevent false production ready; no provider secrets printed',()=>{
 const p=fixture();
 const whey=p.find(x=>x.name==='whey-coffee');whey.variants[0].image=null;
 p[0].variants[0].images=[{src:'assets/front.png',label:'Front'}];
 const report=evaluateLaunch({env:readyEnv,products:p,store,tax,databaseExists:true});
 assert.equal(report.ready,false);
 assert.ok(report.checks.find(x=>x.id==='pack_photographs').detail.includes('whey-coffee'));
 assert.equal(report.checks.find(x=>x.id==='product_labels').ready,false);
 assert.ok(!JSON.stringify(report).includes('rzp_live_testfixture'));
 assert.ok(!JSON.stringify(report).includes('fixture@example.test'));
});
test('default Render staging + unknown domain and storage is never production-ready',()=>{
 const report=evaluateLaunch({env:{NODE_ENV:'production',STAGING_MODE:'true',PUBLIC_ORIGIN:'https://max-volume-nutrition-preview.onrender.com',DATA_DIR:'/tmp/mvn'},products:fixture()});
 assert.equal(report.ready,false);
 assert.equal(report.checks.find(x=>x.id==='durable_database').ready,false);
 assert.equal(report.checks.find(x=>x.id==='payments').ready,false);
 assert.equal(report.checks.find(x=>x.id==='shipping').ready,false);
 assert.equal(report.checks.find(x=>x.id==='custom_domain').ready,false);
});
