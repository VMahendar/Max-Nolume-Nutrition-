import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {unlockStorefront} from './unlocked-storefront.mjs';
const dir=mkdtempSync(resolve(tmpdir(),'mvn-app-layout-')),origin='http://127.0.0.1:35018';
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:'35018',PUBLIC_ORIGIN:origin,DATA_DIR:dir,NODE_ENV:'test',STAGING_MODE:'false'},stdio:['ignore','pipe','pipe']});let browser;
try{
 await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Server startup timeout')),10000);child.stdout.once('data',()=>{clearTimeout(timer);ok();});child.once('exit',()=>{clearTimeout(timer);no(Error('Server exited'));});});
 browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 mkdirSync('reports/visual-qa/app-catalogue',{recursive:true});
 for(const width of [320,360,390,412,679,680,820]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<=412,hasTouch:width<=412,reducedMotion:'reduce'});await unlockStorefront(context);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/mobile-app.html');await page.locator('.mvn-purchased-card').first().waitFor();await page.waitForLoadState('networkidle');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
  const columns=await page.locator('.mvn-purchased-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(columns,width<680?1:2,'columns '+width);
  assert.equal(await page.locator('#appProductStage').isVisible(),false);assert.equal(await page.locator('#grid').isVisible(),false,'one visible catalogue');
  const card=page.locator('.mvn-purchased-card').first(),add=card.locator('[data-add]'),details=card.locator('[data-details]');
  const [a,b]=await Promise.all([add.boundingBox(),details.boundingBox()]);assert.ok(Math.abs(a.width-b.width)<1,'equal button widths '+width);assert.ok(a.height>=48&&b.height>=48,'touch targets '+width);
  assert.equal(await add.textContent(),'Add to Cart');assert.equal(await details.textContent(),'Details');
  assert.equal(await add.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(36, 32, 29)');assert.equal(await details.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(238, 229, 219)');
  const variant=await add.getAttribute('data-index'),variantId=await add.getAttribute('data-add');assert.equal(variantId,await details.getAttribute('data-details'));
  if(width===390){await page.screenshot({path:'reports/visual-qa/app-catalogue/phone-top.png'});await card.scrollIntoViewIfNeeded();await page.screenshot({path:'reports/visual-qa/app-catalogue/phone-card.png'});}
  await details.scrollIntoViewIfNeeded();await details.click({position:{x:20,y:20}});await page.locator('#productDialog[open]').waitFor();assert.equal(await page.locator('#detail-variant').inputValue(),variant);await page.locator('#detailClose').click();
  await add.click();await page.locator('#drawer.open').waitFor();assert.equal(await page.locator('#count').textContent(),'1');await page.locator('#close').click();
  await page.locator('.mvn-quick-track [data-cat="mass"]').click();await page.waitForFunction(()=>[...document.querySelectorAll('.mvn-purchased-card h3')].every(el=>el.textContent.toLowerCase()==='nitro mass'));assert.equal(await page.locator('.mvn-quick-track [data-cat="mass"]').evaluate(el=>el.classList.contains('active')),true);
  await page.locator('.app-bottom-nav a[href="#offers"]').click();await page.locator('#offers').waitFor({state:'visible'});await page.locator('.app-bottom-nav a[href="#shop"]').click();await page.locator('#shop').waitFor({state:'visible'});
  assert.deepEqual(errors,[]);console.log('PASS app catalogue '+width+': columns, equal solid buttons, canonical variant handlers, cart, details and tabs');await context.close();
 }
}finally{await browser?.close();if(child.exitCode===null){const stopped=new Promise(r=>child.once('exit',r));child.kill();await stopped;}rmSync(dir,{recursive:true,force:true});}
