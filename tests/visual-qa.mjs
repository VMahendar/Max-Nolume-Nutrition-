import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:3187';
const reportDir='reports/visual-qa';
mkdirSync(reportDir,{recursive:true});
const app=spawn(process.execPath,['server.mjs'],{
  env:{...process.env,HOST:'127.0.0.1',PORT:'3187',PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false',DATA_DIR:'/tmp/mvn-visual-qa-'+process.pid},
  stdio:['ignore','pipe','pipe']
});
let appError='';app.stderr.on('data',d=>appError+=d.toString());
let browser;
const observations=[];
try {
  let ready=false;
  for(let i=0;i<45;i++){
    try{const r=await fetch(origin+'/healthz');if(r.ok){ready=true;break;}}catch{}
    await delay(250);
  }
  assert.ok(ready,'Local application did not become healthy: '+appError);
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  for(const preset of [{name:'desktop',viewport:{width:1440,height:900},isMobile:false},{name:'mobile',viewport:{width:390,height:844},isMobile:true}]){
    const page=await browser.newPage({viewport:preset.viewport,isMobile:preset.isMobile,deviceScaleFactor:1});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:25000});
    assert.equal(response.status(),200,preset.name+' homepage HTTP status');
    await page.locator('#grid article.card').first().waitFor({timeout:10000});
    assert.equal(await page.locator('#grid article.card').count(),5,preset.name+' product family count');
    assert.ok(await page.locator('.hero h1').isVisible(),preset.name+' hero visible');
    assert.ok(await page.locator('body').getAttribute('class')==='retail-home',preset.name+' design class');
    const logo=await page.locator('header .brand img.original-brand-logo').evaluate(img=>({
      src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight,display:getComputedStyle(img).display
    }));
    assert.equal(logo.src,'max-volume-logo-wide.png',preset.name+' must use the owner's existing full-lettering logo image');
    assert.ok(logo.width>0&&logo.height>0,preset.name+' brand logo image must load');
    assert.equal(await page.locator('header .brand .mvmark').count(),0,preset.name+' fake MV text must not render');

    const measured=await page.evaluate(()=>{
      const grid=document.querySelector('#grid'),hero=document.querySelector('.hero');
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,heroBackground:getComputedStyle(hero).backgroundColor,heroText:document.querySelector('.hero h1')?.innerText,cartPresent:!!document.querySelector('#bag'),accountPresent:!!document.querySelector('a[href="account.html"]'),dealerPresent:!!document.querySelector('a[href="dealer.html"]')};
    });
    assert.ok(measured.scrollWidth<=measured.width+12,preset.name+' horizontal overflow: '+JSON.stringify(measured));
    assert.ok(measured.accountPresent&&measured.dealerPresent&&measured.cartPresent,preset.name+' shop links');
    await page.locator('img.hero-product').scrollIntoViewIfNeeded();
    try{await page.waitForFunction(()=>{const x=document.querySelector('img.hero-product');return x&&x.complete;},{timeout:14000});}catch{}
    const heroImage=await page.locator('img.hero-product').evaluate(el=>({src:el.src,complete:el.complete,loaded:el.naturalWidth>0,naturalWidth:el.naturalWidth,hidden:el.hidden}));
    await page.evaluate(()=>window.scrollTo(0,0));
    await delay(250);
    // Capture the actual rendered viewport for external visual inspection.
    const viewportShot=(await page.screenshot({type:'jpeg',quality:42,fullPage:false,animations:'disabled'})).toString('base64');
    for(let i=0;i<viewportShot.length;i+=9000)console.log('MVN_VIEW_'+preset.name+'_'+String(i/9000).padStart(3,'0')+' '+viewportShot.slice(i,i+9000));
    await page.locator('.add[data-id="whey"]').click();
    assert.equal(await page.locator('#count').innerText(),'1',preset.name+' add-to-cart count');
    const cartText=await page.locator('#items').textContent();
    console.log('CART_TEXT',preset.name,JSON.stringify(cartText));
    await page.screenshot({path:reportDir+'/'+preset.name+'-cart.png',fullPage:false,animations:'disabled'});
    assert.ok(/4[,\\s]?999/.test(cartText||''),preset.name+' correct cart price: '+JSON.stringify(cartText));
    assert.match(await page.locator('#checkoutFields').innerText(),/payment and delivery are temporarily disabled/i,preset.name+' enquiry mode');
    await page.locator('#close').click();
    // The supplier-provided 5 kg bucket image must never represent the 3 kg box.
    await page.locator('#v-mass').selectOption('1');
    await page.locator('#v-mass').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>{
      const photo=document.querySelector('.add[data-id="mass"]')?.closest('.card')?.querySelector('.photo img');
      return photo&&photo.complete;
    },null,{timeout:20000});
    const bucket=await page.locator('.add[data-id="mass"]').evaluate(btn=>{
      const img=btn.closest('.card').querySelector('.photo img');
      return {src:img.src,naturalWidth:img.naturalWidth,hidden:img.hidden};
    });
    assert.ok(bucket.naturalWidth>0&&!bucket.hidden,preset.name+' 5kg bucket photo must load');
    await page.locator('#v-mass').selectOption('0');
    const missingBox=await page.locator('.add[data-id="mass"]').evaluate(btn=>{
      const photo=btn.closest('.card').querySelector('.photo');
      return {imgHidden:photo.querySelector('img')?.hidden,placeholderVisible:!photo.querySelector('.placeholder').hidden};
    });
    assert.ok(missingBox.imgHidden&&missingBox.placeholderVisible,preset.name+' 3kg box must not show 5kg bucket');
    console.log('NITRO_IMAGES',preset.name,JSON.stringify({bucket,missingBox}));
    await page.locator('button[data-detail="mass"]').click();
    assert.ok(await page.locator('#productDialog').isVisible(),preset.name+' product details dialog');
    await page.locator('#detailClose').click();
    const cards=await page.locator('#grid article.card').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('h3')?.textContent,photo:(()=>{const x=n.querySelector('.photo img');return x?{loaded:x.naturalWidth>0,complete:x.complete,hidden:x.hidden,src:x.src}:null})(),placeholder:!!n.querySelector('.photo .placeholder')})));
    await page.screenshot({path:reportDir+'/'+preset.name+'.png',fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[],preset.name+' JavaScript errors');
    observations.push({device:preset.name,measured,heroImage,cards,jsErrors:errors});
    await page.close();
  }
  const page=await browser.newPage();
  assert.equal((await page.goto(origin+'/account.html')).status(),200,'account route');
  assert.ok(await page.locator('form#login').isVisible(),'account login visible');
  assert.equal((await page.goto(origin+'/dealer.html')).status(),200,'dealer route');
  assert.equal((await page.goto(origin+'/admin.html')).status(),200,'admin route served; authorization protected by API');
  const catalog=await fetch(origin+'/api/retail/catalog');
  assert.equal(catalog.status,200,'retail catalog API');
  assert.equal((await catalog.json()).paymentReady,false,'payment must remain disabled');
  const checkout=await fetch(origin+'/api/checkout',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({items:[]})});
  assert.equal(checkout.status,503,'checkout must remain disabled');
  const imgIssues=observations.filter(x=>!x.heroImage.loaded);
  assert.equal(imgIssues.length,0,'Hero image failed to load: '+JSON.stringify(imgIssues));
  writeFileSync(reportDir+'/report.json',JSON.stringify({passed:true,observations},null,2));
  console.log('VISUAL_QA_PASS',JSON.stringify(observations.map(({device,measured,heroImage,cards})=>({device,measured,heroImage,cards}))));
} catch(error) {
  writeFileSync(reportDir+'/report.json',JSON.stringify({passed:false,error:String(error),observations},null,2));
  console.error('VISUAL_QA_FAIL',error.stack||error);
  process.exitCode=1;
} finally {
  await browser?.close();
  app.kill('SIGTERM');
}
