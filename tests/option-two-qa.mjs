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

  const more=page.locator('.mvn-header-more');
  const menuPanel=page.locator('.mvn-more-panel');
  const email=page.locator('.mvn-header-email');
  assert.equal(await more.count(),1,size.name+' has a single accessible three-dot menu');
  assert.equal(await menuPanel.isVisible(),false,size.name+' menu closed by default');
  assert.equal(await email.getAttribute('href'),'mailto:maxvolumenutrition@gmail.com');
  assert.equal(await email.isVisible(),size.name==='desktop',size.name+' desktop email and compact mobile menu');
  await more.locator('summary').click();
  assert.equal(await menuPanel.isVisible(),true,size.name+' three-dot menu opens');
  assert.equal(await menuPanel.locator('a[href="mailto:maxvolumenutrition@gmail.com"]').count(),1,'menu includes support email');
  assert.equal(await menuPanel.locator('a[href="dealer.html"]').count(),1,'menu includes wholesale enquiries');
  assert.equal(await menuPanel.locator('a[href="support.html"]').count(),1,'menu includes support');
  assert.equal(await menuPanel.locator('a[href="https://wa.me/917708830513"]').count(),1,'menu includes WhatsApp support');
  await page.keyboard.press('Escape');
  assert.equal(await menuPanel.isVisible(),false,size.name+' Escape closes menu');
  await more.locator('summary').click();
  await page.mouse.click(10,170); // visible page area left of the dropdown on both viewports
  assert.equal(await menuPanel.isVisible(),false,size.name+' outside click closes menu');
  const visual=await page.evaluate(()=>{
   const style=selector=>getComputedStyle(document.querySelector(selector));
   const image=document.querySelector('#grid article.card .photo img');
   return {
    headerBackground:style('.storehead').backgroundColor,
    headerBackgroundImage:style('.storehead').backgroundImage,
    logoLoaded:document.querySelector('.storehead .original-brand-logo').naturalWidth>0,
    accountColor:style('.storehead .account-link').color,
    cartColor:style('.storehead #bag').color,
    nameColor:style('#grid article.card .info h3').color,
    nameFontSize:parseFloat(style('#grid article.card .info h3').fontSize),
    nameFontWeight:Number(style('#grid article.card .info h3').fontWeight),
    sellingFontSize:parseFloat(style('#grid article.card .selling-price').fontSize),
    priceColor:style('#grid article.card .selling-price').color,
    photoBackground:style('#grid article.card .photo').backgroundImage,
    photoNaturalWidth:image.naturalWidth
   };
  });
  console.log('OPTION2_SOLID_BLACK_VISUAL',size.name,JSON.stringify(visual));
  assert.equal(visual.headerBackground,'rgb(0, 0, 0)','header must be solid black');
  assert.equal(visual.headerBackgroundImage,'none','header must not display grey gradients');
  assert.ok(visual.logoLoaded,'original gold MVN header artwork loads');
  assert.equal(visual.accountColor,'rgb(255, 255, 255)','account icon is white on black');
  assert.equal(visual.cartColor,'rgb(255, 255, 255)','cart icon is white on black');
  assert.ok(visual.nameFontSize>=15,'product titles are legible and prominent');
  assert.ok(visual.nameFontWeight>=800,'product titles use strong weight');
  assert.ok(visual.sellingFontSize>=19,'retail selling price stands out');
  assert.ok(visual.photoBackground.includes('linear-gradient'),'product image area has a clean premium backdrop');
  assert.ok(visual.photoNaturalWidth>0,'real merchandise photography loads');
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
