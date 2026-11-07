if(new URLSearchParams(location.search).get('app')==='1'||matchMedia('(display-mode: standalone)').matches||navigator.standalone){
 document.body.classList.add('app-account');
 const header=document.createElement('header');header.className='native-app-header';
 const back=document.createElement('a');back.href='mobile-app.html';back.textContent='← MVN app';
 const title=document.createElement('strong');title.textContent='My account';header.append(back,title);document.body.prepend(header);
 document.querySelectorAll('a[href="index.html#shop"],a[href="index.html"]').forEach(link=>link.href='mobile-app.html');
}