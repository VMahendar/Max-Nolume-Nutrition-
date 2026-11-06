import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('account UI uses a coherent premium customer interface and preserves auth API forms',()=>{
 const html=read('public/account.html'),css=read('public/account-premium.css'),js=read('public/account.js');
 assert.ok(html.includes('account-premium.css'));
 assert.ok(html.includes('max-volume-logo-wide.png'));
 assert.ok(html.includes('mvnGoldKey'));
 assert.ok(!html.includes('href="admin.html"'),'do not show an admin link to ordinary shoppers');
 for(const id of ['anonymous','signedIn','message','login','register','dealer','password','logout','orders','welcome','tier','dealerStatus']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const name of ['name="email"','name="password"','name="business"','name="kind"','name="gstin"','name="currentPassword"']){
   assert.ok(html.includes(name));
 }
 assert.match(css,/\.account-page \[hidden\]\{display:none!important\}/);
 assert.match(css,/\.account-page \.account-auth-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.ok(js.includes("api('/api/'+name,data)"),'use existing server authentication endpoints');
 assert.ok(!js.includes('innerHTML=error'), 'do not inject untrusted error text as HTML');
});

test('the customer and Codex account files remain synchronized with the live Render files',()=>{
 assert.equal(read('account.html'),read('public/account.html'));
 assert.equal(read('account.js'),read('public/account.js'));
 assert.equal(read('account-premium.css'),read('public/account-premium.css'));
});

test('storefront account access is available on mobile and header text is legible',()=>{
 const html=read('public/index.html'),css=read('public/flagship.css');
 assert.ok(html.includes('class="account-link" href="account.html"'));
 assert.ok(html.includes('aria-label="My account"'));
 assert.match(css,/\.retail-home \.account-link\s*\{[^}]*display:inline-flex!important/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.retail-home \.account-link\{\s*display:inline-flex!important;width:40px!important/);
});
