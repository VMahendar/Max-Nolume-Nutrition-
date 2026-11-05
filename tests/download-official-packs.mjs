import {mkdirSync,writeFileSync} from 'node:fs';
const urls=[
'https://unicornproseries.com/wp-content/uploads/2026/09/Potency-Whey.png',
'https://unicornproseries.com/wp-content/uploads/2026/07/Nitro-Mass-1.png',
'https://unicornproseries.com/wp-content/uploads/2026/07/47305.jpeg',
'https://unicornproseries.com/wp-content/uploads/2026/07/Stuedy-Watermelon.png',
'https://unicornproseries.com/wp-content/uploads/2026/05/Pro-Creatine-Blueberry-1.png',
'https://unicornproseries.com/wp-content/uploads/2026/07/Nitro-Mass.png'
];
mkdirSync('reports/official-photo-research',{recursive:true});
for(let i=0;i<urls.length;i++){
 const r=await fetch(urls[i],{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36','Accept':'image/png,image/jpeg,image/webp,image/*,*/*;q=0.8'},signal:AbortSignal.timeout(35000)});
 const b=Buffer.from(await r.arrayBuffer());
 const png=b.subarray(0,8).toString('hex')==='89504e470d0a1a0a',jpg=b.subarray(0,3).toString('hex')==='ffd8ff';
 if(!r.ok||(!png&&!jpg))throw Error('Invalid image '+i+' status '+r.status+' '+b.subarray(0,150));
 const path='reports/official-photo-research/raw-'+i+(jpg?'.jpg':'.png');
 writeFileSync(path,b);
 console.log('VERIFIED_PHOTO_IMAGE',JSON.stringify({index:i,url:urls[i],bytes:b.length,path}));
}
