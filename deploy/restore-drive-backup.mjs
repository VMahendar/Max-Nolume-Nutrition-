// Offline restore verifier: never overwrite an existing or live SQLite database.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {decryptBackup} from './drive-backup.mjs';
const [encryptedFile,newDbFile]=process.argv.slice(2);
if(!encryptedFile||!newDbFile)throw Error('Usage: node deploy/restore-drive-backup.mjs BACKUP.sqlite.enc NEW_EMPTY_PATH.sqlite');
const raw=process.env.MVN_BACKUP_ENCRYPTION_KEY_B64||'',secret=Buffer.from(raw,'base64');
if(secret.length!==32||secret.toString('base64')!==raw)throw Error('Invalid backup decryption key');
const destination=resolve(newDbFile);
if(existsSync(destination))throw Error('Refusing to overwrite an existing database');
const plaintext=decryptBackup(readFileSync(resolve(encryptedFile)),secret);
mkdirSync(dirname(destination),{recursive:true,mode:0o700});
writeFileSync(destination,plaintext,{flag:'wx',mode:0o600});
const db=new DatabaseSync(destination,{readOnly:true});
try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('SQLite integrity check failed');console.log('Backup decrypted and SQLite integrity verified in a NEW location.');}
finally{db.close();}
