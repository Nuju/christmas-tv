/* Integration checks: run with Playwright installed and BROWSER_EXECUTABLE if needed. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const tracks = ['wish-background', 'deck-the-halls-a', 'it-came-upon-a-midnight-clear'];
const names = ['Wish Background', 'Deck the Halls A', 'It Came Upon a Midnight Clear'];
const errors = [];
const audioRequests = [];
const passed = [];
const pass = text => { passed.push(text); console.log('PASS ' + text); };

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end(); return;
  }
  const size = fs.statSync(file).size;
  const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
  const start = range ? Number(range[1]) : 0;
  const end = range && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end) { response.writeHead(416).end(); return; }
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css', '.mp3': 'audio/mpeg', '.png': 'image/png', '.ttf': 'font/ttf' };
  const headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
    'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes' };
  if (range) { headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + size; }
  response.writeHead(range ? 206 : 200, headers);
  fs.createReadStream(file, { start, end }).pipe(response);
});

async function state(page) {
  return page.evaluate(() => {
    const a = document.getElementById('background-music');
    return { src: a.getAttribute('src'), time: a.currentTime, duration: a.duration,
      paused: a.paused, loop: a.loop, volume: a.volume,
      status: document.getElementById('music-status').textContent,
      display: document.getElementById('display-status').textContent,
      pressed: document.getElementById('music-toggle').getAttribute('aria-pressed'),
      fullscreen: document.getElementById('fullscreen-toggle').getAttribute('aria-pressed'),
      credit: document.getElementById('music-credit-track').textContent,
      label: document.getElementById('music-track').textContent,
      focus: document.activeElement.id,
      idle: /music-idle/.test(document.getElementById('music-panel').className) };
  });
}

async function selected(page, index, paused) {
  const s = await state(page);
  assert.equal(s.src, './assets/tv/' + tracks[index] + '.mp3');
  assert.equal(s.credit, names[index] + ' — Kevin MacLeod');
  assert.ok(s.label.startsWith((index + 1) + ' / 3'));
  assert.equal(s.loop, true);
  assert.equal(s.volume, 1);
  if (paused !== undefined) { assert.equal(s.paused, paused); }
  return s;
}

async function playing(page) {
  await page.waitForFunction(() => {
    const a = document.getElementById('background-music');
    return !a.paused && a.readyState >= 3 && a.currentTime > 0.1 &&
      document.getElementById('music-status').textContent === '';
  }, null, { timeout: 20000 });
  assert.equal((await state(page)).pressed, 'true');
}

async function picture(page, name) {
  if (!process.env.CHRISTMAS_SCREENSHOT_DIR) { return; }
  fs.mkdirSync(process.env.CHRISTMAS_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.CHRISTMAS_SCREENSHOT_DIR, name + '.png') });
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
    const newPage = async init => {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (/\/assets\/tv\//.test(request.url())) audioRequests.push(request.url());
      });
      if (init) { await page.addInitScript(init); }
      return page;
    };
    const page = await newPage(() => {
      localStorage.setItem('christmas-tv-audio-format-v1', 'aac');
    });
    const mediaRequests = [];
    page.on('request', request => { if (/\.(mp3|m4a)(?:\?|$)/.test(request.url())) mediaRequests.push(request.url()); });
    await page.goto(base, { waitUntil: 'networkidle' });
    await selected(page, 0, true);
    assert.equal(mediaRequests.length, 0);
    assert.equal(await page.locator('button:enabled').count(), 4);
    assert.equal(await page.locator('#audio-format-toggle, #audio-help').count(), 0);
    await picture(page, 'tv-desktop');
    await page.keyboard.press('ArrowDown');
    assert.equal((await state(page)).focus, 'fullscreen-toggle');
    await page.keyboard.press('ArrowRight');
    assert.equal((await state(page)).focus, 'fullscreen-toggle');
    await selected(page, 0, true);
    await page.keyboard.press('ArrowUp');
    assert.equal((await state(page)).focus, 'music-toggle');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.up('ArrowRight');
    await selected(page, 1, true);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await selected(page, 2, true);
    await page.locator('#music-credit-track').focus();
    await page.keyboard.press('ArrowRight');
    await selected(page, 2, true);
    await page.locator('#music-next').click();
    await selected(page, 0, true);
    pass('no autoplay/download; remote navigation, held arrows, credits and wraparound');

    await page.locator('#music-toggle').click();
    for (let i = 0; i < tracks.length; i++) {
      await playing(page);
      assert.ok((await selected(page, i, false)).duration > 200);
      pass('native MP3 playback: ' + names[i]);
      if (i < 2) { await page.locator('#music-next').click(); }
    }
    await page.evaluate(() => { const a = document.getElementById('background-music'); a.currentTime = a.duration - 0.25; });
    await page.waitForFunction(() => { const a = document.getElementById('background-music'); return !a.paused && a.currentTime < 1.5; });
    pass('MP3 loops at its actual end');
    await page.locator('#music-toggle').click();
    await selected(page, 2, true);
    await page.reload();
    await selected(page, 0, true);
    assert.equal(await page.locator('#audio-format-toggle, #audio-help').count(), 0);
    pass('old saved AAC preference is ignored on first load and reload; format controls are absent');

    await page.locator('#music-toggle').click();
    await playing(page);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.fullscreenElement);
    assert.equal((await state(page)).fullscreen, 'true');
    await playing(page);
    await page.waitForFunction(() => /music-idle/.test(document.getElementById('music-panel').className), null, { timeout: 11000 });
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.music-controls').evaluate(el => getComputedStyle(el).opacity), '0');
    assert.equal(await page.locator('.music-credit').evaluate(el => getComputedStyle(el).opacity), '1');
    await picture(page, 'tv-fullscreen-idle');
    await page.keyboard.press('Enter');
    assert.equal((await state(page)).fullscreen, 'true');
    assert.equal((await state(page)).focus, 'fullscreen-toggle');
    assert.equal((await state(page)).idle, false);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.fullscreenElement);
    await playing(page);
    await page.keyboard.press('f');
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => document.getElementById('fullscreen-toggle').getAttribute('aria-pressed') === 'false');
    pass('actual fullscreen, safe idle wake, F shortcut and browser-initiated exit preserve audio');
    await page.locator('#music-toggle').click();
    for (const viewport of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#music-toggle').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const bounds = await page.locator('#music-panel').boundingBox();
      assert.ok(bounds.y > 0 && bounds.y + bounds.height < viewport.height);
      await picture(page, 'tv-' + viewport.width);
    }
    await page.close();
    pass('TV and phone layout fit the viewport');

    const unavailable = await newPage();
    const attempted = [];
    await unavailable.route('**/assets/tv/*', route => { attempted.push(route.request().url()); return route.fulfill({ status: 404, body: 'Unavailable test audio' }); });
    await unavailable.goto(base);
    await unavailable.locator('#music-toggle').click();
    await unavailable.waitForFunction(() => document.getElementById('music-status').textContent.indexOf('再生できませんでした') !== -1);
    assert.equal((await state(unavailable)).paused, true);
    assert.equal(new Set(attempted).size, 1);
    assert.ok(attempted.every(url => url.endsWith('/wish-background.mp3')));
    const attemptsBeforeRetry = attempted.length;
    await unavailable.waitForTimeout(300);
    assert.equal(attempted.length, attemptsBeforeRetry);
    await unavailable.unroute('**/assets/tv/*');
    await unavailable.locator('#music-toggle').click();
    await playing(unavailable);
    await unavailable.close();
    pass('unavailable MP3 stops without format fallback or retry loop; explicit retry recovers');

    const denied = await newPage(() => {
      HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('User gesture required', 'NotAllowedError')); };
    });
    await denied.goto(base);
    await denied.locator('#music-toggle').click();
    await denied.waitForFunction(() => document.getElementById('music-status').textContent.indexOf('許可') !== -1);
    await selected(denied, 0, true);
    await denied.close();
    pass('autoplay rejection asks for user activation');

    const race = await newPage(() => {
      const nativePlay = HTMLMediaElement.prototype.play;
      let first = true;
      HTMLMediaElement.prototype.play = function () {
        const result = nativePlay.call(this);
        if (first) {
          first = false;
          if (result && result.catch) result.catch(() => {});
          return new Promise((resolve, reject) => { window.rejectPreviousPlay = reject; });
        }
        return result;
      };
    });
    await race.goto(base);
    await race.locator('#music-toggle').click();
    await race.locator('#music-next').click();
    await playing(race);
    await race.evaluate(() => {
      window.rejectPreviousPlay(new DOMException('Old source', 'NotSupportedError'));
      const a = document.getElementById('background-music');
      ['pause', 'waiting', 'error'].forEach(name => a.dispatchEvent(new Event(name)));
    });
    await selected(race, 1, false);
    assert.equal((await state(race)).status, '');
    await race.close();
    pass('old play rejection and queued events cannot cancel the new track');

    const legacy = await newPage(() => {
      const nativePlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { const result = nativePlay.call(this); if (result && result.catch) result.catch(() => {}); };
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage unavailable'); } });
    });
    await legacy.goto(base);
    await legacy.locator('#music-toggle').click();
    await playing(legacy);
    await legacy.locator('#music-next').click();
    await playing(legacy);
    await selected(legacy, 1, false);
    await legacy.close();
    pass('legacy play() and unavailable storage still allow playback and switching');

    const noAudio = await newPage(() => {
      HTMLMediaElement.prototype.canPlayType = function (type) { return type === 'audio/mpeg' ? '' : 'probably'; };
    });
    await noAudio.goto(base);
    assert.equal(await noAudio.locator('#music-toggle').isDisabled(), true);
    assert.equal((await state(noAudio)).focus, 'fullscreen-toggle');
    await noAudio.keyboard.press('Enter');
    await noAudio.waitForFunction(() => !!document.fullscreenElement);
    await noAudio.waitForFunction(() => /music-idle/.test(document.getElementById('music-panel').className), null, { timeout: 11000 });
    await noAudio.keyboard.press('Enter');
    assert.equal((await state(noAudio)).fullscreen, 'true');
    await noAudio.close();
    pass('fullscreen and idle wake work when MP3 is unsupported, even if AAC is supported');

    const noFullscreen = await newPage(() => {
      for (const name of ['requestFullscreen', 'webkitRequestFullscreen', 'webkitRequestFullScreen', 'mozRequestFullScreen', 'msRequestFullscreen']) {
        Object.defineProperty(Element.prototype, name, { value: undefined, configurable: true });
      }
    });
    await noFullscreen.goto(base);
    await noFullscreen.locator('#fullscreen-toggle').click();
    assert.ok((await state(noFullscreen)).display.includes('対応していません'));
    assert.equal((await state(noFullscreen)).fullscreen, 'false');
    await noFullscreen.locator('#music-toggle').click();
    await playing(noFullscreen);
    await noFullscreen.waitForFunction(() => /music-idle/.test(document.getElementById('music-panel').className), null, { timeout: 11000 });
    await noFullscreen.waitForTimeout(650);
    assert.equal(await noFullscreen.locator('#display-status').evaluate(el => getComputedStyle(el).opacity), '0');
    await noFullscreen.close();
    pass('unsupported fullscreen explains the limit without blocking music or idle display');

    assert.deepEqual(errors, []);
    assert.ok(audioRequests.length > 0);
    assert.ok(audioRequests.every(url => /\.mp3(?:\?|$)/.test(url)));
    pass('every audio request uses MP3; no AAC download');
    console.log(JSON.stringify({ passed: passed.length, pageErrors: errors }, null, 2));
  } finally {
    if (browser) { await browser.close(); }
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
