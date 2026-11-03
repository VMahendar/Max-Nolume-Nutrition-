"""UI smoke tests against an already-running LOCAL Wrangler Worker on port 8790.
No real payment calls; disabled checkout uses real D1, quote presentation uses a fixture.
"""
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for width in [1440,390]:
        page=browser.new_page(viewport={'width':width,'height':900})
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.route('https://**/*',lambda route: route.abort())
        page.goto('http://127.0.0.1:8790/')
        page.get_by_text('Retail cart & checkout',exact=True).wait_for()
        assert page.locator('.card').count()==5
        assert 'OUT OF STOCK' in page.locator('#buy-mass').inner_text()
        page.goto('http://127.0.0.1:8790/checkout?sku=MVN-MULTI')
        page.get_by_text('Online checkout is awaiting setup.',exact=False).wait_for()
        assert 'Unicorn Multivitamin' in page.locator('#cart').inner_text()
        page.reload()
        assert page.locator('#cart input').input_value()=='1'
        assert page.locator('#pay').is_hidden()
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        # Fixture enables only total presentation; never mocks successful payment or provider verification.
        page.route('**/api/config',lambda route:route.fulfill(json={'checkout_enabled':True,'payment_mode':'test'}))
        page.route('**/api/quote',lambda route:route.fulfill(json={'total_paise':69900,'shipping_paise':0,'tax_paise':10663,'tax_kind':'CGST_SGST'}))
        page.reload()
        for name,value in {'name':'Test Customer','phone':'9876543210','email':'fixture@example.invalid','line1':'Fixture address','city':'Chennai','pincode':'600001'}.items():page.locator(f'[name="{name}"]').fill(value)
        page.locator('[name="state_code"]').select_option('33')
        page.locator('#quote').click()
        page.locator('#pay').wait_for(state='visible')
        assert '₹699.00' in page.locator('#summary').inner_text()
        page.locator('[name="pincode"]').fill('110001')
        assert page.locator('#pay').is_hidden()
        assert not errors,errors
        print(f'PASS {width}px: real Worker/D1 catalogue, disabled checkout, cart reload, responsive layout; fixture quote and invalidation')
        page.close()
    page=browser.new_page()
    page.goto('http://127.0.0.1:8790/admin')
    assert page.locator('#panel').is_hidden()
    page.locator('#admin-token').fill('x'*64)
    page.locator('#login button[type="submit"], #login button:not([type])').first.click()
    page.get_by_text('Administration not configured.',exact=True).wait_for()
    assert page.locator('#panel').is_hidden()
    print('PASS real Worker admin refuses unconfigured credentials')
    browser.close()
