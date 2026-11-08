import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

// Private operator-run contact staging. No API calls, outbound messages or customer logins.
export function parseCSV(text){
 const rows=[];let row=[],field='',quoted=false;
 text=String(text).replace(/^﻿/,'');
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
  else if(c==='"'){if(field!=='')throw Error('Invalid CSV quote');quoted=true;}
  else if(c===','){row.push(field);field='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];}
  else field+=c;
 }
 if(quoted)throw Error('Unterminated CSV quoted field');
 row.push(field);if(row.some(x=>x!==''))rows.push(row);
 if(!rows.length)throw Error('Empty CSV');
 const headers=rows.shift().map(x=>x.trim());
 if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV headers');
 return rows.map((cells,i)=>{if(cells.length!==headers.length)throw Error('CSV column mismatch at row '+(i+2));return Object.fromEntries(headers.map((h,j)=>[h,cells[j]]));});
}
export function normalizeIndianPhone(value){
 let s=String(value||'').trim().replace(/[\s()+.\-]/g,'');
 if(s.startsWith('00'))s=s.slice(2);
 if(s.startsWith('91')&&s.length===12)s=s.slice(2);
 return /^[6-9]\d{9}$/.test(s)?'91'+s:null;
}
export function stageContacts(csvText,{consentSource,confirmedAt}={}){
 if(!consentSource||typeof consentSource!=='string'||consentSource.trim().length<8)throw Error('A descriptive consent source is required');
 if(!confirmedAt||!Number.isFinite(Date.parse(confirmedAt))||Date.parse(confirmedAt)>Date.now())throw Error('Valid past consent confirmation time required');
 const rows=parseCSV(csvText),seen=new Map();let invalid=0,duplicates=0;
 for(const entry of rows){
  const name=[entry['First Name'],entry['Middle Name'],entry['Last Name']].filter(Boolean).join(' ').trim().slice(0,120);
  for(const key of ['Phone 1 - Value','Phone 2 - Value']){
   const raw=entry[key];if(!raw)continue;
   const phone=normalizeIndianPhone(raw);if(!phone){invalid++;continue;}
   if(seen.has(phone)){duplicates++;continue;}
   seen.set(phone,{phone,name:name&&name!=='?'?name:'Customer'});
  }
 }
 return {rows:rows.length,valid:seen.size,invalid,duplicates,contacts:[...seen.values()],consentSource:consentSource.trim(),confirmedAt:new Date(confirmedAt).toISOString()};
}
export function importToDatabase(db,result){
 db.exec(`CREATE TABLE IF NOT EXISTS imported_marketing_contacts(
   phone TEXT PRIMARY KEY,name TEXT NOT NULL,
   consent_source TEXT NOT NULL,consent_confirmed_at TEXT NOT NULL,
   imported_at TEXT NOT NULL,whatsapp_opt_in INTEGER NOT NULL DEFAULT 1,
   opted_out_at TEXT,CHECK(whatsapp_opt_in IN (0,1))
 );`);
 const insert=db.prepare(`INSERT INTO imported_marketing_contacts(phone,name,consent_source,consent_confirmed_at,imported_at)
 VALUES(?,?,?,?,?) ON CONFLICT(phone) DO UPDATE SET
 name=excluded.name,consent_source=excluded.consent_source,
 consent_confirmed_at=excluded.consent_confirmed_at,imported_at=excluded.imported_at
 WHERE imported_marketing_contacts.whatsapp_opt_in=1 AND imported_marketing_contacts.opted_out_at IS NULL`);
 const time=new Date().toISOString();let changes=0;
 db.exec('BEGIN IMMEDIATE');try{
  for(const c of result.contacts)changes+=insert.run(c.phone,c.name,result.consentSource,result.confirmedAt,time).changes;
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 return changes;
}
export function execute(argv=process.argv.slice(2)){
 const opts={};for(let i=0;i<argv.length;i++){
  const a=argv[i];if(a==='--commit'){opts.commit=true;continue;}
  if(!['--csv','--consent-source','--confirmed-at','--data-dir'].includes(a)||!argv[i+1])throw Error('Unknown/missing option '+a);
  opts[a.slice(2)]=argv[++i];
 }
 if(!opts.csv)throw Error('Use --csv with an existing private local file');
 const result=stageContacts(readFileSync(resolve(opts.csv),'utf8'),{consentSource:opts['consent-source'],confirmedAt:opts['confirmed-at']});
 let imported=0;
 if(opts.commit){
  const dir=resolve(opts['data-dir']||process.env.DATA_DIR||'./runtime');mkdirSync(dir,{recursive:true,mode:0o700});
  const db=new DatabaseSync(resolve(dir,'orders.sqlite'));try{imported=importToDatabase(db,result);}finally{db.close();}
 }
 return {inputRows:result.rows,uniqueValidPhoneNumbers:result.valid,invalidNumbers:result.invalid,duplicateNumbers:result.duplicates,committed:!!opts.commit,insertedOrUpdated:imported,sendEnabled:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(execute(),null,2));}catch(e){console.error('Import failed:',e.message);process.exitCode=1;}
}
