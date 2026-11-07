// Countdown for Max Volume Nutrition's planned public store opening.
// Presentation only: it never changes payment, shipping, authentication or database state.
const OPENING_UTC = Date.parse('2026-11-08T17:30:00.000Z'); // 11:00 PM Asia/Kolkata
const targetText = '8 NOVEMBER 2026 · 11:00 PM IST';

function installOpeningCountdown() {
  if (!document.body.classList.contains('retail-home') && !document.body.classList.contains('app-store')) return;
  if (document.getElementById('mvn-opening-countdown')) return;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/launch-countdown.css';
  document.head.append(style);

  const banner = document.createElement('section');
  banner.id = 'mvn-opening-countdown';
  banner.className = 'mvn-opening-countdown';
  banner.setAttribute('aria-label', 'Max Volume Nutrition grand opening countdown');
  banner.innerHTML = `
    <div class="mvn-clock-inner">
      <div class="mvn-clock-label">
        <span class="mvn-clock-eyebrow">MAX VOLUME NUTRITION · CHENNAI</span>
        <strong class="mvn-clock-headline" id="mvn-clock-title">THE ONLINE STORE LAUNCH</strong>
        <span class="mvn-clock-date">${targetText}</span>
      </div>
      <div class="mvn-clock-time" id="mvn-clock-time" role="timer" aria-label="Time remaining until launch">
        <span><strong data-clock="days">00</strong><small>DAYS</small></span>
        <i aria-hidden="true">:</i>
        <span><strong data-clock="hours">00</strong><small>HOURS</small></span>
        <i aria-hidden="true">:</i>
        <span><strong data-clock="minutes">00</strong><small>MIN</small></span>
        <i aria-hidden="true">:</i>
        <span><strong data-clock="seconds">00</strong><small>SEC</small></span>
      </div>
      <div class="mvn-clock-footer">
        <span id="mvn-clock-note">BE FIRST IN LINE · RETAIL & WHOLESALE</span>
        <a id="mvn-clock-link" href="#shop">EXPLORE THE COLLECTION →</a>
      </div>
    </div>`;
  const anchor = document.querySelector('.announce');
  if (anchor) anchor.after(banner);
  else document.body.prepend(banner);
  const fields = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map(name => [name, banner.querySelector('[data-clock="' + name + '"]')]));
  const time = banner.querySelector('#mvn-clock-time');
  const title = banner.querySelector('#mvn-clock-title');
  const note = banner.querySelector('#mvn-clock-note');
  const pad = n => String(n).padStart(2, '0');
  let finished = false;
  function tick() {
    const delta = Math.max(0, OPENING_UTC - Date.now());
    if (delta === 0) {
      if (!finished) {
        finished = true;
        banner.classList.add('mvn-clock-open');
        title.textContent = 'LAUNCH TIME HAS ARRIVED';
        time.hidden = true;
        note.textContent = 'SHOPPING REQUESTS VIA WHATSAPP · OUR TEAM CONFIRMS ALL ORDERS';
      }
      return;
    }
    const seconds = Math.floor(delta / 1000);
    fields.days.textContent = pad(Math.floor(seconds / 86400));
    fields.hours.textContent = pad(Math.floor((seconds % 86400) / 3600));
    fields.minutes.textContent = pad(Math.floor((seconds % 3600) / 60));
    fields.seconds.textContent = pad(seconds % 60);
  }
  tick();
  const interval = window.setInterval(() => {
    tick();
    if (finished) window.clearInterval(interval);
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installOpeningCountdown, { once: true });
else installOpeningCountdown();
