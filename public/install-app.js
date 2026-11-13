// Mobile app temporarily paused. Keep customers on the main storefront.
for (const action of document.querySelectorAll('[data-install-app], [data-install-help]')) {
 action.hidden = true;
}
document.getElementById('installDialog')?.close();
window.addEventListener('beforeinstallprompt', event => event.preventDefault());
