import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('customer homepage uses one final copper-and-onyx design layer',()=>{
 const h=readFileSync('public/index.html','utf8');
 const css=readFileSync('public/copper-home.css','utf8');
 assert.match(h,/<link rel="stylesheet" href="copper-home\.css">/);
 assert.ok(h.indexOf('copper-home.css')>h.indexOf('store-updates.css'),'final stylesheet wins previous retail styles');
 assert.match(css,/background:#0b0908!important/,'logo frame uses matte black');
 assert.match(css,/border:1px solid #b17c58!important/,'logo has an understated copper border');
 assert.match(css,/\.brand-identity \.original-brand-logo\{/,'original logo is intentionally styled');
 assert.match(css,/opacity:1!important/,'logo is not hidden');
 assert.match(css,/background-image:none!important/,'no duplicate background logo');
 assert.match(css,/\.hero\{/,'premium hero section exists');
 assert.match(css,/@media\(max-width:620px\)/,'small-screen layout is defined');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'reduced-motion users supported');
});
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
