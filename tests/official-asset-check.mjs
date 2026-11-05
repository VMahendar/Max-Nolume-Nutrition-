const targets=[
 'https://unicornproseries.com/wp-content/uploads/2026/09/Potency-Whey.png',
 'https://unicornproseries.com/wp-content/uploads/2026/09/Potency-Whey-300x300.png',
 'https://unicornproseries.com/wp-content/uploads/2026/07/Nitro-Mass-1.png',
 'https://unicornproseries.com/wp-content/uploads/2026/07/47305.jpeg',
 'https://unicornproseries.com/wp-content/uploads/2026/07/Stuedy-Pinapple.png',
 'https://unicornproseries.com/wp-content/uploads/2026/05/Pro-Creatine-Blueberry-1.png',
 'https://revakanya.com/assets/imgs/Potency%20Whey.png',
 'https://static.wixstatic.com/media/1ff000_f0a98421d4c647d18591722f454076cf~mv2.png'
];
for(const url of targets){
 for(const ref of ['','https://unicornproseries.com/shop/']){
  try{
   const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36','Accept':'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',...(ref?{Referer:ref}:{})},signal:AbortSignal.timeout(18000)});
   const buff=Buffer.from(await response.arrayBuffer());
   const isImage=buff.subarray(0,8).toString('hex').startsWith('89504e47')||buff.subarray(0,3).toString('hex')==='ffd8ff'||buff.subarray(0,4).toString()==='RIFF';
   console.log('PHOTO_FETCH',JSON.stringify({url,ref,status:response.status,redirected:response.redirected,contentType:response.headers.get('content-type'),len:buff.length,isImage,head:!isImage?buff.toString('utf8').slice(0,350):buff.subarray(0,24).toString('hex')}));
   if(ref||isImage)break;
  }catch(e){console.log('PHOTO_ERROR',url,ref,String(e))}
 }
}
