"""Run with Python Playwright and system Chromium. No provider requests are made."""
import http.server, threading
from playwright.sync_api import sync_playwright
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), http.server.SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for width in [1440, 390]:
        page = browser.new_page(viewport={'width': width, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://**/*', lambda route: route.abort())
        page.goto(f'http://127.0.0.1:{server.server_port}/index.html')
        assert page.locator('.card').count() == 5
        page.locator('#v-mass').select_option('5 kg')
        assert page.locator('#price-mass').inner_text() == '₹3,499'
        page.locator('.add[data-id="mass"]').click()
        assert page.locator('#count').inner_text() == '1'
        page.locator('#drawer.open .row').wait_for(state='visible')
        assert '5 kg' in page.locator('#items').inner_text(), page.locator('#items').inner_html()
        page.keyboard.press('Escape')
        assert page.locator('#shade').is_hidden()
        page.reload()
        assert page.locator('#count').inner_text() == '1'
        page.locator('#q').fill('coffee')
        assert page.locator('.card').count() == 1
        page.locator('#q').fill('not-a-product')
        assert page.locator('.card').count() == 0
        page.locator('#q').fill('')
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow'
        assert not errors, errors
        print(f'PASS {width}px: catalogue, variants, quote, reload, search, Escape, no overflow or JS errors')
        page.close()
    browser.close()
server.shutdown()
