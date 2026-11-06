import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openCommerce} from '../commerce.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('separate wholesale signup collects shop, GSTIN, location and login credentials',()=>{
 const html=read('public/wholesale-account.html'),js=read('public/wholesale-account.js');
 for(const term of ['b2bRegister','b2bLogin','b2bApply','name="business"','name="gstin"','name="phone"','name="city"','name="address"','name="pincode"']){
  assert.ok(html.includes(term),term+' required');
 }
 assert.match(js,/api\/dealer\/register/);
 assert.match(js,/api\/dealer\/apply/);
 assert.match(js,/api\/login/);
 assert.ok(!html.includes('href="admin.html"'));
 assert.ok(read('public/dealer.html').includes('href="wholesale-account.html"'));
});

test('existing SQLite schema is preserved with separate dealer profiles and opt-in marketing preferences',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mvn-trade-schema-'));
 let c;
 try{
  c=openCommerce(dir);
  const tables=c.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
  for(const name of ['orders','users','dealers','dealer_profiles','marketing_preferences','inventory','audit'])assert.ok(tables.includes(name),name+' exists');
  assert.equal(c.catalogue(null).length,5);
  assert.equal(c.db.prepare('SELECT COUNT(*) AS c FROM marketing_preferences').get().c,0,'marketing starts with nobody enrolled');
  assert.equal(c.db.prepare('SELECT COUNT(*) AS c FROM dealer_profiles').get().c,0,'do not manufacture dealer records');
 }finally{c?.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('verified certificate, territorial launch, responsible media and Help Center appear without repeated checkout banner',()=>{
 const html=read('public/index.html'),support=read('public/support.html'),css=read('public/flagship.css');
 assert.match(html,/assets\/IMG-20261102-WA0019.jpg/);
 assert.match(support,/assets\/IMG-20261102-WA0019.jpg/);
 assert.match(html,/GLOB TECH/);
 assert.match(html,/TAMIL NADU/);
 assert.match(html,/PUDUCHERRY/);
 assert.match(css,/mvnProgress/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.ok(!html.includes('class="store-notice"'),'duplicate bottom banner removed');
 assert.ok(html.includes('href="support.html"'));
 assert.ok(support.includes('Product authenticity'));
 assert.ok(support.includes('How can we'));
 assert.ok(!support.includes('Optimum Nutrition'),'brand support practices are adapted, not copied');
});

test('marketing is optional, authenticated, and not falsely advertised as automatic',()=>{
 const html=read('public/account.html'),js=read('public/account.js'),server=read('server.mjs'),admin=read('public/admin.html');
 assert.ok(html.includes('id="marketing"'));
 assert.ok(html.includes('15 days'));
 assert.ok(html.includes('30 days'));
 assert.ok(html.includes('name="explicitConsent"'));
 assert.ok(html.includes('id="marketingStop"'));
 assert.ok(js.includes("api('/api/me/marketing'"));
 assert.ok(server.includes("path==='/api/admin/marketing/audience'"));
 assert.ok(server.includes('requireUser(user);'));
 assert.ok(admin.includes('id="marketingAudience"'));
 const adminJs=read('public/admin.js');
 assert.ok(adminJs.includes('if(eventTitle&&!customer.festivalUpdates)'), 'manual festival drafts require festival opt-in');
 assert.ok(adminJs.includes('if(!eventTitle&&!customer.cadenceDays)'), 'manual replenishment drafts require reminder opt-in');
 assert.ok(html.includes('not automatically sent'));
});
