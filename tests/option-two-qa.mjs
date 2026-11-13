// Browser smoke test for the approved Option 2 design reference.
// Deliberately checks the customer website, not the paused Android app.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as delay} from 'node:timers/promises';
import {unlockStorefront} from './unlocked-storefront.mjs';

const dir=mkdtempSync(resolve(tmpdir(),'mvn-option2-qa-'));
const origin='http://127.0.0.1:35319';
const folder='reports/visual-qa/option-two';
mkdirSync(folder,{recursive:true});
const server=spawn(process.execPath,['server.mjs'],{
 env:{...process.env,HOST:'127.0.0.1',PORT:'35319',DATA_DIR:dir,PUBLIC_ORIGIN:origin,
 NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false'},
 stdio:['ignore','pipe','pipe']
});
let err='';
server.stderr.on('data',v=>err+=v.toString());
let browser;
try {
 let ready=false;
 for(let i=0;i<60;i++){
  try{const response=await fetch(origin+'/healthz');if(response.ok){ready=true;break}}catch{}
  await delay(200);
 }
 assert.ok(ready,'test storefront failed to boot: '+err);
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const size of [{name:'desktop',width:1440,columns:3},{name:'android',width:390,columns:2}]){
  const context=await browser.newContext({viewport:{width:size.width,height:900},isMobile:size.name==='android',hasTouch:size.name==='android'});
  await unlockStorefront(context);
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,size.name+' homepage status');
  await page.locator('#grid article.card .variant').first().waitFor({state:'visible',timeout:12000});
  const count=await page.locator('#grid article.card').count();
  assert.ok(count>=5,size.name+' all five current product families must be present, got '+count);
  const geometry=await page.evaluate(()=>{
   const get=x=>document.querySelector(x);
   const grid=get('#grid');
   const title=get('#shop .productbar');
   const hero=get('#mvnSpotlight');
   return {
    columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
    titleBackground:getComputedStyle(title).backgroundImage,
    heroHidden:getComputedStyle(hero).display==='none',
    scroll:document.documentElement.scrollWidth,
    view:innerWidth,
    priceFilterVisible:get('#priceRange').getClientRects().length>0
   };
  });
  if(size.name==='android'){
   const measurements=await page.evaluate(()=>{
    const rect=selector=>{
     const element=document.querySelector(selector),r=element.getBoundingClientRect();
     return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};
    };
    const logo=document.querySelector('header .original-brand-logo');
    return {
     logoSource:logo.getAttribute('src'),
     logoLoaded:logo.complete&&logo.naturalWidth>0,
     logo:rect('header .original-brand-logo'),
     categories:rect('#shop .cats'),
     filter:rect('#shop .collection-filters'),
     selector:rect('#shop #priceRange'),
     firstProduct:rect('#shop #grid article.card')
    };
   });
   console.log('OPTION2_MOBILE_SPACING',JSON.stringify(measurements));
   assert.equal(measurements.logoSource,'mvn-app-header-logo.webp','use the transparent, genuine MVN header artwork');
   assert.ok(measurements.logoLoaded,'header image loaded');
   assert.ok(measurements.logo.width>=145&&measurements.logo.height>=60,'brand clearly sized for phone');
   assert.ok(measurements.filter.height<=55,'price filter cannot create a large empty panel');
   assert.ok(measurements.selector.height<=45,'price selector is compact');
   assert.ok(measurements.firstProduct.y-measurements.filter.bottom<=24,
     'product cards directly follow filter controls');
   assert.ok(measurements.firstProduct.y-measurements.categories.bottom<=92,
     'no oversized blank area between categories and product cards');
  }
  assert.equal(geometry.columns,size.columns,size.name+' expected product columns');
  assert.ok(geometry.titleBackground.includes('linear-gradient'),size.name+' navy/cyan header');
  assert.ok(geometry.heroHidden,size.name+' old hero must not interrupt product-first display');
  assert.ok(geometry.scroll<=geometry.view+10,size.name+' overflow '+JSON.stringify(geometry));
  assert.ok(geometry.priceFilterVisible,size.name+' retain price filtering');
  assert.equal(await page.locator('.card .photo img').first().evaluate(img=>img.complete&&img.naturalWidth>0),true,size.name+' real product image loads');
  await page.locator('#priceRange').selectOption('under1000');
  assert.ok(await page.locator('#grid article.card').count()>=1,size.name+' price filter works');
  await page.locator('#priceRange').selectOption('all');
  await page.locator('.cats [data-cat="mass"]').click();
  assert.equal(await page.locator('#grid article.card').count(),1,size.name+' category filter works');
  await page.locator('.cats [data-cat="all"]').click();
  await page.locator('#grid .add[data-id="whey"]').click();
  assert.equal(await page.locator('#count').innerText(),'1',size.name+' cart count updates');
  assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'false',size.name+' cart drawer opens');
  await page.locator('#close').click();
  await page.screenshot({path:folder+'/'+size.name+'.png',animations:'disabled'});
  assert.deepEqual(errors,[],size.name+' unexpected browser Javascript errors');
  console.log('PASS Option 2 '+size.name+' layout, product photos, filters, cart and no JS errors');
  await context.close();
 }
} finally {
 await browser?.close();
 if(server.exitCode===null){const done=new Promise(resolve=>server.once('exit',resolve));server.kill();await done;}
 rmSync(dir,{recursive:true,force:true});
}
