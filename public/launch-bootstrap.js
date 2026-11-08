// First-paint countdown gate for QR promotion only; storefront and installed MVN app stay fully interactive.
// Avoid inline JavaScript: the existing website enforces Content-Security-Policy script-src 'self'.
if (location.pathname === '/scan.html' && Date.now() < Date.parse('2026-11-08T05:30:00.000Z')) {
  document.documentElement.classList.add('mvn-prelaunch-pending');
}
