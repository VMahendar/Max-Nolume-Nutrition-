// Disabled by default; call only AFTER a durable order transaction commits.
// Configuration must be supplied as Render secrets, not committed to GitHub.
// No notifications are sent by importing this file.
export const ALERT_EMAIL='mahendar0605@gmail.com';
export const ALERT_WHATSAPP='917708830513';
export function notificationConfig(env=process.env){
  return {enabled:env.ORDER_ALERTS_ENABLED==='true',email:env.ORDER_ALERT_EMAIL||ALERT_EMAIL,
    phone:env.ORDER_ALERT_WHATSAPP||ALERT_WHATSAPP,
    resendKey:env.RESEND_API_KEY||'',sender:env.ORDER_ALERT_SENDER||'',
    waToken:env.WHATSAPP_ACCESS_TOKEN||'',waPhoneId:env.WHATSAPP_PHONE_NUMBER_ID||'',
    waTemplate:env.WHATSAPP_TEMPLATE_NAME||'',waLanguage:env.WHATSAPP_TEMPLATE_LANGUAGE||'en'};
}
export function orderSummary(order){
  if(!order||typeof order.id!=='string'||!/^MV-[a-z0-9-]{6,60}$/i.test(order.id))throw Error('Invalid order');
  if(!Number.isSafeInteger(order.totalPaise)||order.totalPaise<0)throw Error('Invalid total');
  const items=Array.isArray(order.lines)?order.lines:[];
  if(!items.length||items.length>100)throw Error('Invalid lines');
  const lineText=items.map(l=>{if(!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>999)throw Error('Invalid quantity');return String(l.name||'Product').slice(0,90)+' x '+l.quantity;}).join('; ');
  return {id:order.id,total:'INR '+(order.totalPaise/100).toFixed(2),items:lineText.slice(0,700)};
}
async function post(url,headers,payload,request=fetch){
  const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),8000);
  try{const r=await request(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload),signal:ac.signal});
    if(!r.ok)throw Error('Notification provider returned HTTP '+r.status);
    return true;
  }finally{clearTimeout(timer);}
}
// Returns channel results; failures never roll back a committed order.
// Caller must persist and retry failed delivery via an idempotent outbox.
export async function notifyOrder(order,{env=process.env,request=fetch}={}){
  const c=notificationConfig(env);if(!c.enabled)return {email:'disabled',whatsapp:'disabled'};
  const s=orderSummary(order);
  const result={email:'unconfigured',whatsapp:'unconfigured'};
  if(c.resendKey&&c.sender){
    try{await post('https://api.resend.com/emails',{'Authorization':'Bearer '+c.resendKey},{
      from:c.sender,to:[c.email],subject:'MVN new order '+s.id,
      text:'New order needs manual confirmation.\nOrder: '+s.id+'\nAmount: '+s.total+'\nItems: '+s.items+'\nPayment: NOT PAID. No courier booked.'
    },request);result.email='sent';}catch(e){result.email='failed';}
  }
  if(c.waToken&&c.waPhoneId&&c.waTemplate){
    try{await post('https://graph.facebook.com/v23.0/'+encodeURIComponent(c.waPhoneId)+'/messages',{
      Authorization:'Bearer '+c.waToken
    },{messaging_product:'whatsapp',to:c.phone,type:'template',template:{
      name:c.waTemplate,language:{code:c.waLanguage},
      components:[{type:'body',parameters:[{type:'text',text:s.id},{type:'text',text:s.total}]}]
    }},request);result.whatsapp='sent';}catch(e){result.whatsapp='failed';}
  }
  return result;
}
