import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('owner homepage preview requires the protected owner endpoint',()=>{
 const code=readFileSync('public/launch-countdown.js','utf8');
 assert.match(code,/URLSearchParams\(location\.search\)\.get\('owner_preview'\) === '1'/);
 assert.match(code,/fetch\('\/api\/admin\/overview', \{ credentials: 'same-origin', cache: 'no-store' \}\)/);
 assert.match(code,/if \(!response\.ok\) return;/,'no bypass for unverified visitors');
 assert.match(code,/ownerPreviewGranted = true;/);
 assert.match(code,/if \(ownerPreviewGranted\) return;/,'timer cannot relock a granted owner preview');
 assert.match(code,/banner\.remove\(\)/,'owner sees actual underlying homepage');
 assert.doesNotMatch(code,/localStorage|sessionStorage/,'query or device storage cannot replace authorization');
 assert.match(code,/2026-11-08T17:30:00\.000Z/,'public timer deadline unchanged');
});
