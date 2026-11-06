// Local recovery snapshots for the single-instance SQLite storefront.
// Never expose this directory via HTTP or commit its contents to source control.
import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync,existsSync,statSync,statfsSync,chmodSync,copyFileSync,renameSync,readdirSync,unlinkSync} from 'node:fs';
import {resolve,join,isAbsolute} from 'node:path';
import {randomBytes} from 'node:crypto';

const DAY=24*60*60*1000;
const NAME=/^orders-\d{8}T\d{6}Z-[a-f0-9]{8}\.sqlite$/;
const stamp=date=>date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const available=directory=>readdirSync(directory).filter(name=>NAME.test(name)).sort().reverse();

export async function createVerifiedLocalBackup({dataDir,minimumAgeMs=0,keep=3,now=new Date()}={}){
  if(typeof dataDir!=='string'||!isAbsolute(dataDir))throw Error('Backup requires an explicit absolute DATA_DIR.');
  if(!Number.isSafeInteger(keep)||keep<1||keep>12)throw Error('Invalid backup retention count.');
  const source=join(resolve(dataDir),'orders.sqlite');
  if(!existsSync(source))throw Error('Existing SQLite database not found; refusing to create one.');
  const directory=join(resolve(dataDir),'backups');
  mkdirSync(directory,{recursive:true,mode:0o700});
  const existing=available(directory);
  if(minimumAgeMs>0&&existing.length&&now.getTime()-statSync(join(directory,existing[0])).mtimeMs<minimumAgeMs)
    return {skipped:true,reason:'recent verified local backup exists'};
  const bytes=statSync(source).size;
  const free=statfsSync(directory);
  if(free.bavail*free.bsize<bytes*3+16*1024*1024)throw Error('Insufficient free space for backup plus isolated restore test.');
  const name='orders-'+stamp(now)+'-'+randomBytes(4).toString('hex')+'.sqlite';
  const temporary=join(directory,'.'+name+'.partial');
  const restore=join(directory,'.'+name+'.restore-test');
  const target=join(directory,name);
  let reader,verified;
  try{
    reader=new DatabaseSync(source,{readOnly:true});
    await backup(reader,temporary);
    reader.close();reader=null;
    chmodSync(temporary,0o600);
    // Restore into an isolated scratch file: never touch the active database or WAL.
    copyFileSync(temporary,restore);
    chmodSync(restore,0o600);
    verified=new DatabaseSync(restore,{readOnly:true});
    const checks=verified.prepare('PRAGMA integrity_check').all();
    if(checks.length!==1||checks[0].integrity_check!=='ok')throw Error('Backup failed SQLite integrity check.');
    const products=verified.prepare('SELECT COUNT(*) AS total FROM products').get().total;
    const users=verified.prepare('SELECT COUNT(*) AS total FROM users').get().total;
    const orders=verified.prepare('SELECT COUNT(*) AS total FROM orders').get().total;
    const settings=verified.prepare('SELECT COUNT(*) AS total FROM settings').get().total;
    if(products<1||settings<1)throw Error('Backup lacks expected store records.');
    verified.close();verified=null;
    unlinkSync(restore);
    renameSync(temporary,target);
    // Prune only files matching our exact naming scheme, and only after successful verification.
    for(const old of available(directory).slice(keep))unlinkSync(join(directory,old));
    return {file:target,products,users,orders,verified:true};
  }catch(error){
    try{verified?.close()}catch{}
    try{reader?.close()}catch{}
    for(const path of [temporary,restore])try{if(existsSync(path))unlinkSync(path)}catch{}
    throw error;
  }
}

export function startLocalBackupScheduler(env=process.env){
  if(env.BACKUP_LOCAL_ENABLED!=='true')return;
  const dir=env.DATA_DIR;
  // This deployment's persistent Render disk is mounted at /var/data.
  if(typeof dir!=='string'||!resolve(dir).startsWith('/var/data/')){
    console.error('Local backups disabled: DATA_DIR must be inside the Render persistent disk.');
    return;
  }
  let running=false;
  const run=async()=>{
    if(running)return;running=true;
    try{
      const result=await createVerifiedLocalBackup({dataDir:dir,minimumAgeMs:23*60*60*1000});
      if(result.skipped)console.log('SQLite backup: recent verified copy retained.');
      else console.log('SQLite backup: verified isolated restore; local recovery copy created.');
    }catch(error){console.error('SQLite backup failed:',error.code||error.message);}
    finally{running=false;}
  };
  // The web-service instance owns its disk; a separate Render cron service cannot access it.
  const start=setTimeout(()=>{
    void run();
    const daily=setInterval(()=>void run(),DAY);
    daily.unref();
  },60_000);
  start.unref();
}
