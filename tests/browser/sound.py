"""Real Web Audio gesture, mute, and move-event checks: python3 tests/browser/sound.py."""
import asyncio
import shutil
from fullscreen import QuietHandler, ROOT, Thread, ThreadingHTTPServer, partial
from playwright.async_api import async_playwright

async def run(url):
    async with async_playwright() as p:
        options={'args':['--no-sandbox']}
        if shutil.which('chromium'):
            options['executable_path']=shutil.which('chromium')
        browser=await p.chromium.launch(**options)
        page=await browser.new_page(viewport={'width':1280,'height':720})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.route('https://fonts.googleapis.com/**',lambda route:route.abort())
        await page.route('**/ai.js',lambda route:route.fulfill(content_type='application/javascript',body='self.onmessage=({data:d})=>setTimeout(()=>postMessage({id:d.id,i:d.board.findIndex(v=>!v),alternatives:[]}),180);'))
        await page.add_init_script('''window.soundEvents=[];
          const start=AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start=function(...args){soundEvents.push({state:this.context.state,frames:this.buffer.length});return start.apply(this,args);};''')
        async def count(expected):
            await page.wait_for_timeout(220)
            assert await page.evaluate('soundEvents.length')==expected
        async def settled():
            await page.wait_for_function('!document.body.classList.contains("busy")')
        await page.goto(url,wait_until='domcontentloaded');await count(0)
        await page.locator('#board [data-i="20"]').hover();await count(0)
        await page.locator('[data-view="influence"]').click();await count(0)
        await page.locator('#board [data-i="20"]').click();await settled();await count(2)
        assert await page.evaluate('soundEvents.every(e=>e.state==="running"&&e.frames===3087)')
        await page.locator('#board [data-i="20"]').click();await count(2)
        await page.locator('#hint-btn').click();await settled();await count(2)
        await page.locator('#modal-close').click()
        await page.locator('#undo-btn').click();await count(2)
        await page.locator('#pass-btn').click();await settled();await count(3) # AI only; pass is quiet.
        await page.locator('.topbar [data-sound-toggle]').click()
        assert await page.locator('[data-sound-toggle][aria-pressed="false"]').count()==2
        await page.locator('#board [data-i="20"]').click();await settled();await count(3)
        await page.reload();await count(0)
        assert await page.locator('.topbar [data-sound-toggle]').get_attribute('aria-pressed')=='false'
        await page.locator('#global-mode-btn').click()
        await page.locator('.global-sound-toggle').click();await count(0)
        await page.locator('#board [data-i="21"]').click();await settled();await count(2)
        await page.keyboard.press('Escape')
        await page.locator('#new-btn').click();await page.locator('#settings-save').click();await count(2)
        await page.locator('#focus-btn').click()
        for i in [7,11,13,17]:
            await page.locator(f'#lesson-board [data-i="{i}"]').click()
        await count(2)
        await page.locator('#lesson-next').click();await count(2)
        await page.locator('#lesson-board [data-i="17"]').click();await count(3)
        await page.locator('#lesson-next').click();await page.locator('#lesson-board [data-i="12"]').click();await count(3)
        await page.locator('#modal-close').click();await page.reload();await count(0)
        await page.locator('#board [data-i="20"]').focus();await page.keyboard.press('Enter')
        await settled();await count(2)
        assert not errors,errors
        await page.close()
        # No Web Audio support must leave ordinary play intact.
        page=await browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        await page.add_init_script('window.AudioContext=undefined;window.webkitAudioContext=undefined;')
        await page.route('https://fonts.googleapis.com/**',lambda route:route.abort())
        await page.route('**/ai.js',lambda route:route.fulfill(content_type='application/javascript',body='onmessage=({data:d})=>postMessage({id:d.id,i:0});'))
        await page.goto(url,wait_until='domcontentloaded');await page.locator('#board [data-i="20"]').tap()
        await page.wait_for_function('JSON.parse(localStorage.getItem("yimu-game")).moves.length===2')
        await page.close();await browser.close()
    print('PASS: actual Web Audio sources match legal human/AI/lesson moves; preview/undo/pass/invalid/reset are quiet; mute persists; keyboard and unavailable audio work.')

if __name__=='__main__':
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        asyncio.run(run(f'http://127.0.0.1:{server.server_port}/'))
    finally:
        server.shutdown();server.server_close()
