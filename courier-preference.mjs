// Normalize serviceability quotes without assuming a courier is available for every route.
// Data is provided by the authenticated Shiprocket API, not by our static courier list.
export function courierChoices(serviceability){
 const array=serviceability?.data?.available_courier_companies;
 if(!Array.isArray(array))return [];
 const seen=new Set();
 const list=[];
 for(const row of array){
  if(!row||typeof row!=='object')continue;
  const id=Number(row.courier_company_id??row.courier_id??row.id);
  if(!Number.isSafeInteger(id)||id<=0||seen.has(id))continue;
  const name=String(row.courier_name??row.name??'').trim().slice(0,100);
  if(!name)continue;
  seen.add(id);
  const rate=Number(row.rate);
  const isDelhivery=/delhivery/i.test(name);
  list.push({id,name,delhivery:isDelhivery,estimatedRateRupees:Number.isFinite(rate)&&rate>=0?rate:null});
 }
 return list.sort((a,b)=>Number(b.delhivery)-Number(a.delhivery)||a.name.localeCompare(b.name));
}
