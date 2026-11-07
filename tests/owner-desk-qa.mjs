import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
const dir=mkdtempSync(resolve(tmpdir(),'mvn-owner-browser-')),base='http://localhost:34998';
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:'34998',PUBLIC_ORIGIN:base,DATA_DIR:dir,STAGING_MODE:'false',NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
let browser,db;
try{
 await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Startup timed out')),5000);server.stdout.once('data',()=>{clearTimeout(timer);ok();});server.once('exit',()=>{clearTimeout(timer);no(Error('Server exited'));});});
 db=new DatabaseSync(resolve(dir,'orders.sqlite'));db.prepare('UPDATE inventory SET on_hand=10').run();
 browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const registration=await context.request.post(base+'/api/register',{headers:{Origin:base},data:{name:'Fixture Owner',email:'owner-browser@example.com',password:'owner-browser-fixture-password'}});assert.equal(registration.status(),200);
 db.prepare("UPDATE users SET role='admin' WHERE email='owner-browser@example.com'").run();
 await page.goto(base+'/admin.html');await page.locator('#dashboard').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#ownerEntryForm [name=variantId]').options.length>0);
 const form=page.locator('#ownerEntryForm');await form.locator('[name=variantId]').selectOption('whey-chocolate');await form.locator('[name=quantity]').fill('3');await form.locator('[name=unitPrice]').fill('100');await form.locator('[name=contact]').fill('Fixture supplier');await form.locator('[name=reference]').fill('TEST-BILL-1');await form.locator('[type=submit]').click();
 await page.locator('#ownerEntryPreview').waitFor({state:'visible'});assert.match(await page.locator('#ownerEntrySummary').innerText(),/10 → 13/);await page.locator('#confirmOwnerEntry').click();await page.waitForFunction(()=>document.getElementById('deskMessage').textContent.includes('Saved once'));assert.equal(db.prepare("SELECT on_hand FROM inventory WHERE variant_id='whey-chocolate'").get().on_hand,13);
 await page.locator('#newUpdate').click();const update=page.locator('#updateForm');await update.locator('[name=title]').fill('Browser fixture launch');await update.locator('[name=body]').fill('A new brand update for both MVN screens.');await update.locator('[name=kind]').selectOption('launch');await update.locator('[name=enabled]').check();
 const pixel=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=10;c.getContext('2d').fillRect(0,0,10,10);return c.toDataURL('image/png').split(',')[1];}),'base64');await page.locator('#updatePhoto').setInputFiles({name:'fixture.png',mimeType:'image/png',buffer:pixel});await page.waitForFunction(()=>document.querySelector('#updateForm [name=image]').value.startsWith('assets/updates/'));await update.locator('[name=imageAlt]').fill('Fixture launch image');await update.locator('[type=submit]').click();await page.waitForFunction(()=>document.getElementById('updateMessage').textContent.includes('Saved.'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 mkdirSync('reports/visual-qa/owner',{recursive:true});await page.locator('#store-updates').scrollIntoViewIfNeeded();await page.screenshot({path:'reports/visual-qa/owner/mobile-composer.png'});
 await page.goto(base+'/#offers');await page.locator('[data-store-updates] h3').first().waitFor();assert.equal(await page.locator('[data-store-updates]').first().innerText().then(t=>t.includes('Browser fixture launch')),true);const photo=page.locator('[data-store-updates] img').first();await photo.waitFor();assert.equal((await context.request.get(base+await photo.getAttribute('src'))).status(),200);
 const appContext=await browser.newContext({viewport:{width:390,height:844}});await appContext.addInitScript(()=>{const original=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{...original(q),matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}:original(q);});const app=await appContext.newPage();app.on('pageerror',e=>errors.push(e.message));await app.goto(base+'/mobile-app.html#brands');await app.locator('#brands [data-store-updates] h3').waitFor();assert.match(await app.locator('#brands [data-store-updates]').innerText(),/Browser fixture launch/);
 assert.deepEqual(errors,[]);console.log('Owner mobile desk, previewed purchase, photo upload, shared website/app launch feed and permissions flow passed.');
}finally{db?.close();await browser?.close();if(server.exitCode===null){const exit=new Promise(r=>server.once('exit',r));server.kill();await exit;}rmSync(dir,{recursive:true,force:true});}
