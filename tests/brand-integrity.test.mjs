import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the storefront displays the exact uploaded MVN logo in Codex and Render',()=>{
  assert.deepEqual(readFileSync('max-volume-logo.png'),readFileSync('public/max-volume-logo.png'),
    'Root and Render logo assets must be byte-for-byte identical to the owner upload');
  assert.deepEqual(readFileSync('max-volume-logo-wide.png'),readFileSync('public/max-volume-logo-wide.png'),
    'Full logo lockup must preserve owner-approved letters and exact pixels');
  const htmlFiles=[
    'index.html','dealer.html','about.html','contact.html','product.html','policies.html',
    'public/index.html','public/dealer.html','public/account.html','public/admin.html',
    'public/privacy.html','public/shipping.html','public/returns.html','public/terms.html'
  ];
  const transparentLogo=readFileSync('public/mvn-app-header-logo.webp');
  assert.ok(transparentLogo.length>10000&&transparentLogo.toString('ascii',0,4)==='RIFF',
    'The existing transparent MVN header artwork must remain a real WebP image');
  for(const file of htmlFiles){
    const html=readFileSync(file,'utf8');
    const homepage=file==='index.html'||file==='public/index.html';
    const approvedHeader=homepage?'mvn-app-header-logo.webp':'max-volume-logo-wide.png';
    assert.ok(html.includes('class="original-brand-logo" src="'+approvedHeader+'"'),
      file+' must use the existing owner-approved MVN artwork');

    assert.doesNotMatch(html,/<span class="mvmark">MV<\/span>/,file+' must not recreate the logo with text');
  }
});

test('the old Whey pack is not displayed or misrepresented as new packaging',()=>{
  const wheyProducts=JSON.parse(readFileSync('public/catalog.json','utf8'));
  const whey=wheyProducts.find(p=>p.id==='potency-whey');
  assert.ok(whey,'Potency Whey product must remain in the catalogue');
  assert.deepEqual(whey.variants.map(v=>v.pricePaise),[550000,550000]);
  assert.equal(whey.image,null,'Unverified product picture must not be published');
  assert.deepEqual(whey.images,[]);
  for(const file of ['products.js','public/app.js','index.html','public/index.html','data/products.json','public/catalog.json']){
    const src=readFileSync(file,'utf8');
    assert.doesNotMatch(src,/Potency-Whey-600x501-1\\.png|1ff000_e90a0275d7d54a2faef71492a305f3f6/,file+' must not show retired black-gold Whey pack');
  }
  assert.match(readFileSync('products.js','utf8'),/id:"whey-chocolate"/);
  assert.match(readFileSync('public/app.js','utf8'),/id:"whey"/);
});
