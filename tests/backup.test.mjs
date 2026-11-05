import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {openCommerce} from '../commerce.mjs';

test('online SQLite backup preserves committed orders-related data and restores with integrity',()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'mvn-backup-qa-'));
 let live,copy;
 try{
  live=openCommerce(resolve(dir,'runtime'));
  live.db.prepare('INSERT INTO users(id,email,name,password,role,created) VALUES(?,?,?,?,?,?)')
    .run('backup-account','backup@example.test','Backup Test','not-a-real-password','customer','2026-11-05T00:00:00Z');
  const dest=resolve(dir,'private-backups','verified-snapshot.sqlite');
  execFileSync(process.execPath,[resolve('deploy/backup.mjs'),dest],{
   env:{...process.env,DATA_DIR:resolve(dir,'runtime')},stdio:'pipe',timeout:12000
  });
  assert.equal(statSync(dest).mode&0o777,0o600,'snapshot file must be owner-only');
  copy=new DatabaseSync(dest,{readOnly:true});
  assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check,'ok','snapshot passes integrity check');
  assert.equal(copy.prepare("SELECT name FROM users WHERE id='backup-account'").get().name,'Backup Test','restored backup preserves committed records');
  assert.equal(copy.prepare("SELECT COUNT(*) AS n FROM products").get().n,5,'catalogue survives backup');
  assert.ok(copy.prepare("SELECT value FROM settings WHERE key='store'").get().value,'business settings survive backup');
  live.db.prepare('DELETE FROM users WHERE id=?').run('backup-account');
  assert.equal(copy.prepare("SELECT name FROM users WHERE id='backup-account'").get().name,'Backup Test','snapshot is independent of subsequent live changes');
 }finally{copy?.close();live?.db.close();rmSync(dir,{recursive:true,force:true});}
});
