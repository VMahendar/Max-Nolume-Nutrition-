import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('launch presentation is editorial, not a blue or copper poster',()=>{
 const css=readFileSync('public/launch-countdown.css','utf8');
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/max-volume-logo-wide\.png/,'original owner-approved artwork remains');
 assert.match(js,/THE<br>PERFORMANCE<br>EDIT/,'new multi-brand editorial headline');
 assert.doesNotMatch(js,/SOMETHING POWERFUL IS COMING/,'childish headline removed');
 assert.match(js,/mvn-launch-visual/,'featured genuine product photography block');
 assert.match(js,/potency-whey-coffee-5lb\.webp/,'real owner supplied whey pack');
 assert.match(js,/Screenshot_2026_1103_003852\.jpg/,'real 5kg bucket pack');
 assert.match(css,/background:#f7f7f5/,'light neutral launch page');
 assert.match(css,/\.mvn-launch-layout\{/,'editorial split layout');
 assert.match(css,/\.mvn-clock-logo\{/);
 assert.match(css,/mix-blend-mode:screen/,'logo dark backing integrates into authentic dark header');
 assert.match(css,/border-top:1px solid #dadbdc/,'timer is small and text-led, not boxed');
 assert.doesNotMatch(css,/#081a38|#13479a|#102f68|#93b7fa|#b9d3ff|#0c2858/,'old blue visual removed');
 assert.match(css,/@media\(max-width:680px\)/,'mobile launch version');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('countdown logic retains approved launch and automatic reveal',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/2026-11-08T17:30:00\.000Z/,'original 11pm IST launch date retained');
 assert.match(js,/window\.setInterval\(tick, 1000\)/,'timer updates every second');
 assert.match(js,/function finish\(\)/);
 assert.match(js,/mvn-clock-open/);
 assert.match(js,/aria-label="Time remaining until store launch"/);
});
