import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('retail flagship keeps original logo, integrates masthead and leads with products',()=>{
 const html=read('public/index.html'),css=read('public/flagship.css');
 assert.ok(html.includes('<link rel="stylesheet" href="flagship.css">'));
 assert.match(css,/background:#fff!important/,'white retail shopping canvas');
 assert.match(css,/\.retail-home \.storehead\{\s*background:var\(--mvn-night\)!important/);
 assert.match(css,/\.retail-home \.brand-identity\{\s*background:transparent!important/,'logo has no separate pasted-on backdrop');
 assert.match(css,/background-image:url\('max-volume-logo-wide.png'\)/,'original source artwork is scaled as a continuous masthead image');
 assert.match(css,/mix-blend-mode:screen/,'original black-background logo integrates with masthead');
 assert.match(css,/\.retail-home \.placeholder\[hidden\]/,'hidden placeholders must remain hidden after a real product image loads');
 assert.ok(html.includes('src="max-volume-logo-wide.png"'),'original full logo retained');
 assert.ok(html.includes('FUEL EVERY<br><strong>REP.</strong>'),'product-first hero rather than duplicating company name');
 assert.ok(!html.includes('distribution-feature'),'repeated Unicorn promotion removed');
 assert.ok(!html.includes('category-tiles'),'no duplicated category lists');
 assert.match(html,/section class="benefits" aria-label="Shop by category"/);
 assert.ok(html.includes('href="dealer.html"'),'dealer destination retained');
 assert.ok(html.includes('UNICORN PRO SERIES'),'genuine brand retained in product and distributor context');
});

test('homepage excludes demonstrably incorrect product photos and retains verified stock imagery',()=>{
 const html=read('public/index.html'),app=read('public/app.js'),both=html+'\n'+app;
 const seed=JSON.parse(read('data/products.json'));
 const pub=JSON.parse(read('public/catalog.json'));
 assert.ok(!both.includes('static.wixstatic.com'),'no stale Wix-hosted hero or product photos');
 for(const name of ['potency-whey-coffee-5lb.webp','Screenshot_2026_1103_003852.jpg']){
  assert.ok(existsSync(new URL('../public/assets/'+name,import.meta.url)),name+' exists');
  assert.ok(both.includes('assets/'+name),name+' used');
 }
 for(const wrong of ['assets/sturdy-pre-workout.png']){
  assert.ok(!both.includes(wrong),'incorrect-size/flavour photograph must never show on storefront: '+wrong);
 }
 for(const source of [seed,pub]){
  assert.equal(source.find(p=>p.id==='sturdy-pre').image,null);
  assert.equal(source.find(p=>p.id==='pro-creatine').variants.find(v=>v.id==='creatine-cranberry').image,'assets/pro-creatine.png');
 }
 assert.match(app,/3 kg · (?:Box|Pack) photo pending",price:2599,img:null/,'3kg pack must not use 5kg photo');
 assert.match(app,/Chocolate · 5 lbs.*?img:null/,'Chocolate must not use Coffee photo');
 assert.match(app,/Blueberry · 250 g.*?img:\"https:\/\/unicornproseries.com\/wp-content\/uploads\/2026\/05\/Pro-Creatine-Blueberry-1.png\"/,'Blueberry must use the official Blueberry photo');
});

test('public retail offers use verified MRP and keep confidential wholesale pricing private',()=>{
 const app=read('public/app.js'),seed=JSON.parse(read('public/catalog.json'));
 assert.match(app,/mrp:8599/);assert.match(app,/mrp:1499/);
 assert.ok(app.includes('function priceMarkup(v)'));
 assert.ok(app.includes('class="discount-value"'));
 const whey=seed.find(p=>p.id==='potency-whey').variants;
 assert.deepEqual(whey.map(v=>v.mrpPaise),[859900,859900]);
 assert.deepEqual(whey.map(v=>v.pricePaise),[499900,499900]);
 assert.ok(seed.find(p=>p.id==='nitro-mass').variants.every(v=>v.mrpPaise===undefined),'never invent Nitro MRP');
 assert.ok(!app.includes('wholesale":'),'wholesale prices cannot ship in public JS');
});
