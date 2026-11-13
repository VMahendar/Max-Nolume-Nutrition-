import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..','public');
const origin='https://maxvolumenutriton.shop';
const routes=['/','/dealer.html','/support.html','/potency-whey.html',
  '/nitro-mass.html','/pro-creatine.html','/sturdy-pre-workout.html',
  '/musclevite-multivitamin.html'];
const file=path=>readFileSync(resolve(root,path),'utf8');

test('sitemap lists only canonical public pages that exist',()=>{
 const xml=file('sitemap.xml');
 const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.deepEqual(urls,routes.map(route=>origin+route));
 assert.equal(new Set(urls).size,urls.length);
 for(const route of routes){
   assert.ok(existsSync(resolve(root,route==='/'?'index.html':route.slice(1))),route);
 }
 assert.doesNotMatch(xml,/admin|account|\/api\/|preview|onrender|chatgpt\.site/i);
});

test('public searchable pages have one canonical URL, metadata and meaningful page content',()=>{
 for(const route of routes){
   const html=file(route==='/'?'index.html':route.slice(1));
   const canonicals=[...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(m=>m[1]);
   assert.deepEqual(canonicals,[origin+route],route);
   assert.match(html,/<title>[^<]+<\/title>/i,route);
   assert.match(html,/<meta name="description" content="[^"]{35,}"/i,route);
   assert.match(html,/<h1\b[^>]*>/i,route);
 }
});

test('robots exposes sitemap but protects private account and APIs',()=>{
 const robots=file('robots.txt');
 assert.ok(robots.includes('Sitemap: '+origin+'/sitemap.xml'));
 assert.match(robots,/Disallow: \/api\//);
 assert.match(robots,/Disallow: \/admin\.html/);
 assert.match(robots,/Disallow: \/account\.html/);
 assert.doesNotMatch(robots,/Disallow: \/dealer\.html/);
});

test('homepage links to all product information pages',()=>{
 const html=file('index.html');
 for(const route of routes.filter(x=>x.includes('whey')||x.includes('mass.html')||x.includes('creatine')||x.includes('workout')||x.includes('multivitamin'))){
   assert.ok(html.includes('href="'+route.slice(1)+'"'),route);
 }
});
