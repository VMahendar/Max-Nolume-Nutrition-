import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('public storefront is white-first, retains original MVN logo and removes duplicate brand feature',()=>{
 const html=read('public/index.html'),css=read('public/white-store.css');
 assert.ok(html.includes('<link rel="stylesheet" href="white-store.css">'));
 assert.match(css,/background:#fff!important/);
 assert.ok(html.includes('src="max-volume-logo-wide.png"'));
 assert.ok(!html.includes('distribution-feature'),'duplicated Unicorn brand section removed');
 assert.ok(html.includes('href="dealer.html"'),'wholesale destination remains usable');
 assert.ok(html.includes('UNICORN PRO SERIES'),'main distribution identity is retained');
});

test('the actual current local product photographs are referenced without substituting wrong variants',()=>{
 const html=read('public/index.html'),app=read('public/app.js'),both=html+'\n'+app;
 assert.ok(!both.includes('static.wixstatic.com'),'no outdated externally hosted hero or product photos');
 for(const name of ['potency-whey-coffee-5lb.webp','Screenshot_2026_1103_003852.jpg','sturdy-pre-workout.png','pro-creatine.png']){
  assert.ok(existsSync(new URL('../public/assets/'+name,import.meta.url)),'missing current local product image '+name);
  assert.ok(both.includes('assets/'+name),'product image not used '+name);
 }
 assert.match(app,/3 kg · Box photo pending.*?img:null/,'3kg pack must not use 5kg bucket photo');
 assert.match(app,/Chocolate · 5 lbs.*?img:null/,'Chocolate must not reuse Coffee image');
 assert.match(app,/Blueberry · 100 g.*?img:null/,'Blueberry must not use Cranberry photo');
});

test('public retail price offers use only verified MRP and show accurate discount',()=>{
 const app=read('public/app.js'),seed=JSON.parse(read('public/catalog.json'));
 assert.match(app,/mrp:8599/);
 assert.match(app,/mrp:1499/);
 assert.ok(app.includes('function priceMarkup(v)'));
 assert.ok(app.includes('class="discount-value"'));
 const whey=seed.find(p=>p.id==='potency-whey').variants;
 assert.deepEqual(whey.map(v=>v.mrpPaise),[859900,859900]);
 assert.deepEqual(whey.map(v=>v.pricePaise),[499900,499900]);
 const mass=seed.find(p=>p.id==='nitro-mass').variants;
 assert.ok(mass.every(v=>v.mrpPaise===undefined),'never invent Nitro Mass MRP');
 assert.ok(!app.includes('wholesale":'),'never embed private wholesale pricing in public script');
});
