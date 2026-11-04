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
  for(const file of htmlFiles){
    const html=readFileSync(file,'utf8');
    assert.match(html,/class="original-brand-logo" src="max-volume-logo-wide.png"/,file+' must use existing full-lettering logo PNG');
    assert.doesNotMatch(html,/<span class="mvmark">MV<\/span>/,file+' must not recreate the logo with text');
  }
});

test('the new white/blue whey photo is not replaced by the old generic pack',()=>{
  const root=readFileSync('products.js','utf8');
  const render=readFileSync('public/app.js','utf8');
  const catalog=JSON.parse(readFileSync('public/catalog.json','utf8'));
  const whey=catalog.find(p=>p.id==='potency-whey');
  assert.ok(whey,'Potency Whey product must remain in the catalogue');
  assert.deepEqual(whey.variants.map(v=>v.pricePaise),[499900,499900]);
  assert.match(root,/Potency-Whey-600x501-1\\.png/);
  assert.match(render,/Potency-Whey-600x501-1\\.png/);
  assert.doesNotMatch(root,/1ff000_e90a0275d7d54a2faef71492a305f3f6/);
  assert.doesNotMatch(render,/1ff000_e90a0275d7d54a2faef71492a305f3f6/);
  assert.doesNotMatch(root,/assets\/potency-whey\.png/);
  assert.doesNotMatch(render,/assets\/potency-whey\.png/);
});
