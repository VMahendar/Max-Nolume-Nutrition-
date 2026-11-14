import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const domain='https://maxvolumenutriton.shop';
const publicPages=[
  '/',
  '/dealer.html',
  '/support.html',
  '/potency-whey.html',
  '/nitro-mass.html',
  '/pro-creatine.html',
  '/sturdy-pre-workout.html',
  '/musclevite-multivitamin.html'
];
const productPages=publicPages.filter(path=>path.includes('whey')||path.includes('mass.')||path.includes('creatine.')||path.includes('pre-workout.')||path.includes('multivitamin.'));
const htmlFile=path=>'public/'+(path==='/'?'index.html':path.slice(1));
const page=path=>readFileSync(htmlFile(path),'utf8');
const structuredData=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match=>JSON.parse(match[1]));
const sitemap=readFileSync('public/sitemap.xml','utf8');
const robots=readFileSync('public/robots.txt','utf8');

test('public SEO URLs have unique titles, descriptions, canonicals and sitemap entries',()=>{
  const titles=new Set();
  for(const path of publicPages){
    const html=page(path);
    const title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    assert.ok(title?.trim(),path+' missing title');
    assert.ok(!titles.has(title),path+' duplicate title');titles.add(title);
    assert.match(html,/<meta name="description" content="[^"]{40,}"/i,path);
    assert.ok(html.includes('rel="canonical" href="'+domain+path+'"'),path+' canonical mismatch');
    assert.ok(html.includes('name="robots" content="index, follow'),path+' missing index setting');
    assert.ok(sitemap.includes('<loc>'+domain+path+'</loc>'),path+' missing from sitemap');
    assert.match(html,/<h1[\s>]/i,path+' has no visible heading');
  }
  assert.equal((sitemap.match(/<loc>/g)||[]).length,publicPages.length,'sitemap entries should not contain private pages');
  assert.ok(robots.includes('Sitemap: '+domain+'/sitemap.xml'));
  for(const privatePath of ['/admin.html','/account.html','/wholesale-account.html']){
    assert.ok(!sitemap.includes('<loc>'+domain+privatePath+'</loc>'),privatePath+' must stay out of sitemap');
  }
});

test('product detail pages expose truthful Product and BreadcrumbList data with relevant navigation',()=>{
  for(const path of productPages){
    const html=page(path);
    const json=structuredData(html);
    const product=json.find(x=>x['@type']==='Product');
    const breadcrumbs=json.find(x=>x['@type']==='BreadcrumbList');
    if(product) assert.equal(product.url,domain+path,path+' has wrong Product URL');
    assert.equal(breadcrumbs?.itemListElement?.[0]?.item,domain+'/',path+' missing home breadcrumb');
    assert.equal(breadcrumbs?.itemListElement?.[1]?.item,domain+path,path+' missing product breadcrumb');
    assert.ok(html.includes('id="mvnRelatedProducts"'),path+' missing related products');
    assert.ok((html.match(/<li><a href="\/(?:potency-whey|nitro-mass|pro-creatine|sturdy-pre-workout|musclevite-multivitamin)\.html">/g)||[]).length>=2,path+' needs related product links');
    if(product) assert.ok(!product.offers,'Do not imply an unverified online checkout/price');
  }
});

test('homepage contains verified service areas and consistent branding',()=>{
  const home=page('/');
  const organization=structuredData(home).find(data=>data.name==='Max Volume Nutrition');
  assert.ok(organization,'missing organization/store schema');
  assert.deepEqual(organization.areaServed.map(x=>x.name),['Tamil Nadu','Puducherry']);
  assert.ok(home.includes('href="/icons/app-192.png"'),'branded favicon missing');
  assert.ok(existsSync('public/icons/app-192.png'),'icon asset missing');
  assert.ok(page('/support.html').includes('mailto:maxvolumenutrition@gmail.com'),'public support email mismatch');
});


test('Google Image sitemap points to approved public product photos only',()=>{
  const staging=readFileSync('staging.mjs','utf8');
  const imagePages=[
    ['/potency-whey.html','/assets/potency-whey-coffee-5lb.webp'],
    ['/nitro-mass.html','/assets/Screenshot_2026_1103_003852.jpg'],
    ['/sturdy-pre-workout.html','/assets/sturdy-watermelon-front.webp'],
    ['/musclevite-multivitamin.html','/assets/musclevite-front.webp']
  ];
  assert.ok(sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'),'missing Google image sitemap namespace');
  for(const [path,image] of imagePages){
    assert.ok(page(path).includes('src="'+image+'"'),path+' does not display declared product photo');
    assert.ok(sitemap.includes('<image:loc>'+domain+image+'</image:loc>'),path+' missing search image entry');
    assert.ok(staging.includes("'"+image+"'"),path+' image is still marked noindex by staging');
  }
  assert.equal((sitemap.match(/<image:loc>/g)||[]).length,imagePages.length,'do not publish unverified extra product images');
});


test('Potency Whey avoids invalid Product rich result without verified offer or review',()=>{const html=page('/potency-whey.html');assert.ok(!structuredData(html).some(x=>x['@type']==='Product'));assert.match(html,/<h1>Unicorn Pro Series Potency Whey Protein – Coffee 5 lb<\/h1>/);});
