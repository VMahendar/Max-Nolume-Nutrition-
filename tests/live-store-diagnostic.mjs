import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='https://max-volume-nutrition-preview.onrender.com';
const out='reports/live-store';
mkdirSync(out,{recursive:true});
const report={base,requests:[],browser:null};
for(const path of ['/','/app.js','/premium.css','/api/retail/catalog','/max-volume-logo-wide.png']){
 try{const r=await fetch(base+path,{signal:AbortSignal.timeout(65000)});
 let contentType=r.headers.get('content-type');const ct=path.endsWith('.png')?'[binary]':(await r.text()).slice(0,190);
 report.requests.push({path,status:r.status,contentType,body:ct});
 }catch(e){report.requests.push({path,error:String(e)})}
}
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true});
 const errors=[];const failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({url:r.url(),failure:r.failure()}));
 const response=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:80000});
 await page.waitForTimeout(1400);
 const data=await page.evaluate(()=>({url:location.href,title:document.title,shopCards:document.querySelectorAll('#grid article.card').length,bag:!!document.querySelector('#bag'),bagText:document.querySelector('#bag')?.textContent?.trim(),appScript:!![...document.scripts].find(x=>x.src.endsWith('/app.js')),bodySnippet:document.body?.innerText?.slice(0,480)}));
 const products=page.locator('#grid article.card');
 let cartResult='not tested';
 if(await products.count()){
  try{await page.locator('#grid .add').first().click({timeout:6000});cartResult={drawer:await page.locator('#drawer').getAttribute('aria-hidden'),count:await page.locator('#count').innerText(),items:(await page.locator('#items').innerText()).slice(0,200)}}catch(e){cartResult=String(e)}
 }
 await page.screenshot({path:out+'/live-mobile.png',fullPage:true,animations:'disabled'});
 report.browser={status:response?.status(),...data,cartResult,errors,failed:failed.slice(0,12)};
}catch(e){report.browser={error:String(e)}}finally{await browser?.close()}
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log('LIVE_DIAGNOSTIC',JSON.stringify(report));
