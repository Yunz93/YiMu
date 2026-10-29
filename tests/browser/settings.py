"""Check full option labels and settings actions: python3 tests/browser/settings.py.
Requires Playwright and Chromium, as described in fullscreen.py.
"""
import asyncio
import os
from pathlib import Path
import shutil
from fullscreen import QuietHandler, ROOT, Thread, ThreadingHTTPServer, partial
from playwright.async_api import async_playwright

async def check_labels(page):
    result = await page.locator('.setting-row').evaluate_all('''rows => rows.map(row => {
      const select=row.querySelector('select'),label=row.querySelector('label'),style=getComputedStyle(select),
        rect=select.getBoundingClientRect(),parent=row.getBoundingClientRect(),labelRect=label.getBoundingClientRect(),
        context=document.createElement('canvas').getContext('2d');
      context.font=style.font;
      return {id:select.id,text:context.measureText(select.selectedOptions[0].text).width,
        available:select.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-20,
        fits:rect.left>=parent.left-1&&rect.right<=parent.right+1&&labelRect.left>=parent.left-1&&labelRect.right<=parent.right+1,
        labelFits:label.scrollWidth<=label.clientWidth+1};
    })''')
    for item in result:
        assert item['fits'] and item['labelFits'], item
        assert item['text']+4 <= item['available'], item
    assert await page.locator('#modal').evaluate('(d) => d.scrollWidth <= d.clientWidth+1')

async def run(url):
    count=0
    async with async_playwright() as p:
        options={'args':['--no-sandbox']}
        if shutil.which('chromium'):
            options['executable_path']=shutil.which('chromium')
        browser=await p.chromium.launch(**options)
        for width,height in [(1440,900),(768,1024),(560,720),(390,844),(320,568),(320,420)]:
            page=await browser.new_page(viewport={'width':width,'height':height})
            await page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
            await page.goto(url,wait_until='domcontentloaded')
            await page.locator('#new-btn').click()
            assert await page.locator('#modal').is_visible()
            for field in ['set-size','set-color','set-ai']:
                values=await page.locator('#'+field+' option').evaluate_all('(options) => options.map(o=>o.value)')
                for value in values:
                    await page.locator('#'+field).select_option(value)
                    await check_labels(page)
                    count+=1
            await page.locator('#set-size').select_option('19')
            await page.locator('#set-color').select_option('1')
            await page.locator('#set-ai').select_option('0')
            if width==390 and os.environ.get('YIMU_SCREENSHOTS'):
                directory=Path(os.environ['YIMU_SCREENSHOTS']);directory.mkdir(parents=True,exist_ok=True)
                await page.screenshot(path=str(directory/'YiMu-settings-fixed.png'))
            await page.locator('#settings-save').click()
            game=await page.evaluate('JSON.parse(localStorage.getItem("yimu-game"))')
            assert game['n']==19 and game['human']==1 and game['difficulty']==0
            assert not await page.locator('#modal').is_visible()
            await page.locator('#board-settings').click()
            await check_labels(page)
            await page.locator('#settings-cancel').click()
            assert await page.evaluate('JSON.parse(localStorage.getItem("yimu-game")).n')==19
            await page.close()
        # Resize an already-open dialog, including a browser-zoom-sized viewport.
        page=await browser.new_page(viewport={'width':1280,'height':720})
        await page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        await page.goto(url,wait_until='domcontentloaded');await page.locator('#new-btn').click()
        await page.locator('#set-size').select_option('19')
        for width,height in [(390,844),(256,512),(1280,720)]:
            await page.set_viewport_size({'width':width,'height':height})
            await check_labels(page)
        await page.close()
        await browser.close()
    print(f'PASS: {count} option labels at 6 viewport sizes; new game/save/cancel, short-screen scrolling, and dialog resizing.')

if __name__=='__main__':
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        asyncio.run(run(f'http://127.0.0.1:{server.server_port}/'))
    finally:
        server.shutdown();server.server_close()
