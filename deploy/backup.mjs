// Run inside the application container/host. Destination must be private storage.
import {DatabaseSync,backup} from 'node:sqlite';
import {resolve,dirname} from 'node:path';
import {mkdirSync,chmodSync} from 'node:fs';
const destination=process.argv[2];if(!destination)throw Error('Usage: node deploy/backup.mjs PRIVATE_DESTINATION.sqlite');
const target=resolve(destination);mkdirSync(dirname(target),{recursive:true,mode:0o700});
const db=new DatabaseSync(resolve(process.env.DATA_DIR||'runtime','orders.sqlite'),{readOnly:true});await backup(db,target);chmodSync(target,0o600);db.close();console.log('Private SQLite backup completed.');
