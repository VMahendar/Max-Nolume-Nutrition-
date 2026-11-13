import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {parseCSV,normalizeIndianPhone,stageContacts,importToDatabase} from '../import-marketing-contacts.mjs';
const consent={consentSource:'Owner confirmed all entries opted in for business announcements',confirmedAt:'2026-11-08T03:00:00Z'};
test('Google Contacts CSV quotes and duplicate phone numbers',()=>{
 const csv='First Name,Middle Name,Last Name,Phone 1 - Value,Phone 2 - Value\n"A, B",,Smith,+91 98765 43210,\nOther,,Person,9876543210,9123456789\nBad,,User,12345,\n';
 const r=stageContacts(csv,consent);
 assert.equal(r.valid,2);assert.equal(r.duplicates,1);assert.equal(r.invalid,1);
 assert.equal(r.contacts[0].name,'A, B Smith');
});
test('No import without consent provenance or with malformed CSV',()=>{
 assert.throws(()=>stageContacts('Phone 1 - Value\n9876543210'));
 assert.throws(()=>parseCSV('a,b\n"oops'));
 assert.equal(normalizeIndianPhone('1234'),null);
});
test('Import is idempotent and respects past opt-outs',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  const r=stageContacts('First Name,Phone 1 - Value\nTest,+91 9876543210\n',consent);
  assert.equal(importToDatabase(db,r),1);
  assert.equal(importToDatabase(db,r),1);
  db.prepare('UPDATE imported_marketing_contacts SET whatsapp_opt_in=0,opted_out_at=? WHERE phone=?').run('2026-11-08T04:00:00Z','919876543210');
  assert.equal(importToDatabase(db,r),0);
  assert.equal(db.prepare('SELECT whatsapp_opt_in FROM imported_marketing_contacts').get().whatsapp_opt_in,0);
 }finally{db.close();}
});
