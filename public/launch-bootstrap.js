// First-paint gate for the installable MVN app, loaded as an allowed same-origin script.
// Avoid inline JavaScript: the existing website enforces Content-Security-Policy script-src 'self'.
if (Date.now() < Date.parse('2026-11-08T17:30:00.000Z')) {
  document.documentElement.classList.add('mvn-prelaunch-pending');
}
