import {randomUUID} from 'node:crypto';
import {clean,fail} from './commerce.mjs';

export const workContext={repository:'VMahendar/Max-Volume-Nutrition-',workspace:'Max Volume Nutrition',workspaceId:'tea-dbjqt8nlk1mc73a26c10',connection:'manual-handoff'};
export function initializeOwnerWork(C){
 C.db.exec('CREATE TABLE IF NOT EXISTS owner_work(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,actor TEXT NOT NULL,request TEXT NOT NULL,created TEXT NOT NULL)');
}
export function saveOwnerWork(C,user,b){
 const request=clean(b.request,6000),requestKey=clean(b.requestKey,80);
 if(!/^[a-f0-9-]{36}$/i.test(requestKey))fail(400,'Invalid request reference.');
 return C.tx(()=>{
  const old=C.db.prepare('SELECT id,request,created,actor FROM owner_work WHERE request_key=?').get(requestKey);
  if(old){if(old.actor!==user.id||old.request!==request)fail(409,'This reference belongs to a different request.');return {id:old.id,request:old.request,created:old.created};}
  const entry={id:randomUUID(),request,created:new Date().toISOString()};
  C.db.prepare('INSERT INTO owner_work VALUES(?,?,?,?,?)').run(entry.id,requestKey,user.id,request,entry.created);
  C.audit(user.id,'owner-work.save',entry.id);
  return entry;
 });
}
