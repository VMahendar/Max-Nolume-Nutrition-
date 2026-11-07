import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('presentation change preserves the correct product images and live storefront hooks',()=>{
 const index=readFileSync('public/index.html','utf8');
 const script=readFileSync('public/app.js','utf8');
 assert.match(index,/max-volume-logo-wide\.png/);
 assert.match(index,/assets\/potency-whey-coffee-5lb\.webp/);
 assert.match(index,/assets\/Screenshot_2026_1103_003852\.jpg/);
 for(const id of ['shop','grid','search','bag','checkoutFields','send','productDialog','dealer'])
  assert.match(index,new RegExp('id="'+id+'"'),id+' remains usable');
 assert.match(script,/const PHONE="917708830513"/);
 assert.match(script,/const retailVariantIds=/);
 assert.match(index,/href="dealer\.html"/);
 const mobile=readFileSync('public/mobile-app.html','utf8');
 assert.doesNotMatch(mobile,/copper-home\.css/,'native-style app keeps its independent layout');
});
test('canonical and served copies are synchronized for launch',()=>{
 assert.equal(readFileSync('index.html','utf8'),readFileSync('public/index.html','utf8'));
 assert.equal(readFileSync('copper-home.css','utf8'),readFileSync('public/copper-home.css','utf8'));
});
