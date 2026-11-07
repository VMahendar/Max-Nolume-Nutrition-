// Commerce workflows are exercised independently of the presentation-only launch countdown.
// launch-gate-qa.mjs exercises the real gate before and after its opening boundary.
export async function unlockStorefront(context){
 await context.route('**/launch-bootstrap.js',route=>route.fulfill({contentType:'text/javascript',body:'/* Test commerce without the first-paint launch gate. */'}));
 await context.route('**/launch-countdown.js',route=>route.fulfill({contentType:'text/javascript',body:"document.documentElement.classList.remove('mvn-prelaunch-pending');"}));
}
export function commerceBrowser(browser){
 const newContext=browser.newContext.bind(browser),newPage=browser.newPage.bind(browser);
 browser.newContext=async options=>{const context=await newContext(options);await unlockStorefront(context);return context;};
 browser.newPage=async options=>{const page=await newPage(options);await unlockStorefront(page.context());return page;};
 return browser;
}
