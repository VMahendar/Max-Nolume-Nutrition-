import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const content=readFileSync(new URL('../public/robots.txt',import.meta.url),'utf8');
const rules=content.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^(Allow|Disallow):\s*\//i.test(x)).map(x=>{
  const match=x.match(/^(Allow|Disallow):\s*(\S+)/i);
  return {type:match[1].toLowerCase(),path:match[2]};
});
function allowed(url){
  const matching=rules.filter(rule=>url.startsWith(rule.path)).sort((a,b)=>b.path.length-a.path.length||Number(b.type==='allow')-Number(a.type==='allow'));
  return matching[0]?.type==='allow';
}
test('public storefront data resources needed for Google rendering are crawlable',()=>{
  for(const url of ['/','/assets/potency-whey-coffee-5lb.webp','/api/retail/catalog','/api/promotions?surface=web','/api/store-updates?surface=web']){
    assert.equal(allowed(url),true,url);
  }
});
test('private session, account, dealer, owner and admin routes remain excluded',()=>{
  for(const url of ['/api/session','/api/catalog','/api/dealer/catalog','/api/admin/overview','/api/enquiries','/admin.html','/account.html','/wholesale-account.html','/owner-preview','/invoice.html','/mobile-app.html']){
    assert.equal(allowed(url),false,url);
  }
});
test('robots file references only the official MVN sitemap',()=>{
  assert.match(content,/Sitemap: https:\/\/maxvolumenutriton\.shop\/sitemap\.xml/);
});
