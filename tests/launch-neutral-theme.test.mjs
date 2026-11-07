import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('countdown logic retains approved launch and automatic reveal',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/2026-11-08T17:30:00\.000Z/,'original 11pm IST launch date retained');
 assert.match(js,/window\.setInterval\(tick, 1000\)/,'timer updates every second');
 assert.match(js,/function finish\(\)/);
 assert.match(js,/mvn-clock-open/);
 assert.match(js,/aria-label="Time remaining until store launch"/);
});

test('restored launch screen uses the earlier headline and keeps owner access',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/SOMETHING POWERFUL IS COMING/);
 assert.doesNotMatch(js,/THE<br>PERFORMANCE<br>EDIT/);
 assert.match(js,/ownerPreviewGranted/);
 const html=readFileSync('public/index.html','utf8');
 assert.doesNotMatch(html,/href="(?:copper-home|editorial-store|brand-system)\.css"/);
});
