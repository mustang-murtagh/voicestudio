import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { extractReadablePage } from '../extract.mjs';
import { speechChunks, startSpeech, MAX_READER_TEXT } from '../speech.mjs';
import { readFileSync } from 'node:fs';

function extract(html, url = 'https://example.com/article', select) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  try {
    if (select) {
      const range = dom.window.document.createRange();
      range.selectNodeContents(dom.window.document.querySelector(select));
      dom.window.getSelection().addRange(range);
    }
    return runInContext(`(${extractReadablePage.toString()})()`, dom.getInternalVMContext());
  } finally {
    dom.window.close();
  }
}

test('reads the latest expanded Gmail message without quoted replies or inbox chrome', () => {
  const result = extract(
    `<nav>Inbox secret</nav><div class="a3s" hidden>Collapsed message</div>
    <div class="a3s"><p>Old expanded email</p></div>
    <div class="a3s"><p>Newsletter introduction.</p><p>Today’s useful idea.</p>
      <div class="gmail_quote">Private quoted conversation</div><div class="gmail_signature">Old signature</div>
      <div style="display:none">Tracking copy</div></div>`,
    'https://mail.google.com/mail/u/0/#inbox/abc',
  );
  assert.match(result.text, /Newsletter introduction\.\n+Today’s useful idea\./);
  assert.doesNotMatch(result.text, /Inbox|Old expanded|quoted|Tracking|signature/);
});

test('does not turn the Gmail inbox into a spoken inbox scrape', () => {
  assert.equal(
    extract('<main>Inbox: sensitive subjects</main>', 'https://mail.google.com/mail/u/0/#inbox')
      .text,
    '',
  );
});

test('reads the latest Claude reply and excludes user prompts/sidebar history', () => {
  const result = extract(
    `<aside>Old chats</aside><p data-testid="user-message">My private prompt</p>
    <div data-is-streaming="false">Yesterday’s reply</div>
    <div data-is-streaming="false"><p>Daily brief.</p><p>Your next action.</p><button>Copy</button></div>`,
    'https://claude.ai/chat/example',
  );
  assert.match(result.text, /Daily brief\.\n+Your next action\./);
  assert.doesNotMatch(result.text, /Yesterday|private|Old chats|Copy/);
});

test('requires selection when Claude is still streaming or its reply layout is unknown', () => {
  assert.equal(
    extract('<div data-is-streaming="true">Partial brief</div>', 'https://claude.ai').text,
    '',
  );
  assert.equal(extract('<main>Prompt and unknown markup</main>', 'https://claude.ai').text, '');
});

test('selected text takes priority without clipboard access', () => {
  const result = extract(
    '<article>Whole article <p id="pick">Just this paragraph.</p></article>',
    'https://example.com',
    '#pick',
  );
  assert.equal(result.text, 'Just this paragraph.');
});

test('preserves paragraph spacing while removing page navigation and hidden text', () => {
  const result = extract(
    '<nav>Menu</nav><article><h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p><script>secret()</script><p aria-hidden="true">Hidden</p></article><footer>Footer</footer>',
  );
  assert.match(result.text, /First paragraph\.\n+Second paragraph\./);
  assert.doesNotMatch(result.text, /Menu|secret|Hidden|Footer/);
});

test('long newsletter chunks remain bounded and preserve content and Unicode', () => {
  const text = 'Useful idea. Another thought. 🧠 '.repeat(500).trim();
  const chunks = speechChunks(text, 80);
  assert(chunks.length > 1);
  assert(chunks.every((chunk) => chunk.length <= 80));
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text.replace(/\s+/g, ' '));
  assert(chunks.every((chunk) => !/[\uD800-\uDBFF]$/u.test(chunk)));
  assert.throws(() => speechChunks('a'.repeat(MAX_READER_TEXT + 1)), /readerEmpty/);
  assert.throws(() => speechChunks('test', 1), /readerFailed/);
});

test('queues the complete newsletter before the popup closes', async () => {
  const calls = [];
  const tts = {
    stop: () => calls.push('stop'),
    speak: async (text, options) => calls.push({ text, options }),
  };
  await startSpeech(
    tts,
    'Newsletter paragraph. '.repeat(400),
    { voiceName: 'Local voice', lang: 'en-GB', remote: false },
    1.2,
  );
  assert.equal(calls[0], 'stop');
  assert(calls.length > 2);
  assert(
    calls
      .slice(1)
      .every(
        (call) =>
          call.options.enqueue &&
          call.options.rate === 1.2 &&
          call.options.voiceName === 'Local voice',
      ),
  );
});

test('rejects cloud/unknown voices and stops the queue after an enqueue failure', async () => {
  let stopped = 0;
  const tts = {
    stop: () => stopped++,
    speak: async () => {
      throw new Error('Cannot speak');
    },
  };
  await assert.rejects(
    startSpeech(tts, 'Hi', { voiceName: 'Cloud', remote: true }),
    /noLocalVoice/,
  );
  await assert.rejects(startSpeech(tts, 'Hi', { voiceName: 'Unknown' }), /noLocalVoice/);
  assert.equal(stopped, 0);
  await assert.rejects(
    startSpeech(tts, 'Hi', { voiceName: 'Local', remote: false }),
    /Cannot speak/,
  );
  assert.equal(stopped, 2);
});

test('stop or replacement during queueing prevents late newsletter chunks', async () => {
  const calls = [];
  let current = true;
  const tts = {
    stop: () => {},
    speak: async (text) => {
      calls.push(text);
      current = false;
    },
  };
  const result = await startSpeech(
    tts,
    'Sentence. '.repeat(2000),
    { voiceName: 'Local', remote: false },
    1,
    () => current,
  );
  assert.equal(calls.length, 1);
  assert.equal(result, false);
});

test('the extension requires a user gesture rather than blanket site or mail permissions', () => {
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
  assert.deepEqual(manifest.permissions.sort(), [
    'activeTab',
    'contextMenus',
    'scripting',
    'storage',
    'tts',
  ]);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.externally_connectable, undefined);
});
