// MVN campaign category cards use the existing retail catalogue filters.
// The app.js filter handler runs first; this adds only the expected jump to results.
(() => {
  const shop=document.getElementById('shop');
  if(!shop)return;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.mvn-editorial-category[data-cat]').forEach(link=>{
    link.addEventListener('click',()=>{
      window.requestAnimationFrame(()=>shop.scrollIntoView({
        behavior:reduceMotion.matches?'instant':'smooth',
        block:'start'
      }));
    });
  });
})();
