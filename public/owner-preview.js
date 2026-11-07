/* Private owner page navigation: no countdown bypass for public visitors.
 * Access to /owner-preview requires a valid administrator session server-side. */
(() => {
  const allowed = new Set(['index.html','mobile-app.html','account.html','wholesale-account.html','dealer.html','support.html','admin.html']);
  const here = new URL(location.href);
  const view = here.searchParams.get('view') === 'app' ? 'app' : (here.searchParams.get('view') === 'mobile' ? 'mobile' : 'desktop');
  document.querySelectorAll('a[href]').forEach(a => {
    if (a.closest('.mvn-owner-preview-nav') || a.hasAttribute('download')) return;
    const original = a.getAttribute('href');
    if (!original || original.startsWith('#')) return;
    let url;
    try { url = new URL(original, location.origin); } catch { return; }
    if (url.origin !== location.origin) return;
    const page = url.pathname.split('/').pop() || 'index.html';
    if (!allowed.has(page)) return;
    if (page === 'admin.html') return;
    const review = new URL('/owner-preview', location.origin);
    review.searchParams.set('view', view);
    review.searchParams.set('page', page);
    if (url.hash) review.hash = url.hash;
    a.href = review.pathname + review.search + review.hash;
  });
  const nav = document.querySelector('.mvn-owner-preview-nav');
  if (nav) nav.querySelectorAll('a').forEach(a => {
    const expected = a.href.includes('view='+view);
    if (expected) a.setAttribute('aria-current','page');
  });
})();
