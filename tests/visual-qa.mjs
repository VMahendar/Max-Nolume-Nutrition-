import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {DatabaseSync} from 'node:sqlite';

const origin='http://127.0.0.1:3187';
const dataDir='/tmp/mvn-visual-qa-'+process.pid;
const reportDir='reports/visual-qa';
mkdirSync(reportDir,{recursive:true});
const app=spawn(process.execPath,['server.mjs'],{
  env:{...process.env,HOST:'127.0.0.1',PORT:'3187',PUBLIC_ORIGIN:origin,NODE_ENV:'test',STAGING_MODE:'false',PAYMENTS_ENABLED:'false',SHIPROCKET_ENABLED:'false',DATA_DIR:dataDir},
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
    assert.match(await page.locator('.hero h1').innerText(),/FUEL EVERY\s+REP/i,preset.name+' product-first hero headline');
    assert.match(await page.locator('.hero-declaration').innerText(),/AUTHORIZED UNICORN PRO SERIES DISTRIBUTOR/i,preset.name+' distribution identity');
    assert.ok(await page.locator('#brands .motion-stage').isVisible(),preset.name+' upcoming GLOTECH feature');
    const originalLogo=await page.locator('header .original-brand-logo').evaluate(img=>{
      const r=img.getBoundingClientRect(),h=img.closest('header').getBoundingClientRect();
      return {loaded:img.complete&&img.naturalWidth>0,width:r.width,height:r.height,left:r.left,right:r.right,headerLeft:h.left,headerRight:h.right};
    });
    console.log('ORIGINAL_LOGO',preset.name,JSON.stringify(originalLogo));
    assert.ok(originalLogo.loaded&&originalLogo.width>100&&originalLogo.height>40,preset.name+' original logo loads at usable size: '+JSON.stringify(originalLogo));
    assert.ok(originalLogo.left>=originalLogo.headerLeft-2&&originalLogo.right<=originalLogo.headerRight+2,preset.name+' logo must fit header: '+JSON.stringify(originalLogo));
    const masthead=await page.locator('.storehead').evaluate(el=>getComputedStyle(el).backgroundColor);
    const logoStyles=await page.locator('.brand-identity').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,bgImage:getComputedStyle(el).backgroundImage,blend:getComputedStyle(el).mixBlendMode,filter:getComputedStyle(el).filter}));
    assert.equal(masthead,'rgb(20, 24, 30)',preset.name+' seamless dark masthead');
    assert.equal(logoStyles.bg,'rgba(0, 0, 0, 0)',preset.name+' logo has no cut-and-paste rectangular panel');
    assert.ok(logoStyles.bgImage.includes('max-volume-logo-wide.png'),preset.name+' original gold image is the integrated masthead artwork');
    assert.equal(logoStyles.blend,'normal',preset.name+' logo has no artificial screen-overlay panel');
    assert.ok(logoStyles.filter.includes('mvnGoldKey'),preset.name+' dark logo background is removed at display time');

    assert.ok(await page.locator('body').getAttribute('class')==='retail-home',preset.name+' design class');
    const logo=await page.locator('header .brand img.original-brand-logo').evaluate(img=>({
      src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight,display:getComputedStyle(img).display
    }));
    assert.equal(logo.src,'max-volume-logo-wide.png',preset.name+" must use the owner-approved full-lettering logo image");
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
    await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';window.scrollTo({top:0,behavior:'instant'});});
    await delay(180);
    // Capture the actual rendered viewport for external visual inspection.
    const viewportShot=(await page.screenshot({type:'jpeg',quality:42,fullPage:false,animations:'disabled'})).toString('base64');
    for(let i=0;i<viewportShot.length;i+=9000)console.log('MVN_VIEW_'+preset.name+'_'+String(i/9000).padStart(3,'0')+' '+viewportShot.slice(i,i+9000));
    // Capture lower merchandising sections as evidence, not just the hero.
    for(const sectionName of ['shop','brands']){
      await page.locator('#'+sectionName).scrollIntoViewIfNeeded();
      await delay(280);
      const shot=(await page.screenshot({type:'jpeg',quality:38,fullPage:false,animations:'disabled'})).toString('base64');
      for(let i=0;i<shot.length;i+=9000)console.log('MVN_SECTION_'+preset.name+'_'+sectionName+'_'+String(i/9000).padStart(3,'0')+' '+shot.slice(i,i+9000));
    }
    const featuredImage=await page.locator('#grid article.card').first().locator('.photo img').evaluate(img=>({src:img.src,loaded:img.complete&&img.naturalWidth>0,hidden:img.hidden}));
    assert.ok(featuredImage.loaded&&!featuredImage.hidden,preset.name+' first merchandise card shows a real product photo: '+JSON.stringify(featuredImage));
    if(preset.name==='mobile'){
      assert.ok(await page.locator('#floatingCart').isVisible(),'mobile persistent shopping cart must be visible');
      assert.match(await page.locator('#floatingCart').innerText(),/VIEW CART/,'mobile cart has an obvious label');
    }
    await page.locator('.add[data-id="whey"]').click();
    assert.equal(await page.locator('#count').innerText(),'1',preset.name+' add-to-cart count');
    const cartText=await page.locator('#items').textContent();
    console.log('CART_TEXT',preset.name,JSON.stringify(cartText));
    await page.screenshot({path:reportDir+'/'+preset.name+'-cart.png',fullPage:false,animations:'disabled'});
    assert.ok(/4[,\\s]?999/.test(cartText||''),preset.name+' correct cart price: '+JSON.stringify(cartText));
    assert.match(await page.locator('#checkoutFields').innerText(),/payment and delivery arranged on WhatsApp|online payment is temporarily unavailable|payment and delivery are temporarily disabled/i,preset.name+' enquiry mode');
    await page.locator('#close').click();
    if(preset.name==='mobile'){
      await page.locator('#floatingCart').click();
      assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'false','mobile floating cart opens the real drawer');
      assert.match(await page.locator('#items').textContent(),/Potency Whey/,'floating cart contains added product');
      await page.locator('#close').click();
    }
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
    assert.equal(await page.locator('#detail-variant').inputValue(),'0',preset.name+' product details preserve selected 3kg pack');
    assert.match(await page.locator('#detail-price').innerText(),/2,599/,preset.name+' selected 3kg price preserved');
    await page.locator('#detailClose').click();
    const cards=await page.locator('#grid article.card').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('h3')?.textContent,photo:(()=>{const x=n.querySelector('.photo img');return x?{loaded:x.naturalWidth>0,complete:x.complete,hidden:x.hidden,src:x.src}:null})(),placeholder:!!n.querySelector('.photo .placeholder')})));
    await page.screenshot({path:reportDir+'/'+preset.name+'.png',fullPage:true,animations:'disabled'});
    assert.deepEqual(errors,[],preset.name+' JavaScript errors');
    observations.push({device:preset.name,measured,heroImage,cards,jsErrors:errors});
    await page.close();
  }
  // If JavaScript fails to load, the homepage still displays a usable
  // retail catalogue and WhatsApp product enquiries rather than an empty grid.
  const withoutJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const noJsResponse=await withoutJs.goto(origin+'/',{waitUntil:'domcontentloaded'});
  assert.equal(noJsResponse.status(),200,'JavaScript-disabled homepage responds');
  assert.equal(await withoutJs.locator('#grid article.card').count(),5,'five product cards render before JavaScript');
  assert.equal(await withoutJs.locator('#grid a.add[href^="https://wa.me/"]').count(),5,'every fallback card offers a real enquiry action');
  assert.match(await withoutJs.locator('#grid').textContent(),/4,999/,'retail prices remain visible without JavaScript');
  await withoutJs.close();
  const page=await browser.newPage();
  assert.equal((await page.goto(origin+'/account.html')).status(),200,'account route');
  assert.ok(await page.locator('form#login').isVisible(),'account login visible');
  assert.equal((await page.goto(origin+'/dealer.html')).status(),200,'dealer route');
  assert.equal((await page.goto(origin+'/admin.html')).status(),200,'admin route served; authorization protected by API');
  // Public account experience must be visually consistent, responsive and usable
  // before registering the isolated test buyers below.
  for(const preset of [{name:'desktop',viewport:{width:1440,height:900},isMobile:false},{name:'mobile',viewport:{width:390,height:844},isMobile:true}]){
    const accountPage=await browser.newPage({viewport:preset.viewport,isMobile:preset.isMobile,deviceScaleFactor:1});
    const failures=[];
    accountPage.on('pageerror',e=>failures.push(e.message));
    const pageResponse=await accountPage.goto(origin+'/account.html',{waitUntil:'domcontentloaded'});
    assert.equal(pageResponse.status(),200,preset.name+' account page HTTP 200');
    await accountPage.locator('#register input[name="email"]').waitFor({state:'visible'});
    assert.equal(await accountPage.locator('#anonymous .account-panel').count(),2,preset.name+' login and registration panels');
    assert.ok(await accountPage.locator('h1').isVisible(),preset.name+' prominent account title');
    assert.equal(await accountPage.locator('.account-mainnav a[href="admin.html"]').count(),0,preset.name+' no admin link in customer header');
    const metrics=await accountPage.evaluate(()=>{
      const h=document.querySelector('.account-masthead'),logo=document.querySelector('.account-brand');
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headerBg:getComputedStyle(h).backgroundColor,logoImage:getComputedStyle(logo).backgroundImage,logoFilter:getComputedStyle(logo).filter};
    });
    assert.ok(metrics.scrollWidth<=metrics.width+2,preset.name+' account page has no horizontal overflow: '+JSON.stringify(metrics));
    assert.equal(metrics.headerBg,'rgb(20, 24, 30)',preset.name+' integrated dark account header');
    assert.ok(metrics.logoImage.includes('max-volume-logo-wide.png'),preset.name+' original owner logo');
    assert.ok(metrics.logoFilter.includes('mvnGoldKey'),preset.name+' logo matte removed');
    await accountPage.locator('#loginPassword').fill('test passphrase visible');
    await accountPage.locator('[data-password-for="loginPassword"]').click();
    assert.equal(await accountPage.locator('#loginPassword').getAttribute('type'),'text',preset.name+' accessible show-password control');
    await accountPage.locator('[data-password-for="loginPassword"]').click();
    assert.equal(await accountPage.locator('#loginPassword').getAttribute('type'),'password',preset.name+' password hidden again');
    await accountPage.screenshot({path:reportDir+'/'+preset.name+'-account.png',fullPage:true,animations:'disabled'});
    await accountPage.goto(origin+'/wholesale-account.html',{waitUntil:'domcontentloaded'});
    await accountPage.locator('#b2bRegister input[name="business"]').waitFor({state:'visible'});
    assert.equal(await accountPage.locator('#b2bRegister input[name="gstin"]').count(),1,preset.name+' dedicated GSTIN on wholesale registration');
    assert.equal(await accountPage.locator('#b2bRegister input[name="pincode"]').count(),1,preset.name+' dedicated shop PIN code on wholesale registration');
    const wholesaleOverflow=await accountPage.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(wholesaleOverflow<=2,preset.name+' wholesale registration has no horizontal overflow');
    await accountPage.screenshot({path:reportDir+'/'+preset.name+'-wholesale.png',fullPage:true,animations:'disabled'});
    await accountPage.goto(origin+'/support.html',{waitUntil:'domcontentloaded'});
    await accountPage.locator('.support-faq').first().waitFor({state:'visible'});
    assert.ok(await accountPage.locator('.support-certificate img').isVisible(),preset.name+' original certificate shown in Help Center');
    const helpOverflow=await accountPage.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(helpOverflow<=2,preset.name+' Help Center has no horizontal overflow');
    await accountPage.screenshot({path:reportDir+'/'+preset.name+'-support.png',fullPage:true,animations:'disabled'});

    assert.deepEqual(failures,[],preset.name+' account JavaScript must not throw');
    await accountPage.close();
  }
  // Full customer and business-account workflow in an isolated test database.
  const buyer=await browser.newPage();
  await buyer.goto(origin+'/account.html');
  await buyer.locator('#register input[name="name"]').fill('Launch Test Customer');
  await buyer.locator('#register input[name="email"]').fill('launch-buyer@example.test');
  await buyer.locator('#register input[name="password"]').fill('LaunchQA-Passphrase-2026');
  await buyer.locator('#register button[type="submit"]').click();
  await buyer.locator('#signedIn').waitFor({state:'visible',timeout:12000});
  assert.match(await buyer.locator('#tier').innerText(),/retail/i,'new account must start at retail tier');
  // Opt-in reminders and festival updates must never start enabled by default.
  await buyer.locator('#marketing select[name="cadenceDays"]').selectOption('15');
  await buyer.locator('#marketing input[name="emailOptIn"]').check();
  await buyer.locator('#marketing input[name="festivalUpdates"]').check();
  await buyer.locator('#marketing input[name="explicitConsent"]').check();
  await buyer.locator('#marketing button[type="submit"]').click();
  await buyer.waitForFunction(async()=>{
    const r=await fetch('/api/me/marketing'),x=await r.json();
    return x.preferences?.cadenceDays===15&&x.preferences?.festivalUpdates===true;
  },null,{timeout:10000});
  await buyer.goto(origin+'/wholesale-account.html');
  await buyer.locator('#wholesaleApplySection').waitFor({state:'visible',timeout:12000});
  await buyer.locator('#b2bApply input[name="business"]').fill('Launch QA Supplement Outlet');
  await buyer.locator('#b2bApply select[name="kind"]').selectOption('wholesale');
  await buyer.locator('#b2bApply input[name="phone"]').fill('9876543210');
  await buyer.locator('#b2bApply input[name="city"]').fill('Chennai');
  await buyer.locator('#b2bApply input[name="pincode"]').fill('603103');
  await buyer.locator('#b2bApply textarea[name="address"]').fill('1 Test Street, Kelambakkam');
  await buyer.locator('#b2bApply button[type="submit"]').click();
  await buyer.waitForFunction(()=>document.querySelector('#wholesaleStatus')?.textContent.toLowerCase().includes('pending'),null,{timeout:12000});

  // Verify brand-new wholesaler registration is independent of customer signup.
  const newDealer=await browser.newPage();
  await newDealer.goto(origin+'/wholesale-account.html');
  await newDealer.locator('#b2bRegister input[name="business"]').fill('Trade QA Fitness Shop');
  await newDealer.locator('#b2bRegister select[name="kind"]').selectOption('wholesale');
  await newDealer.locator('#b2bRegister input[name="gstin"]').fill('33AAAAA0000A1Z5');
  await newDealer.locator('#b2bRegister input[name="name"]').fill('Trade QA Owner');
  await newDealer.locator('#b2bRegister input[name="phone"]').fill('9876543211');
  await newDealer.locator('#b2bRegister input[name="city"]').fill('Puducherry');
  await newDealer.locator('#b2bRegister input[name="pincode"]').fill('605001');
  await newDealer.locator('#b2bRegister textarea[name="address"]').fill('3 Trade Avenue, Puducherry');
  await newDealer.locator('#b2bRegister input[name="email"]').fill('trade-new@example.test');
  await newDealer.locator('#b2bRegister input[name="password"]').fill('TradeNewSecure-Passphrase-2026');
  await newDealer.locator('#b2bRegister button[type="submit"]').click();
  await newDealer.waitForFunction(()=>document.querySelector('#wholesaleStatus')?.textContent.toLowerCase().includes('pending'),null,{timeout:12000});
  const freshTradeSession=await newDealer.evaluate(async()=>await (await fetch('/api/session')).json());
  assert.equal(freshTradeSession.user.dealer.status,'pending','new wholesaler starts pending approval');
  await newDealer.close();
  await buyer.goto(origin+'/account.html');
  const denied=await buyer.evaluate(async()=>(await fetch('/api/dealer/catalog')).status);
  assert.equal(denied,403,'pending dealers cannot see private wholesale prices');
  const adminPage=await browser.newPage();
  await adminPage.goto(origin+'/account.html');
  await adminPage.locator('#register input[name="name"]').fill('Launch QA Admin');
  await adminPage.locator('#register input[name="email"]').fill('launch-admin@example.test');
  await adminPage.locator('#register input[name="password"]').fill('LaunchAdmin-Passphrase-2026');
  await adminPage.locator('#register button[type="submit"]').click();
  await adminPage.locator('#signedIn').waitFor({state:'visible',timeout:12000});
  const qaDb=new DatabaseSync(dataDir+'/orders.sqlite');
  try{assert.equal(qaDb.prepare("UPDATE users SET role='admin' WHERE email=?").run('launch-admin@example.test').changes,1);}
  finally{qaDb.close();}
  await adminPage.goto(origin+'/admin.html');
  await adminPage.locator('#dashboard').waitFor({state:'visible',timeout:12000});
  const audience=await adminPage.evaluate(async()=>await (await fetch('/api/admin/marketing/audience')).json());
  assert.ok(audience.subscribers.some(p=>p.email==='launch-buyer@example.test'&&p.cadenceDays===15&&p.festivalUpdates),'only opted-in buyers join marketing audience');
  assert.equal(audience.automaticSending,false,'no unconfigured auto-sending');

  await adminPage.goto(origin+'/admin.html#dealers');await adminPage.locator('#dashboard').waitFor({state:'visible'});
  await adminPage.locator('#dealerTable tr').filter({hasText:'launch-buyer@example.test'}).locator('button[data-status="approved"]').click();
  await adminPage.waitForFunction(()=>document.querySelector('#dealerTable')?.textContent.includes('approved'),null,{timeout:12000});
  await buyer.reload();
  await buyer.waitForFunction(()=>document.querySelector('#tier')?.textContent.includes('wholesale'),null,{timeout:12000});
  const dealer=await buyer.evaluate(async()=>{const r=await fetch('/api/dealer/catalog');return {status:r.status,body:await r.json()}});
  assert.equal(dealer.status,200,'approved dealer catalogue available');
  const whey=dealer.body.products.find(p=>p.id==='potency-whey');
  assert.equal(whey.variants.find(v=>v.id==='whey-chocolate').pricePaise,385000,'private dealer Whey price');
  const retailer=await buyer.evaluate(async()=>(await (await fetch('/api/retail/catalog')).json()).products);
  const publicWhey=retailer.find(p=>p.id==='potency-whey').variants[0];
  assert.equal(publicWhey.pricePaise,499900,'public Whey price remains retail');
  assert.equal(Object.hasOwn(publicWhey,'prices'),false,'private tiers not leaked into public API');
  await buyer.locator('#logout').click();
  await buyer.locator('#anonymous').waitFor({state:'visible',timeout:12000});
  await buyer.locator('#login input[name="email"]').fill('launch-buyer@example.test');
  await buyer.locator('#login input[name="password"]').fill('LaunchQA-Passphrase-2026');
  await buyer.locator('#login button[type="submit"]').click();
  await buyer.waitForFunction(()=>document.querySelector('#tier')?.textContent.includes('wholesale'),null,{timeout:12000});
  console.log('ACCOUNT_WHOLESALE_QA_PASS',JSON.stringify({register:true,login:true,dealerApplication:true,adminApproval:true,privatePricing:true,publicRetailOnly:true}));
  await buyer.locator('#marketingStop').click();
  await buyer.waitForFunction(async()=>{const x=await (await fetch('/api/me/marketing')).json();return x.preferences?.cadenceDays===0&&!x.preferences?.festivalUpdates;},null,{timeout:10000});
  const afterOptOut=await adminPage.evaluate(async()=>await (await fetch('/api/admin/marketing/audience')).json());
  assert.ok(!afterOptOut.subscribers.some(p=>p.email==='launch-buyer@example.test'),'marketing opt-out excludes buyer');
  await buyer.close();await adminPage.close();
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
