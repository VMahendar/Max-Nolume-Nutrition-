import test from 'node:test';
import assert from 'node:assert/strict';
import {activeUpdates,validateUpdate,whatsappUpdateReadiness} from '../store-updates.mjs';
const base={id:'launch',title:'New launch',body:'Retail announcement',kind:'launch',surface:'all',image:'',imageAlt:'',startsAt:'2026-11-07T00:00:00+05:30',endsAt:'2026-11-10T00:00:00+05:30',enabled:true};
test('store updates respect exact schedule boundaries and website/app audience; drafts remain private',()=>{
 const post=validateUpdate(base),start=Date.parse(post.startsAt),end=Date.parse(post.endsAt);
 assert.equal(activeUpdates([post],'web',start).length,1);assert.equal(activeUpdates([post],'app',end-1).length,1);
 assert.equal(activeUpdates([post],'app',end).length,0);assert.equal(activeUpdates([post],'web',start-1).length,0);
 assert.equal(activeUpdates([{...post,surface:'app'}],'web',start).length,0);assert.equal(activeUpdates([{...post,enabled:false}],'app',start).length,0);
 assert.equal(activeUpdates([post],'wrong',start).length,0);
});
test('published updates require timezone-aware dates and approved image paths; unconfigured WhatsApp fails closed',()=>{
 assert.throws(()=>validateUpdate({...base,endsAt:''}));assert.throws(()=>validateUpdate({...base,startsAt:'2026-11-07T00:00'}));
 for(const image of ['javascript:alert(1)','https://elsewhere.example/photo.jpg','assets/../private.jpg','assets/test.svg'])assert.throws(()=>validateUpdate({...base,image,imageAlt:'Image'}));
 assert.throws(()=>validateUpdate({...base,image:'assets/test.jpg'}));
 assert.equal(validateUpdate({...base,enabled:false,startsAt:'',endsAt:''}).enabled,false);
 assert.equal(whatsappUpdateReadiness({}).ready,false);
});
