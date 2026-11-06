import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {openCommerce} from '../commerce.mjs';
import {encryptBackup,decryptBackup,encryptedSnapshot,uploadDriveBackup,startDriveBackupScheduler} from '../deploy/drive-backup.mjs';
test('encrypted snapshot has a valid SQLite header and fails authentication after tampering',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-drive-')),secret=randomBytes(32),c=openCommerce(dir);
 try{
  const archive=await encryptedSnapshot(dir,secret);
  assert.equal(archive.subarray(0,6).toString(),'MVNBK1');
  assert.equal(decryptBackup(archive,secret).subarray(0,16).toString(),'SQLite format 3\0');
  assert.throws(()=>decryptBackup(archive,randomBytes(32)));
  const broken=Buffer.from(archive);broken[broken.length-1]^=1;
  assert.throws(()=>decryptBackup(broken,secret));
 }finally{c.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('Drive request signs encrypted bytes and rejects failed acknowledgements',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-drive-http-')),secret=randomBytes(32),auth=randomBytes(32),c=openCommerce(dir);
 const config={endpoint:'https://script.google.com/macros/s/abc123-DEF_/exec',encryptionKey:secret.toString('base64'),authKey:auth.toString('base64')};
 try{
  const name=await uploadDriveBackup(dir,config,async (_url,request)=>{
   const body=JSON.parse(request.body);
   assert.equal(body.version,1);
   const digest=createHash('sha256').update(body.archive).digest('hex');
   const signature=createHmac('sha256',auth).update([body.timestamp,body.nonce,body.name,digest].join('\n')).digest('hex');
   assert.equal(body.signature,signature);
   assert.equal(decryptBackup(Buffer.from(body.archive,'base64'),secret).subarray(0,16).toString(),'SQLite format 3\0');
   return {ok:true,text:async()=>JSON.stringify({ok:true,name:body.name})};
  });
  assert.match(name,/^mvn-20\d{2}-\d{2}-\d{2}\.sqlite\.enc$/);
  await assert.rejects(uploadDriveBackup(dir,{...config,endpoint:'http://wrong.invalid'}),/Invalid Google Apps Script endpoint/);
  await assert.rejects(uploadDriveBackup(dir,config,async()=>({ok:true,text:async()=>JSON.stringify({ok:false})})),/did not confirm/);
 }finally{c.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('scheduler remains disabled until credentials are complete',()=>{
 assert.equal(startDriveBackupScheduler('/tmp/mvn-unused',{}),null);
 let logged=false;
 assert.equal(startDriveBackupScheduler('/tmp/mvn-unused',{MVN_BACKUP_ENDPOINT:'x'},{error:()=>{logged=true}}),null);
 assert.equal(logged,true);
});
