// Installation never caches account, stock, price or checkout responses.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
let installPrompt;
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const action = document.querySelector('[data-install-app]');
if (action) {
  action.hidden = true;
  action.addEventListener('click', async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    action.hidden = true;
  });
}
window.addEventListener('beforeinstallprompt', event => {
  if (!action || installed()) return;
  event.preventDefault();
  installPrompt = event;
  action.hidden = false;
});
window.addEventListener('appinstalled', () => { if (action) action.hidden = true; });

// Existing installations also open the full product-first shopping experience.
if (typeof location !== 'undefined' && installed() && ['/', '/index.html'].includes(location.pathname)) {
  location.replace('/mobile-app.html');
}
