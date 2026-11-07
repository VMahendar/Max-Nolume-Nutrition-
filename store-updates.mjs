import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';

const text=(value,max,required=false)=>{
 if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('Complete the update text within the displayed limits.');
 return value.trim();
};
export function validateUpdate(input){
 if(!input||typeof input!=='object')throw Error('Provide a store update.');
 const id=text(input.id,60,true),title=text(input.title,100,true),body=text(input.body,1000,true);
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Use a valid update ID.');
 if(!['all','web','app'].includes(input.surface)||!['stock','launch','deal','news'].includes(input.kind))throw Error('Choose an update type and audience.');
 const image=text(input.image||'',300),imageAlt=text(input.imageAlt||'',150);
 if(image&&(!/^assets\/[a-zA-Z0-9_./-]+\.(?:png|jpe?g|webp)$/.test(image)||image.includes('..')||!imageAlt))throw Error('Use an uploaded assets/ image and describe it.');
 const startsAt=String(input.startsAt||''),endsAt=String(input.endsAt||'');
 if(startsAt||endsAt||input.enabled===true){
  if(![startsAt,endsAt].every(d=>Number.isFinite(Date.parse(d))&&/(?:Z|[+-]\d\d:\d\d)$/.test(d))||Date.parse(endsAt)<=Date.parse(startsAt))throw Error('Choose start and end dates, with the end after the start.');
 }
 return {id,title,body,kind:input.kind,surface:input.surface,image,imageAlt,startsAt,endsAt,enabled:input.enabled===true};
}
export function activeUpdates(posts,surface='web',now=Date.now()){
 if(!['web','app'].includes(surface))return [];
 return (posts||[]).filter(p=>p.enabled&&(p.surface==='all'||p.surface===surface)&&Date.parse(p.startsAt)<=now&&now<Date.parse(p.endsAt))
  .sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt)).slice(0,12);
}
export const updateConfig=C=>C.setting('storeUpdates')||{revision:0,posts:[]};
export function initializeUpdates(C){
 C.db.exec('CREATE TABLE IF NOT EXISTS store_update_receipts(message_id TEXT PRIMARY KEY,created TEXT NOT NULL)');
}
export function whatsappUpdateReadiness(env=process.env){
 const ready=env.WHATSAPP_UPDATES_ENABLED==='true'&&typeof env.WHATSAPP_APP_SECRET==='string'&&env.WHATSAPP_APP_SECRET.length>=16&&typeof env.WHATSAPP_UPDATES_VERIFY_TOKEN==='string'&&env.WHATSAPP_UPDATES_VERIFY_TOKEN.length>=32&&/^\d{6,20}$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')&&/^\d{10,15}$/.test(env.WHATSAPP_UPDATES_OWNER_PHONE||'');
 return {ready,message:ready?'Webhook configured; confirm the Meta subscription with a real test message.':'WhatsApp update intake is disconnected. Official Business API setup and your approved sender number are required.'};
}
export function validUpdateSignature(raw,signature,secret){
 if(typeof secret!=='string'||secret.length<16||!/^sha256=[a-f0-9]{64}$/.test(signature||''))return false;
 const expected='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 return timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
export function receiveWhatsappUpdates(C,payload,env=process.env){
 if(!whatsappUpdateReadiness(env).ready)throw Error('WhatsApp update intake is disconnected.');
 if(payload?.object!=='whatsapp_business_account')return 0;
 let added=0;
 C.tx(()=>{
  for(const entry of payload.entry||[])for(const change of entry.changes||[]){
   if(change.field!=='messages'||change.value?.metadata?.phone_number_id!==env.WHATSAPP_PHONE_NUMBER_ID)continue;
   for(const message of change.value?.messages||[]){
    if(message.from!==env.WHATSAPP_UPDATES_OWNER_PHONE||message.type!=='text'||typeof message.id!=='string'||message.id.length>250)continue;
    const content=message.text?.body;
    if(typeof content!=='string'||!/^MVN UPDATE\r?\n/i.test(content)||content.length>1120)continue;
    const [,title,...lines]=content.split(/\r?\n/),body=lines.join('\n').trim();
    let post;try{post=validateUpdate({id:'update-'+randomUUID(),title,body,kind:'news',surface:'all',enabled:false});}catch{continue;}
    if(C.db.prepare('SELECT 1 FROM store_update_receipts WHERE message_id=?').get(message.id))continue;
    const config=updateConfig(C);
    if(config.posts.length>=40)continue;
    C.db.prepare('INSERT INTO store_update_receipts VALUES(?,?)').run(message.id,new Date().toISOString());
    C.set('storeUpdates',{revision:config.revision+1,posts:[post,...config.posts]});
    C.audit('whatsapp-owner','store-update.draft',post.id);added++;
   }
  }
 });return added;
}
