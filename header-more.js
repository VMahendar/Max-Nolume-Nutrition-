// Accessible MVN three-dot header menu. Loaded from our own origin to obey CSP.
(() => {
  const menu = document.querySelector('.mvn-header-more');
  if (!menu) return;
  document.addEventListener('pointerdown', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  }, {capture: true});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  }, {capture: true});
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => { menu.open = false; });
  });
})();
