import test from 'node:test';
import assert from 'node:assert/strict';
import {courierChoices} from '../courier-preference.mjs';

test('actual serviceability options put Delhivery first without assuming its presence',()=>{
 const incoming={data:{available_courier_companies:[
  {courier_company_id:23,courier_name:'Xpressbees Air',rate:115.5},
  {courier_company_id:43,courier_name:'Delhivery Surface',rate:75.25},
  {courier_company_id:10,courier_name:'Delhivery',rate:88},
 ]}};
 const choices=courierChoices(incoming);
 assert.deepEqual(choices.map(c=>c.id),[10,43,23]);
 assert.equal(choices[0].delhivery,true);
 assert.equal(choices[1].estimatedRateRupees,75.25);
 assert.equal(choices[2].delhivery,false);
});
test('no Delhivery quote never invents availability',()=>{
 assert.deepEqual(courierChoices({data:{available_courier_companies:[{courier_company_id:33,courier_name:'Xpressbees',rate:60}]}}).map(x=>x.delhivery),[false]);
 assert.deepEqual(courierChoices({data:{available_courier_companies:[]}}),[]);
 assert.deepEqual(courierChoices({}),[]);
});
test('invalid, duplicate and unsafe courier results are ignored',()=>{
 const choices=courierChoices({data:{available_courier_companies:[
  {courier_company_id:10,courier_name:'Delhivery',rate:'invalid'},
  {courier_company_id:10,courier_name:'Duplicate id',rate:30},
  {courier_company_id:-1,courier_name:'Invalid',rate:10},
  {courier_company_id:'oops',courier_name:'Invalid',rate:10},
  {courier_company_id:22,courier_name:'',rate:10},
  {courier_company_id:23,courier_name:'Other Carrier',rate:-1}
 ]}});
 assert.equal(choices.length,2);
 assert.equal(choices[0].id,10);
 assert.equal(choices[0].estimatedRateRupees,null);
 assert.equal(choices[1].estimatedRateRupees,null);
});
