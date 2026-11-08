// Isolated extension integration test. Speech output and activeTab extraction
// are fixtures; DOM extraction, the loaded manifest, popup and messaging are real.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { extractReadablePage } from '../extract.mjs';

const extension = resolve(import.meta.dirname, '..');
const profile = mkdtempSync(join(tmpdir(), 'voice-reader-smoke-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: 'chromium',
    viewport: { width: 420, height: 900 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'));
  const id = new URL(worker.url()).hostname;
  const source = await context.newPage();
  await source.route('https://mail.google.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<title>Daily newsletter</title><nav>Inbox private</nav><div class="a3s"><p>Today’s brief.</p><p>A useful idea for your business.</p><div class="gmail_quote">Old private email</div></div>',
    }),
  );
  await source.goto('https://mail.google.com/mail/u/0/#inbox/fixture');
  const extracted = await source.evaluate(extractReadablePage);
  assert.match(extracted.text, /Today’s brief/);
  assert.doesNotMatch(extracted.text, /private/);
  console.log(
    'Real Chrome voice API:',
    await worker.evaluate(async () => ({
      count: (await chrome.tts.getVoices()).length,
      promises: typeof chrome.tts.getVoices().then === 'function',
    })),
  );
  await worker.evaluate(() => {
    globalThis.__queue = [];
    chrome.tts.getVoices = async () => [
      { voiceName: 'Fixture local voice', lang: 'en-GB', remote: false },
      { voiceName: 'Cloud voice', lang: 'en-GB', remote: true },
    ];
    chrome.tts.speak = async (text, opts) => {
      globalThis.__queue.push({ text, opts });
    };
    chrome.tts.stop = () => {
      globalThis.__stopped = true;
    };
    chrome.tts.pause = () => {
      globalThis.__paused = true;
    };
    chrome.tts.resume = () => {
      globalThis.__resumed = true;
    };
    chrome.tts.isSpeaking = async () => false;
  });
  const popup = await context.newPage();
  await popup.addInitScript(
    ({ extracted }) => {
      chrome.scripting.executeScript = async () => [{ result: extracted }];
    },
    { extracted },
  );
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.getByRole('radio', { name: /Fixture local voice/ }).waitFor();
  assert.equal(await popup.getByRole('radio', { name: /Cloud voice/ }).count(), 0);
  await popup.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await popup.waitForFunction(async () =>
    Boolean((await chrome.storage.session.get('preview')).preview),
  );
  const queue = await worker.evaluate(() => globalThis.__queue);
  assert.equal(queue.length, 1);
  assert.match(queue[0].text, /Today’s brief/);
  assert.equal(queue[0].opts.voiceName, 'Fixture local voice');
  await popup.screenshot({ path: join(tmpdir(), 'voice-reader-popup.png'), fullPage: true });
  await popup.getByRole('button', { name: 'Pause', exact: true }).click();
  await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'voices' }));
  assert.equal(await worker.evaluate(() => globalThis.__paused), true);
  await popup.getByRole('button', { name: 'Resume', exact: true }).click();
  await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'voices' }));
  assert.equal(await worker.evaluate(() => globalThis.__resumed), true);
  await popup.getByRole('button', { name: 'Stop', exact: true }).click();
  await popup.waitForFunction(async () => !(await chrome.storage.session.get('preview')).preview);
  console.log(
    'Loaded extension: preview, local voice filtering, popup/background speech requests and stop passed (fixture speech).',
  );
} finally {
  await context?.close();
  rmSync(profile, { recursive: true, force: true });
}
