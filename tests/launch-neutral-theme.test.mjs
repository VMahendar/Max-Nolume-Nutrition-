import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('countdown logic retains approved launch and automatic reveal',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/2026-11-08T05:30:00\.000Z/,'revised 11am IST launch date retained');
 assert.match(js,/window\.setInterval\(tick, 1000\)/,'timer updates every second');
 assert.match(js,/function finish\(\)/);
 assert.match(js,/mvn-clock-open/);
 assert.match(js,/aria-label="Time remaining until store launch"/);
});

test('restored launch screen uses the earlier headline and keeps owner access',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/STORE OPERATIONS OPEN AT/);
 assert.doesNotMatch(js,/THE<br>PERFORMANCE<br>EDIT/);
 assert.match(js,/ownerPreviewGranted/);
 const html=readFileSync('public/index.html','utf8');
 assert.doesNotMatch(html,/href="(?:copper-home|editorial-store|brand-system)\.css"/);
});


test('approved prelaunch identity uses original logo and correctly labeled brand availability',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 const css=readFileSync('public/launch-countdown.css','utf8');
 assert.match(js,/src="\/max-volume-logo-wide\.png"/,'original gold logo must be used');
 assert.match(js,/UNICORN PRO SERIES/,'existing stocked brand must be visible');
 assert.match(js,/AVAILABLE NOW/);
 assert.match(js,/GLOB TECH/,'upcoming brand must be visible');
 assert.match(js,/COMING SOON/);
 assert.match(js,/Serving Tamil Nadu &amp; Puducherry/);
 assert.match(css,/html\.mvn-prelaunch-pending #mvn-opening-countdown\s*\{[^}]*background:radial-gradient/s,'solid background hides prelaunch product grids');
 assert.match(css,/mix-blend-mode:screen/,'original logo needs the dark-background visual blend');
 assert.match(css,/\.mvn-clock-open \.mvn-clock-brands\{display:none!important\}/,'expanded brand cards must not clutter launched store');
 assert.doesNotMatch(css,/\[class\*="product"\]/,'countdown must not destroy the underlying store product display');
});
