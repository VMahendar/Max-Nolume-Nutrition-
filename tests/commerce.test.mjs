import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {passwordHash,passwordMatches,taxQuote} from '../commerce.mjs';
import {shipmentPayload} from '../integrations.mjs';
import {quote} from '../lib.mjs';

test('password hashes are salted and enforce password bounds',async()=>{const a=await passwordHash('strong-test-password'),b=await passwordHash('strong-test-password');assert.notEqual(a,b);assert.equal(await passwordMatches('strong-test-password',a),true);assert.equal(await passwordMatches('wrong',a),false);await assert.rejects(passwordHash('short'));await assert.rejects(passwordHash('x'.repeat(129)));});
const products=[{name:'Product',hsn:'21069099',gstRateBps:1800,variants:[{id:'a',label:'Pack',pricePaise:11800,stock:10}]}];
const config={enabled:true,approved:true,sellerStateCode:'33',sellerGstin:'33AAAAA0000A1Z5',legalName:'Test seller',address:'Business address',shippingRateBps:1800,invoicePrefix:'MV'};
test('GST is extracted from existing inclusive prices without increasing customer totals',()=>{const base=quote([{variantId:'a',quantity:2}],products,1180);const result=taxQuote(base,products,{state:'Tamil Nadu'},config);assert.equal(result.totalPaise,24780);assert.equal(result.lines[0].taxablePaise,20000);assert.equal(result.tax.totalPaise,3780);assert.equal(result.tax.cgstPaise,1890);assert.equal(result.tax.sgstPaise,1890);assert.equal(result.tax.igstPaise,0);});
test('interstate GST uses IGST; unapproved and incomplete tax configuration is blocked',()=>{const q=quote([{variantId:'a',quantity:1}],products,0);const result=taxQuote(q,products,{state:'Karnataka'},config);assert.equal(result.tax.igstPaise,1800);assert.equal(result.tax.cgstPaise,0);assert.throws(()=>taxQuote(q,products,{state:'Tamil Nadu'},{...config,approved:false}));assert.throws(()=>taxQuote(q,[{...products[0],hsn:null}],{state:'Tamil Nadu'},config));assert.equal(taxQuote(q,products,{}, {enabled:false}).totalPaise,q.totalPaise);});
test('shipping uses authoritative paid-order lines and validates package dimensions',()=>{const row={id:'MV-test',created:'2026-11-01T00:00:00Z',payload:JSON.stringify({customer:{name:'Test',address:'Street',city:'Chennai',pincode:'600001',state:'Tamil Nadu',email:'x@example.com',phone:'9876543210'},lines:[{name:'Product',variant:'Pack',variantId:'a',quantity:2,unitPaise:11800}],subtotalPaise:23600,shippingPaise:500})};const p=shipmentPayload(row,{weight:1,length:10,breadth:10,height:10});assert.equal(p.payment_method,'Prepaid');assert.equal(p.order_items[0].selling_price,118);assert.equal(p.order_id,'MV-test');assert.throws(()=>shipmentPayload(row,{weight:-1,length:10,breadth:10,height:10}));});
