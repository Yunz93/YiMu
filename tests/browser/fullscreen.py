"""Real browser regression: python3 tests/browser/fullscreen.py.
Requires Playwright for Python and Chromium (system binary or playwright install chromium).
Set YIMU_SCREENSHOTS to save optional layout screenshots.
"""
import asyncio
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
from threading import Thread

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[2]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

async def settle(page):
    await page.evaluate('() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')

async def geometry(page):
    return await page.evaluate('''() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect();
        return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom}; };
      return {board:rect('#board'), surface:rect('.board-surface'), views:rect('.board-view-bar'),
        overflow:document.documentElement.scrollWidth > innerWidth,
        controls:['#global-mode-btn','#preview-toggle','[data-view="normal"]','[data-view="territory"]','#hint-btn','#pass-btn','#finish-btn'].map(rect)};
    }''')

def check_bounds(result, width, height):
    board = result['board']
    assert not result['overflow'], ('horizontal overflow', width, height)
    assert board['x'] >= 0 and board['y'] >= 0
    assert board['right'] <= width + 1 and board['bottom'] <= height + 1
    assert abs(board['width'] - board['height']) < 1
    assert result['views']['y'] >= result['surface']['bottom'] - 1, 'view controls stay below the board'
    for box in result['controls']:
        assert box['width'] > 0 and box['height'] > 0
        assert box['x'] >= 0 and box['y'] >= 0 and box['right'] <= width + 1 and box['bottom'] <= height + 1, box

async def run(url):
    sizes = [(1440,900),(1280,720),(1024,768),(1920,1080),(960,600),(900,700),
             (820,1180),(768,1024),(390,844),(320,568),(1000,450),(844,390)]
    rows = []
    async with async_playwright() as p:
        launch = {'args':['--no-sandbox']}
        if shutil.which('chromium'):
            launch['executable_path'] = shutil.which('chromium')
        browser = await p.chromium.launch(**launch)
        for n in [9,13,19]:
            for width,height in sizes:
                page = await browser.new_page(viewport={'width':width,'height':height})
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                await page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
                game = dict(n=n,board=[0]*(n*n),turn=1,human=1,difficulty=0,komi=7.5,
                            moves=[],passes=0,ended=False,dead=[],scored=False)
                await page.add_init_script('localStorage.setItem("yimu-game",'+json.dumps(json.dumps(game))+')')
                await page.goto(url, wait_until='domcontentloaded')
                normal = await page.locator('#board').bounding_box()
                await page.locator('#global-mode-btn').click()
                await page.mouse.move(width-2,2)
                await settle(page)
                result = await geometry(page)
                check_bounds(result,width,height)
                # Standard 19x19 deliberately scrolls horizontally on narrow screens.
                # Compare sizes only when the ordinary board fits within the viewport.
                if height >= 560 and normal['width'] <= width:
                    assert result['board']['width'] >= normal['width']-1, (n,width,height,normal,result)
                saved = await page.evaluate('localStorage.getItem("yimu-game")')
                for view in ['liberties','influence','territory','normal']:
                    await page.locator('[data-view="'+view+'"]').click()
                await page.locator('#board [data-i="'+str(n*n//2)+'"]').hover()
                await page.wait_for_function('document.querySelector("#move-preview").dataset.previewState === "active"')
                await settle(page)
                assert abs((await geometry(page))['board']['width']-result['board']['width'])<1, 'preview must not resize the board'
                assert await page.evaluate('localStorage.getItem("yimu-game")') == saved
                await page.mouse.move(width-2,2)
                await page.locator('#preview-toggle').uncheck()
                await settle(page)
                assert abs((await geometry(page))['board']['width']-result['board']['width'])<1, 'preview preference must not resize the board'
                await page.locator('#preview-toggle').check()
                if os.environ.get('YIMU_SCREENSHOTS') and n==19 and (width,height) in [(1280,720),(390,844)]:
                    await page.mouse.move(width-2,2)
                    directory=Path(os.environ['YIMU_SCREENSHOTS'])
                    directory.mkdir(parents=True,exist_ok=True)
                    await page.screenshot(path=str(directory/f'YiMu-web-fullscreen-{width}.png'))
                if n==19 and (width,height)==(1280,720):
                    await page.set_viewport_size({'width':390,'height':844})
                    await settle(page)
                    check_bounds(await geometry(page),390,844)
                    await page.set_viewport_size({'width':width,'height':height})
                    await settle(page)
                    await page.locator('#board [data-i="288"]').click()
                    await page.wait_for_function('JSON.parse(localStorage.getItem("yimu-game")).moves.length===2')
                    await page.locator('#finish-btn').click()
                    await page.locator('#start-counting').click()
                    await settle(page)
                    assert abs((await geometry(page))['board']['width']-result['board']['width'])<1
                await page.keyboard.press('Escape')
                assert await page.locator('body.board-global-mode').count()==0
                assert await page.locator('html.board-global-root').count()==0
                assert not errors, errors
                rows.append(dict(n=n,viewport=[width,height],normal=round(normal['width']),fullscreen=round(result['board']['width'])))
                await page.close()
        # Exercise real touch events too: the fullscreen preview replaces the touch tip.
        page = await browser.new_page(viewport={'width':390,'height':844},has_touch=True,is_mobile=True)
        await page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        await page.goto(url,wait_until='domcontentloaded')
        await page.locator('#global-mode-btn').tap()
        await settle(page)
        before = await geometry(page)
        point = await page.locator('#board [data-i="40"]').bounding_box()
        x,y = point['x']+point['width']/2,point['y']+point['height']/2
        client = await page.context.new_cdp_session(page)
        await client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        await page.wait_for_function('document.querySelector("#move-preview").dataset.previewState === "active"')
        assert await page.locator('#move-preview').is_visible()
        assert not await page.locator('#touch-preview-tip').is_visible(), 'only one preview should appear'
        assert abs((await geometry(page))['board']['width']-before['board']['width'])<1
        await client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        assert await page.evaluate('localStorage.getItem("yimu-game")') is None
        await page.locator('#board [data-i="40"]').tap()
        assert await page.evaluate('JSON.parse(localStorage.getItem("yimu-game")).board[40]') == 1
        await page.close()
        await browser.close()
    for row in rows:
        print(json.dumps(row))
    print(f'PASS: {len(rows)} real-browser layouts, view switching, stable previews, resize, play/AI/scoring, exit, and real touch hold/release/tap.')

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        asyncio.run(run(f'http://127.0.0.1:{server.server_port}/'))
    finally:
        server.shutdown()
        server.server_close()
