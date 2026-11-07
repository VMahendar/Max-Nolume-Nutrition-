import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationConfig,orderSummary,notifyOrder} from '../order-notifications.mjs';
const order={id:'MV-1234567890',totalPaise:499900,lines:[{name:'Potency Whey Chocolate',quantity:1}]};
test('order notifications are off by default and make no external requests',async()=>{
 let calls=0; const r=await notifyOrder(order,{env:{},request:async()=>{calls++;throw Error('Unexpected network');}});
 assert.deepEqual(r,{email:'disabled',whatsapp:'disabled'});assert.equal(calls,0);
});
test('configured recipients and summary are correct',()=>{
 const c=notificationConfig({ORDER_ALERTS_ENABLED:'true'});
 assert.equal(c.phone,'917708830513');assert.equal(c.email,'mahendar0605@gmail.com');
 assert.deepEqual(orderSummary(order),{id:'MV-1234567890',total:'INR 4999.00',items:'Potency Whey Chocolate x 1'});
 assert.throws(()=>orderSummary({...order,totalPaise:-1}));assert.throws(()=>orderSummary({...order,lines:[]}));
});
test('email and WhatsApp use provider APIs with payment clearly pending',async()=>{
 const calls=[]; const request=async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return {ok:true,status:200};};
 const env={ORDER_ALERTS_ENABLED:'true',RESEND_API_KEY:'test-resend',ORDER_ALERT_SENDER:'orders@example.com',
 WHATSAPP_ACCESS_TOKEN:'test-whatsapp',WHATSAPP_PHONE_NUMBER_ID:'12345',WHATSAPP_TEMPLATE_NAME:'mvn_new_order'};
 const result=await notifyOrder(order,{env,request});
 assert.deepEqual(result,{email:'sent',whatsapp:'sent'});
 assert.equal(calls.length,2);assert.equal(calls[0].body.to[0],'mahendar0605@gmail.com');
 assert.match(calls[0].body.text,/NOT PAID/);
 assert.equal(calls[1].body.to,'917708830513');assert.equal(calls[1].body.template.name,'mvn_new_order');
});
test('failed providers return failed without reporting a sent alert',async()=>{
 const env={ORDER_ALERTS_ENABLED:'true',RESEND_API_KEY:'test',ORDER_ALERT_SENDER:'orders@example.com'};
 const result=await notifyOrder(order,{env,request:async()=>({ok:false,status:503})});
 assert.equal(result.email,'failed');assert.equal(result.whatsapp,'unconfigured');
});
