import {writeFileSync,mkdirSync} from 'node:fs';
const names=['potency','whey','chocolate','coffee','nitro','mass','watermelon','sturdy','pre','3kg','5kg','blueberry','cranberry'];
const targets=[
 ...names.map(q=>({type:'media',query:q,url:'https://unicornproseries.com/wp-json/wp/v2/media?search='+encodeURIComponent(q)+'&per_page=100&_fields=id,title,source_url,media_details'})),
 ...['nitro-mass','potency-whey','sturdy-pre-workout-pineapple'].map(q=>({type:'product',query:q,url:'https://unicornproseries.com/product/'+q+'/'})),
 {type:'store',query:'potency',url:'https://unicornproseries.com/wp-json/wc/store/v1/products?search=Potency&per_page=100'},
 {type:'store',query:'nitro',url:'https://unicornproseries.com/wp-json/wc/store/v1/products/2034'},
 {type:'store',query:'whey',url:'https://unicornproseries.com/wp-json/wc/store/v1/products/2078'}
];
mkdirSync('reports/official-photo-research',{recursive:true});
for(const t of targets){
 try{
  const r=await fetch(t.url,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36','Accept':'application/json,text/html,*/*'},signal:AbortSignal.timeout(22000)});
  const body=await r.text();let out={type:t.type,query:t.query,status:r.status,bytes:body.length};
  if(t.type==='media'){
   try{out.images=JSON.parse(body).slice(0,55).map(x=>({id:x.id,title:x.title?.rendered,url:x.source_url,metadata:x.media_details?.sizes?Object.keys(x.media_details.sizes).slice(0,9):[]}))}catch{out.head=body.slice(0,250)}
  }else if(t.type==='store'){
   try{const data=JSON.parse(body);out.product=(Array.isArray(data)?data:[data]).map(x=>({id:x.id,name:x.name,type:x.type,prices:x.prices,images:x.images?.map(y=>({id:y.id,src:y.src,alt:y.alt})),variations:x.variations,attributes:x.attributes,has_options:x.has_options,is_purchasable:x.is_purchasable}))}catch{out.head=body.slice(0,250)}
  }else{
   out.mediaUrls=[...new Set([...body.matchAll(/https?:[^"'\s<>]+(?:png|jpe?g|webp)/gi)].map(x=>x[0].replaceAll('&amp;','&')))].filter(x=>/potency|whey|nitro|mass|chocolate|coffee|sturdy|watermelon/i.test(x)).slice(0,45);
   out.variationSnippet=(body.match(/data-product_variations=['"][\s\S]{0,18000}/i)||[])[0]?.slice(0,3500);
  }
  console.log('VARIANT_MEDIA',JSON.stringify(out));
 }catch(e){console.log('VARIANT_MEDIA',JSON.stringify({type:t.type,query:t.query,error:String(e)}))}
}
