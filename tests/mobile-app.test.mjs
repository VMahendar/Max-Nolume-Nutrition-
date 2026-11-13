import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('mobile offline fallback never replays orders or returns cached account data',async()=>{
 const handlers={};
 vm.runInNewContext(readFileSync('public/sw.js','utf8'),{
  self:{addEventListener:(name,fn)=>handlers[name]=fn},
  fetch:async()=>{throw Error('offline');},Response
 });
 for(const request of [{method:'POST',mode:'navigate'},{method:'GET',mode:'cors'}]){
  handlers.fetch({request,respondWith:()=>assert.fail('must not intercept writes or API requests')});
 }
 let response;
 handlers.fetch({request:{method:'GET',mode:'navigate'},respondWith:p=>{response=p;}});
 const r=await response;
 assert.equal(r.status,503);
 assert.equal(r.headers.get('Cache-Control'),'no-store');
 assert.match(await r.text(),/Orders cannot be submitted offline/);
});

test('paused app hides installation controls and suppresses browser installation',()=>{
 const handlers={};
 const actions=[{hidden:false},{hidden:false}];let prevented=false,closed=false;
 vm.runInNewContext(readFileSync('public/install-app.js','utf8'),{
  window:{addEventListener:(name,fn)=>handlers[name]=fn},
  document:{querySelectorAll:()=>actions,getElementById:()=>({close(){closed=true;}})}
 });
 assert.ok(actions.every(action=>action.hidden));
 handlers.beforeinstallprompt({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 assert.equal(closed,true);
});
