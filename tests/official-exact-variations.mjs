const targets=['nitro-mass','sturdy-pre-workout-pineapple','potency-whey'];
for(const slug of targets){
 const url='https://unicornproseries.com/product/'+slug+'/';
 const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36'},signal:AbortSignal.timeout(22000)});
 const html=await r.text();const raw=html.match(/data-product_variations="([^"]+)"/)?.[1];
 let vars=[];if(raw){let txt=raw.replaceAll('&quot;','"').replaceAll('&#039;',"'").replaceAll('&amp;','&').replaceAll('&#038;','&');try{vars=JSON.parse(txt).map(v=>({attributes:v.attributes,price:v.display_price,regularPrice:v.display_regular_price,image:v.image?.url||v.image?.full_src||v.image?.src,variation_id:v.variation_id}))}catch(e){console.log('VAR_ERROR',slug,String(e),txt.slice(0,500))}}
 console.log('EXACT_PRODUCT_VARIATIONS',JSON.stringify({slug,status:r.status,variations:vars}));
}
