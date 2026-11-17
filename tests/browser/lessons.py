"""Check all lesson boards and their controls: python3 tests/browser/lessons.py."""
import asyncio
import os
from pathlib import Path
import shutil
from fullscreen import QuietHandler, ROOT, Thread, ThreadingHTTPServer, partial, settle
from playwright.async_api import async_playwright


async def check_layout(page):
    result = await page.evaluate('''() => {
      const modal=document.querySelector('#modal'),svg=document.querySelector('#lesson-board'),
        area=document.querySelector('.lesson-board-scroll');
      const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
      return {active:modal.classList.contains('lesson-modal'),modal:rect(modal),board:rect(svg),area:rect(area),
        scroll:[modal.scrollWidth-modal.clientWidth,modal.scrollHeight-modal.clientHeight],
        controls:['#lesson-feedback','#lesson-all','#lesson-reset','#lesson-next'].map(s=>rect(document.querySelector(s))),
        outside:[...svg.children].filter(e=>e.tagName!=='defs').map(e=>{
          const b=e.getBBox();return {tag:e.tagName,x:b.x,y:b.y,right:b.x+b.width,bottom:b.y+b.height};
        }).filter(b=>b.x<-.01||b.y<-.01||b.right>560.01||b.bottom>560.01)};
    }''')
    assert result['active'], 'lesson layout must activate on first open'
    assert max(result['scroll']) <= 1, result
    assert not result['outside'], result['outside']
    b, a, m = result['board'], result['area'], result['modal']
    assert b['width'] > 50 and abs(b['width']-b['height']) < 1, b
    assert b['x'] >= a['x'] and b['y'] >= a['y'] and b['right'] <= a['right']+1 and b['bottom'] <= a['bottom']+1, result
    for c in result['controls']:
        assert c['x'] >= m['x'] and c['y'] >= m['y'] and c['right'] <= m['right']+1 and c['bottom'] <= m['bottom']+1, result
    # Keep click targets centered on the stones after the small-board inset changes.
    assert await page.locator('#lesson-board').evaluate('''svg => [...svg.querySelectorAll('.stone')].every(s=>{
      const x=+s.getAttribute('cx'),y=+s.getAttribute('cy');
      return [...svg.querySelectorAll('.intersection')].some(h=>{
        const b=h.getBBox();return Math.abs(b.x+b.width/2-x)<.01&&Math.abs(b.y+b.height/2-y)<.01;
      });
    })''')


async def complete(page, lesson):
    async def pick(i):
        await page.locator(f'#lesson-board [data-i="{i}"]').click()
    mode = lesson['mode']
    if mode in ['libs','eyes','coordinates','compare']:
        for i in lesson['targets']:
            await pick(i)
    elif mode == 'ko':
        await pick(lesson['target']); await pick(lesson['recapture'])
    elif mode == 'dead':
        for _ in range(3):
            await pick(lesson['target'])
    elif mode in ['choice','score']:
        await page.locator(f'[data-answer="{lesson.get("answer",1)}"]').click()
    elif mode == 'passes':
        await page.locator('#lesson-pass').click(); await page.locator('#lesson-pass').click()
    else:
        await pick(lesson['target'])
    assert await page.locator('#lesson-feedback').inner_text() != '在小棋盘上操作，试试看。'
    assert await page.locator('#lesson-next').is_enabled()


async def run(url):
    count = 0
    async with async_playwright() as p:
        options = {'args':['--no-sandbox']}
        if shutil.which('chromium'):
            options['executable_path'] = shutil.which('chromium')
        browser = await p.chromium.launch(**options)
        for width,height in [(1440,900),(1280,720),(768,1024),(390,844),(320,568),(844,390),(640,480),(256,512)]:
            page = await browser.new_page(viewport={'width':width,'height':height},has_touch=width<500)
            errors = []
            page.on('pageerror',lambda e: errors.append(str(e)))
            await page.route('https://fonts.googleapis.com/**',lambda r:r.abort())
            await page.goto(url,wait_until='domcontentloaded')
            lessons = await page.evaluate('async () => (await import("./lessons.js")).lessons')
            await page.locator('#all-lessons').click()
            for i,lesson in enumerate(lessons):
                await page.locator(f'[data-open-lesson="{i}"]').click()
                await settle(page)
                await check_layout(page)
                await complete(page,lesson)
                await settle(page)
                await check_layout(page)
                await page.locator('#lesson-reset').click()
                await settle(page)
                await check_layout(page)
                if i == 14:
                    await page.locator('#lesson-zoom').click()
                    assert await page.locator('#lesson-zoom').get_attribute('aria-pressed') == 'true'
                    await page.locator('#lesson-zoom').click()
                    await settle(page)
                    await check_layout(page)
                if i == 7 and os.environ.get('YIMU_SCREENSHOTS') and width in [1280,390]:
                    directory = Path(os.environ['YIMU_SCREENSHOTS']); directory.mkdir(parents=True,exist_ok=True)
                    await complete(page,lesson)
                    await page.mouse.move(0,0)
                    await page.screenshot(path=str(directory/f'YiMu-lesson-fixed-{width}.png'))
                await page.locator('#lesson-all').click()
                count += 1
            # An open standard-board lesson must also fit after orientation changes.
            await page.locator('[data-open-lesson="14"]').click()
            for size in [(390,844),(844,390),(1280,720)]:
                await page.set_viewport_size({'width':size[0],'height':size[1]})
                await settle(page)
                await check_layout(page)
            await page.keyboard.press('Escape')
            assert not await page.locator('#modal').is_visible()
            await page.locator('#settings-btn').click()
            assert await page.locator('#modal').get_attribute('class') == ''
            assert not errors, errors
            await page.close()
        await browser.close()
    print(f'PASS: {count} lesson layouts, completion/reset, SVG bounds, hit alignment, zoom, resize, and dialog cleanup.')


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT/'dist')))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        asyncio.run(run(f'http://127.0.0.1:{server.server_port}/'))
    finally:
        server.shutdown(); server.server_close()
