import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openCommerce} from '../commerce.mjs';
import {createVerifiedLocalBackup} from '../deploy/local-backups.mjs';

test('verified local snapshots restore orders and preserve previous values',async()=>{
 const root=mkdtempSync(join(tmpdir(),'mvn-autobackup-'));
 const dataDir=join(root,'mvn-staging');
 let live,snapshot;
 try{
  live=openCommerce(dataDir);
  live.db.prepare('INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)')
    .run('backup-user','example@example.test','Test Buyer','test-only','customer','2026-11-07T00:00:00Z');
  const first=await createVerifiedLocalBackup({dataDir,keep:2,now:new Date('2026-11-07T01:00:00Z')});
  assert.equal(first.verified,true);
  assert.equal(first.users,1);
  assert.equal(statSync(first.file).mode&0o777,0o600);
  snapshot=new DatabaseSync(first.file,{readOnly:true});
  assert.equal(snapshot.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.equal(snapshot.prepare("SELECT name FROM users WHERE id='backup-user'").get().name,'Test Buyer');
  snapshot.close();snapshot=null;

  live.db.prepare("UPDATE users SET name='Updated Buyer' WHERE id='backup-user'").run();
  const skip=await createVerifiedLocalBackup({dataDir,minimumAgeMs:23*60*60*1000,keep:2,now:new Date('2026-11-07T02:00:00Z')});
  assert.equal(skip.skipped,true);
  const second=await createVerifiedLocalBackup({dataDir,keep:2,now:new Date('2026-11-08T01:00:00Z')});
  snapshot=new DatabaseSync(second.file,{readOnly:true});
  assert.equal(snapshot.prepare("SELECT name FROM users WHERE id='backup-user'").get().name,'Updated Buyer');
  snapshot.close();snapshot=null;
  const third=await createVerifiedLocalBackup({dataDir,keep:2,now:new Date('2026-11-09T01:00:00Z')});
  assert.equal(third.verified,true);
  const backups=readdirSync(join(dataDir,'backups')).filter(n=>n.endsWith('.sqlite'));
  assert.equal(backups.length,2,'keep only last two verified local snapshots');
  assert.ok(backups.every(n=>n.startsWith('orders-')));
 }finally{
  snapshot?.close();live?.db.close();rmSync(root,{recursive:true,force:true});
 }
});
