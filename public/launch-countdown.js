// Existing MVN storefront: visually blurred pre-launch preview and automatic reveal.
// The countdown is presentation-only. Server-side account, ordering, and payment gates stay unchanged.
const OPENING_UTC = Date.parse('2026-11-08T17:30:00.000Z'); // 11:00 PM IST, 8 Nov 2026
const LAUNCH_DATE_LABEL = 'SUNDAY · 8 NOVEMBER 2026 · 11:00 PM IST';
const supportedPreview = () => document.body.classList.contains('retail-home') ||
  document.body.classList.contains('app-store') ||
  document.body.classList.contains('mvn-qr-page');
const pending = () => Date.now() < OPENING_UTC;

function installOpeningCountdown() {
  if (!supportedPreview() || document.getElementById('mvn-opening-countdown')) return;
  const banner = document.createElement('section');
  banner.id = 'mvn-opening-countdown';
  banner.className = 'mvn-opening-countdown';
  banner.setAttribute('aria-label', 'Max Volume Nutrition grand opening countdown');
  banner.innerHTML = `
    <div class="mvn-clock-inner">
      <div class="mvn-clock-label">
        <img class="mvn-clock-logo" src="/max-volume-logo-wide.png" alt="Max Volume Nutrition" width="390" height="88">
        <span class="mvn-clock-eyebrow">CHENNAI · RETAIL · WHOLESALE & DISTRIBUTION</span>
        <strong class="mvn-clock-headline" id="mvn-clock-title">SOMETHING POWERFUL IS COMING.</strong>
        <span class="mvn-clock-date">${LAUNCH_DATE_LABEL}</span>
        <p class="mvn-clock-description">Our new online store opens soon. The collection is coming into focus.</p>
      </div>
      <div class="mvn-clock-time" id="mvn-clock-time" role="timer" aria-label="Time remaining until store launch">
        <span><strong data-clock="days">00</strong><small>DAYS</small></span>
        <i aria-hidden="true">:</i>
        <span><strong data-clock="hours">00</strong><small>HOURS</small></span>
        <i aria-hidden="true">:</i>
        <span><strong data-clock="minutes">00</strong><small>MINUTES</small></span>
        <i aria-hidden="true">:</i>
        <span><strong data-clock="seconds">00</strong><small>SECONDS</small></span>
      </div>
      <div class="mvn-clock-footer">
        <span id="mvn-clock-note">THE FULL STORE UNLOCKS AT 11:00 PM IST</span>
        <a id="mvn-clock-link" href="#shop" hidden>EXPLORE THE COLLECTION →</a>
      </div>
    </div>`;

  const anchor = document.querySelector('.announce');
  if (anchor) anchor.after(banner);
  else document.body.prepend(banner);

  const fields = Object.fromEntries(['days', 'hours', 'minutes', 'seconds']
    .map(name => [name, banner.querySelector('[data-clock="' + name + '"]')]));
  const time = banner.querySelector('#mvn-clock-time');
  const title = banner.querySelector('#mvn-clock-title');
  const note = banner.querySelector('#mvn-clock-note');
  const cta = banner.querySelector('#mvn-clock-link');
  const pad = n => String(n).padStart(2, '0');
  const previousInert = new Map();
  let locked = null;
  let observer = null;
  let timer = null;

  function setItemLocked(element) {
    if (element === banner || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;
    if (!previousInert.has(element)) previousInert.set(element, element.inert);
    element.inert = true;
  }

  function lock(shouldLock) {
    if (locked === shouldLock) return;
    locked = shouldLock;
    document.documentElement.classList.toggle('mvn-prelaunch-pending', shouldLock);
    if (shouldLock) {
      for (const child of document.body.children) setItemLocked(child);
      if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(records => {
          for (const record of records) {
            for (const element of record.addedNodes) {
              if (element.nodeType === 1 && element.parentElement === document.body) setItemLocked(element);
            }
          }
        });
        observer.observe(document.body, { childList: true });
      }
    } else {
      observer?.disconnect();
      observer = null;
      for (const [element, value] of previousInert) element.inert = value;
      previousInert.clear();
    }
  }

  function finish() {
    lock(false);
    banner.classList.add('mvn-clock-open');
    title.textContent = 'THE MVN ONLINE STORE IS OPEN.';
    banner.querySelector('.mvn-clock-description').textContent =
      'Explore the collection and request orders directly through WhatsApp.';
    time.hidden = true;
    note.textContent = 'RETAIL · GYM SUPPLY · WHOLESALE';
    cta.hidden = false;
    cta.href = document.body.classList.contains('mvn-qr-page') ? '/' : '#shop';
    cta.textContent = 'SHOP THE COLLECTION →';
    if (timer !== null) window.clearInterval(timer);
  }

  function tick() {
    const remaining = Math.max(0, OPENING_UTC - Date.now());
    if (remaining <= 0) {
      finish();
      return;
    }
    lock(true);
    const seconds = Math.floor(remaining / 1000);
    fields.days.textContent = pad(Math.floor(seconds / 86400));
    fields.hours.textContent = pad(Math.floor((seconds % 86400) / 3600));
    fields.minutes.textContent = pad(Math.floor((seconds % 3600) / 60));
    fields.seconds.textContent = pad(seconds % 60);
  }

  tick();
  if (pending()) timer = window.setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tick();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installOpeningCountdown, { once: true });
} else {
  installOpeningCountdown();
}
