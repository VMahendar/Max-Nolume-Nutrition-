import {backup, DatabaseSync} from 'node:sqlite';
import {randomBytes,createCipheriv,createDecipheriv,createHmac,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,unlinkSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const MAGIC=Buffer.from('MVNBK1'),AAD=Buffer.from('max-volume-nutrition/sqlite-backup/v1'),MAX_BYTES=6*1024*1024;
function key(value,label){
 const v=Buffer.from(value||'','base64');
 if(v.length!==32||v.toString('base64')!==value)throw Error(label+' requires a private 32-byte base64 key.');
 return v;
}
export function encryptBackup(plain,secret){
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',secret,iv);
 c.setAAD(AAD);
 const ciphertext=Buffer.concat([c.update(plain),c.final()]);
 return Buffer.concat([MAGIC,iv,c.getAuthTag(),ciphertext]);
}
export function decryptBackup(data,secret){
 if(data.length<34||!data.subarray(0,6).equals(MAGIC))throw Error('Invalid MVN backup format');
 const d=createDecipheriv('aes-256-gcm',secret,data.subarray(6,18));
 d.setAAD(AAD);d.setAuthTag(data.subarray(18,34));
 return Buffer.concat([d.update(data.subarray(34)),d.final()]);
}
export async function encryptedSnapshot(directory,secret){
 const source=join(directory,'orders.sqlite');
 if(!existsSync(source))throw Error('SQLite database missing.');
 const target=join(directory,'.mvn-snapshot-'+randomBytes(12).toString('hex')+'.sqlite');
 const db=new DatabaseSync(source,{readOnly:true});
 try{
  await backup(db,target);
  const copy=new DatabaseSync(target,{readOnly:true});
  try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup integrity check failed');}
  finally{copy.close();}
  const plaintext=readFileSync(target);
  if(plaintext.length>MAX_BYTES)throw Error('Backup too large for the configured Google Apps Script receiver.');
  return encryptBackup(plaintext,secret);
 }finally{db.close();try{unlinkSync(target);}catch{}}
}
export async function uploadDriveBackup(directory,settings,fetcher=fetch){
 const secret=key(settings.encryptionKey,'MVN_BACKUP_ENCRYPTION_KEY_B64');
 const auth=key(settings.authKey,'MVN_BACKUP_AUTH_KEY_B64');
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(settings.endpoint||''))throw Error('Invalid Google Apps Script endpoint');
 const timestamp=new Date().toISOString(),name='mvn-'+timestamp.slice(0,10)+'.sqlite.enc';
 const archive=(await encryptedSnapshot(directory,secret)).toString('base64');
 const body={version:1,timestamp,nonce:randomBytes(16).toString('hex'),name,archive};
 const checksum=createHash('sha256').update(body.archive).digest('hex');
 body.signature=createHmac('sha256',auth).update([timestamp,body.nonce,name,checksum].join('\n')).digest('hex');
 const response=await fetcher(settings.endpoint,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Google Drive receiver HTTP '+response.status);
 let result;try{result=JSON.parse(await response.text());}catch{throw Error('Google Drive receiver returned invalid JSON');}
 if(result.ok!==true||result.name!==name)throw Error('Google Drive did not confirm the backup.');
 return name;
}
export function startDriveBackupScheduler(directory,env=process.env,logger=console){
 const required=['MVN_BACKUP_ENDPOINT','MVN_BACKUP_ENCRYPTION_KEY_B64','MVN_BACKUP_AUTH_KEY_B64'];
 if(required.every(k=>!env[k]))return null;
 if(required.some(k=>!env[k])){logger.error('Offsite backups disabled: missing configuration.');return null;}
 mkdirSync(directory,{recursive:true,mode:0o700});
 const marker=join(directory,'.mvn-drive-backup-state.json');
 let running=false;
 async function tick(){
  if(running)return;
  const now=new Date();
  if(now.getUTCHours()<20||(now.getUTCHours()===20&&now.getUTCMinutes()<30))return;
  const day=now.toISOString().slice(0,10);
  let previous;try{previous=JSON.parse(readFileSync(marker,'utf8')).day;}catch{}
  if(previous===day)return;
  running=true;
  try{
   const name=await uploadDriveBackup(directory,{endpoint:env.MVN_BACKUP_ENDPOINT,encryptionKey:env.MVN_BACKUP_ENCRYPTION_KEY_B64,authKey:env.MVN_BACKUP_AUTH_KEY_B64});
   writeFileSync(marker,JSON.stringify({day,name,completedAt:new Date().toISOString()}),{mode:0o600});
   logger.info('Encrypted Google Drive backup confirmed: '+name);
  }catch(e){logger.error('Encrypted Google Drive backup failed: '+e.message);}finally{running=false;}
 }
 const timer=setInterval(()=>void tick(),60*60*1000),first=setTimeout(()=>void tick(),60*1000);
 timer.unref();first.unref();
 return ()=>{clearInterval(timer);clearTimeout(first);};
}
