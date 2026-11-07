import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('launch page uses original logo in neutral graphite, without the old blue card',()=>{
 const css=readFileSync('public/launch-countdown.css','utf8');
 const js=readFileSync('public/launch-countdown.js','utf8');
 assert.match(js,/max-volume-logo-wide\.png/,'original owner-approved artwork remains');
 assert.match(css,/\.mvn-clock-logo\s*\{/);
 assert.match(css,/mix-blend-mode:screen/,'dark logo square should merge against graphite');
 assert.match(css,/width:min\(100%,470px\)/,'logo must be larger than prior tiny asset');
 assert.match(css,/background:linear-gradient\(153deg,#222426/,'neutral graphite launch card');
 assert.match(css,/border:1px solid rgba\(176,175,172/,'neutral grey launch border');
 for(const blue of ['#081a38','#13479a','#102f68','#93b7fa','#b9d3ff','#93b7fa','#0c2858','#081833']){
  assert.ok(!css.includes(blue),'old blue visual '+blue+' must be removed');
 }
 assert.match(css,/@media\(max-width:650px\)/,'mobile countdown presentation');
 assert.match(css,/@media\(max-height:690px\)/,'short-device scrolling');
});
test('countdown still unlocks at the original approved time and checkout remains gated',()=>{
 const js=readFileSync('public/launch-countdown.js','utf8');
 const css=readFileSync('public/launch-countdown.css','utf8');
 assert.match(js,/2026-11-08T17:30:00\.000Z/,'11PM IST launch unchanged');
 assert.match(js,/window\.setInterval\(tick, 1000\)/,'timer still updates every second');
 assert.match(js,/function finish\(\)/);
 assert.match(css,/html\.mvn-prelaunch-pending/);
 assert.match(css,/\.mvn-clock-open/);
});
