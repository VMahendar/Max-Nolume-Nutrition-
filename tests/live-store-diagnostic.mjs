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
  try{await page.locator('#grid .add').first().click({timeout:6000});await page.waitForTimeout(550);cartResult=await page.evaluate(()=>{const d=document.querySelector('#drawer'),i=document.querySelector('#items'),r=d.getBoundingClientRect(),st=getComputedStyle(d);return {drawer:d.getAttribute('aria-hidden'),drawerClasses:d.className,count:document.querySelector('#count').textContent,itemsText:i.textContent.slice(0,220),itemsInnerText:i.innerText.slice(0,220),computed:{visibility:st.visibility,display:st.display,transform:st.transform,zIndex:st.zIndex,opacity:st.opacity},rect:{x:r.x,width:r.width,right:r.right},viewportWidth:innerWidth,shadeHidden:document.querySelector('#shade').hidden};});}catch(e){cartResult=String(e)}
 }
 const floating=page.locator('#floatingCart');
 if(await page.locator('#drawer').getAttribute('aria-hidden')==='false')await page.locator('#close').click();
 const visibleCart=await floating.isVisible();
 let floatingWorks=false;
 if(visibleCart&&await products.count()){
  await page.locator('#close').click();
  await floating.click();
  floatingWorks=(await page.locator('#drawer').getAttribute('aria-hidden'))==='false'&&(await page.locator('#items').textContent()).includes('Nitro Mass');
 }
 const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await noJs.goto(base+'/?qa=nojstest',{waitUntil:'domcontentloaded',timeout:80000});
 const fallbackCards=await noJs.locator('#grid article.card').count();
 const fallbackContact=await noJs.locator('#grid a.add[href^="https://wa.me/"]').count();
 await noJs.close();
 report.publicShopCheck={cards:await products.count(),visibleCart,floatingWorks,fallbackCards,fallbackContact,ok:await products.count()===5&&visibleCart&&floatingWorks&&fallbackCards===5&&fallbackContact===5};
 await page.screenshot({path:out+'/live-mobile.png',fullPage:true,animations:'disabled'});
 report.browser={status:response?.status(),...data,cartResult,errors,failed:failed.slice(0,12)};
}catch(e){report.browser={error:String(e)}}finally{await browser?.close()}
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log('LIVE_DIAGNOSTIC',JSON.stringify(report));
if(!report.publicShopCheck?.ok)process.exitCode=1;
