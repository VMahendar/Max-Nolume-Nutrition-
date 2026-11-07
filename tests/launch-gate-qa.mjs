import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const dir=mkdtempSync(resolve(tmpdir(),'mvn-launch-browser-')),base='http://localhost:34995';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'34995',PUBLIC_ORIGIN:base,DATA_DIR:dir,NODE_ENV:'test',STAGING_MODE:'false'},stdio:['ignore','pipe','pipe']});let browser;
try{
 await new Promise((ok,no)=>{const timeout=setTimeout(()=>no(Error('Startup timeout')),5000);server.stdout.once('data',()=>{clearTimeout(timeout);ok();});});
 browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 for(const path of ['/','/mobile-app.html']){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{const match=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{...match(q),matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:match(q);});
  await page.clock.install({time:new Date('2026-11-08T17:29:50Z')});await page.goto(base+path);
  await page.locator('#mvn-opening-countdown').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('mvn-prelaunch-pending')),true);assert.equal(await page.locator('#shop').evaluate(el=>el.inert),true);
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:900});
   const title=await page.locator('.mvn-clock-headline').evaluate(el=>{
    const parent=el.parentElement,style=getComputedStyle(parent);
    return {width:el.scrollWidth,available:parent.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)};
   });
   assert.ok(title.width<=title.available+1,`Launch headline clips at ${width}px on ${path}: ${JSON.stringify(title)}`);
  }
  await page.clock.runFor(11000);assert.equal(await page.evaluate(()=>document.documentElement.classList.contains('mvn-prelaunch-pending')),false);assert.equal(await page.locator('#shop').evaluate(el=>el.inert),false);
  await page.close();
 }
 console.log('Real website/app launch gate preserves prelaunch lock and automatically unlocks at 8 Nov 11 PM IST.');
}finally{await browser?.close();if(server.exitCode===null){const exit=new Promise(r=>server.once('exit',r));server.kill();await exit;}rmSync(dir,{recursive:true,force:true});}
