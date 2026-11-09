/* Self-contained, verified QR matrices; no external QR service or tracking. */
const QR_LINKS = [
 {id:'website',title:'SHOP WEBSITE',subtitle:'Browse retail products and send orders',url:'https://max-volume-nutrition-preview.onrender.com/',n:45,bits:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD+OgMD+AQR/xsQQC6WjRy6AXWMTsXQC6Ylgq6AQV1rdQQD+qqqr+AAEfhbAABiCPHDQAWFFa4TwA2zvkWyAbBAIEOAALmZibWARn8wi5wDHGd+xaARCNNDqAArou4TAACBhBLSQDW/mkUqAdodwFqQCSWWmaWAJkSuyYQAi9nn52AFIQAm6QAbXYPvWAIHjM9IwDiiLXOCABPdoX+gDLqkkPwAAEP67GQD+DGFq6AQQdOHGwC6MRWfgAXSdwePwC6j5SIuAQWihz6AD+ZnAMyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='},
 {id:'app',title:'INSTALL WEB APP',subtitle:'Open the mobile storefront and add to home screen',url:'https://max-volume-nutrition-preview.onrender.com/mobile-app.html',n:49,bits:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP6xEnc/gEFcUN+QQC6gFTjLoBdXUL2F0AurL9dy6AQQ+I39BAP6qqqq/gABIoL9AABrPM7Nr4A8zdckc8A2nnxTEOAWoRqpnQAHMXbcflAA5m0MpxwBrOlHGIYBkuN572EAPhjpzbUAWg2iZBHAFrPNqSJgADonfQIAAGcjO45QBewTUWWsAVyRSCm+ARGvhY6gAF5JCsXkgAQz+VUwwDm2xogGoBCCAn/YAA4kTPXfWAAIzlrVDALY4vHyPgCrSAqfwwCyMirc/QAAYxZCRsA/q9CQ6iAQSDoj0QALqqRRL5gF08fGUmgC62voLm4BBbyr6yIA/mRyz72AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='},
 {id:'whatsapp',title:'WHATSAPP ORDERS',subtitle:'Message the MVN team for stock and order confirmation',url:'https://wa.me/917708830513',n:37,bits:'AAAAAAAAAAAAAAAAAAAAAAAAAP40M/gEFjJQQC6UqroBdYe10AurX66AQTL1BAP6qq/gABhTAABe7TbQA4+GZ4ArthGQACNSoxAOusHhACiJMVwC7Pd9YAOpTl4Ak7fEQAfCB6wAOtRUegGjrDzQDal3+wAAVtx4A/mn6sAQWhsbALqC/5gF1NYKgC6PM3YBBWotUA/iKpwAAAAAAAAAAAAAAAAAAAAAAAAAAA=='}
];
function QRimage(data) {
 const bytes=Uint8Array.from(atob(data.bits),c=>c.charCodeAt(0));
 const n=data.n;let d='';
 for(let y=0;y<n;y++) for(let x=0;x<n;){
  const index=y*n+x;
  if(!((bytes[index>>3]>>(7-(index&7)))&1)){x++;continue;}
  let run=1;
  for(;x+run<n;run++){const next=y*n+x+run;if(!((bytes[next>>3]>>(7-(next&7)))&1))break;}
  d+='M'+x+' '+y+'h'+run+'v1h-'+run+'z';
  x+=run;
 }
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n+' '+n+'" shape-rendering="crispEdges"><rect width="'+n+'" height="'+n+'" fill="#fff"/><path fill="#09244e" d="'+d+'"/></svg>';
 return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function qrCard(item) {
 const a=document.createElement('article');a.className='mvn-qr-card';
 const title=document.createElement('h3');title.textContent=item.title;
 const text=document.createElement('p');text.textContent=item.subtitle;
 const img=document.createElement('img');img.src=QRimage(item);img.alt='Scannable QR code: '+item.title;img.width=196;img.height=196;img.loading='lazy';img.decoding='async';
 const actions=document.createElement('div');actions.className='mvn-qr-actions';
 const open=document.createElement('a');open.href=item.url;open.target='_blank';open.rel='noopener noreferrer';open.textContent='OPEN LINK';
 const download=document.createElement('a');download.href=img.src;download.download='MVN-'+item.id+'-QR.svg';download.textContent='SAVE QR';download.className='mvn-save-qr';
 actions.append(open,download);a.append(img,title,text,actions);return a;
}
function initQrCodes(){
 const page=document.getElementById('mvn-qr-list');
 if(page)page.replaceChildren(...QR_LINKS.map(qrCard));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initQrCodes,{once:true});else initQrCodes();
