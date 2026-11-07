// Festival and app-storefront offers. Amounts are integer paise; one code per cart.
export function validateCampaign(input){
 const text=(value,max=200)=>String(value??'').trim().slice(0,max);
 const result={id:text(input.id,50),title:text(input.title,100),description:text(input.description,500),occasion:text(input.occasion,50),code:text(input.code,30).toUpperCase(),surface:input.surface,type:input.type,amount:Number(input.amount),minimumPaise:Number(input.minimumPaise),capPaise:Number(input.capPaise),startsAt:text(input.startsAt,40),endsAt:text(input.endsAt,40),terms:text(input.terms,600),enabled:input.enabled===true};
 if(!/^[a-z0-9-]{1,50}$/.test(result.id)||!result.title||!['all','app','web'].includes(result.surface)||!['percent','fixed'].includes(result.type))throw Error('Enter a campaign ID, title, audience and discount type.');
 if(!/^[A-Z0-9-]{3,30}$/.test(result.code))throw Error('Use a unique offer code with 3–30 letters, numbers or hyphens.');
 for(const key of ['amount','minimumPaise','capPaise'])if(!Number.isSafeInteger(result[key])||result[key]<0||result[key]>100000000)throw Error('Offer amounts must be non-negative whole numbers.');
 if(result.type==='percent'&&result.amount>100)throw Error('Percentage cannot exceed 100.');
 if(result.enabled&&(!result.amount||!result.terms))throw Error('Set a discount and its terms before activating.');
 const iso=value=>/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{3})?)?(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value));
 if((result.startsAt&&!iso(result.startsAt))||(result.endsAt&&!iso(result.endsAt)))throw Error('Use timezone-aware campaign dates.');
 if(result.enabled&&(!iso(result.startsAt)||!iso(result.endsAt)||Date.parse(result.endsAt)<=Date.parse(result.startsAt)))throw Error('Set a valid start and end time, including timezone.');
 return result;
}
export function activeCampaigns(campaigns,surface,now=Date.now()){
 if(!['app','web'].includes(surface))return [];
 return (Array.isArray(campaigns)?campaigns:[]).filter(c=>c.enabled&&(c.surface==='all'||c.surface===surface)&&Date.parse(c.startsAt)<=now&&now<Date.parse(c.endsAt));
}
export function campaignQuote({campaigns,products,items,code,surface,now=Date.now()}){
 const campaign=activeCampaigns(campaigns,surface,now).find(c=>c.code===String(code||'').trim().toUpperCase());
 if(!campaign)throw Error('This code is unavailable, expired or not valid for this storefront.');
 if(!Array.isArray(items)||!items.length||items.length>30)throw Error('Add products before applying an offer.');
 const variants=new Map(products.flatMap(p=>p.variants).map(v=>[v.id,v]));let subtotalPaise=0;const seen=new Set();
 for(const item of items){const v=variants.get(item.variantId);if(!v||seen.has(v.id)||!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>999||!Number.isSafeInteger(v.pricePaise)||v.pricePaise<=0)throw Error('Invalid product, quantity or retail price.');seen.add(v.id);subtotalPaise+=v.pricePaise*item.quantity;}
 if(!Number.isSafeInteger(subtotalPaise))throw Error('Cart total is too large.');
 if(subtotalPaise<campaign.minimumPaise)throw Error('This offer needs a minimum products subtotal of ₹'+(campaign.minimumPaise/100).toLocaleString('en-IN')+'.');
 let discountPaise=campaign.type==='percent'?Math.floor(subtotalPaise*campaign.amount/100):campaign.amount;
 if(campaign.capPaise>0)discountPaise=Math.min(discountPaise,campaign.capPaise);
 discountPaise=Math.min(subtotalPaise,discountPaise);
 return {subtotalPaise,discountPaise,totalPaise:subtotalPaise-discountPaise,campaign:{id:campaign.id,code:campaign.code,title:campaign.title,terms:campaign.terms,endsAt:campaign.endsAt}};
}
