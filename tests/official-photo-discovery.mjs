import {writeFileSync,mkdirSync} from 'node:fs';
const urls=[
 'https://unicornproseries.com/shop/',
 'https://unicornproseries.com/',
 'https://unicornproseries.com/product-category/protein/',
 'https://unicornproseries.com/wp-json/wc/store/v1/products?per_page=100',
 'https://unicornproseries.com/wp-json/wp/v2/search?search=potency&per_page=100',
 'https://revakanya.com/products.html'
];
const reports=[];mkdirSync('reports/official-photo-research',{recursive:true});
const clean=t=>t.replace(/&amp;/g,'&').replace(/&#038;/g,'&').replace(/&quot;/g,'"').replace(/&#8211;/g,'–');
for(let i=0;i<urls.length;i++){
 const url=urls[i],item={url};
 try{
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36','Accept':'text/html,application/json,application/xhtml+xml'},signal:AbortSignal.timeout(25000)});
  const body=await r.text();item.status=r.status;item.finalUrl=r.url;item.length=body.length;item.contentType=r.headers.get('content-type');
  writeFileSync('reports/official-photo-research/page-'+i+'.txt',body.slice(0,800000));
  if(body.startsWith('[')||body.startsWith('{')){
   try{let d=JSON.parse(body),rows=Array.isArray(d)?d:d.products||[];item.products=rows.slice(0,80).map(x=>({name:x.name||x.title,slug:x.slug,id:x.id,permalink:x.permalink,images:x.images?.slice(0,3).map(y=>({src:y.src,thumbnail:y.thumbnail,alt:y.alt})),prices:x.prices,price:x.price,url:x.url,subtype:x.subtype}));}catch(e){item.jsonError=String(e)}
  }else{
   item.images=[...body.matchAll(/<img\b[^>]*>/gi)].slice(0,120).map(x=>({tag:clean(x[0]).slice(0,650)}));
   item.productLinks=[...body.matchAll(/href=['"]([^'"]+)['"][^>]*>([^<]*(?:Potency|Whey|Nitro|Sturdy|Creatine|Mass)[^<]*)/gi)].slice(0,80).map(x=>({url:clean(x[1]),text:x[2].trim()}));
   item.newPackaging=body.toLowerCase().includes('nitro mass');
  }
 }catch(e){item.error=String(e)}
 reports.push(item);
}
writeFileSync('reports/official-photo-research/report.json',JSON.stringify(reports,null,2));
for(const x of reports){
 console.log('OFFICIAL_DIAG',JSON.stringify({url:x.url,status:x.status,length:x.length,contentType:x.contentType,error:x.error,
 products:x.products?.slice(0,30),images:x.images?.filter(y=>/potency|mass|nitro|sturdy|creatine|whey|woocommerce-product/i.test(y.tag)).slice(0,38),productLinks:x.productLinks?.slice(0,36)}));
}
