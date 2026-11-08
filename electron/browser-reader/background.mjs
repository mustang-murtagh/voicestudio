import { startSpeech } from './speech.mjs';

const localVoices = async () =>
  (await chrome.tts.getVoices()).filter((voice) => voice.remote === false);
const voiceKey = (voice) => JSON.stringify([voice.voiceName, voice.lang, voice.extensionId || '']);
let playbackRequest = 0;

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: 'read-selection',
    title: chrome.i18n.getMessage('readSelection'),
    contexts: ['selection'],
  });
});

async function read(text, requestedVoice, rate) {
  const request = ++playbackRequest;
  const voices = await localVoices();
  const stored = await chrome.storage.local.get(['voice', 'rate']);
  const voice =
    voices.find((item) => voiceKey(item) === (requestedVoice || stored.voice)) ||
    voices.find((item) =>
      item.lang?.toLowerCase().startsWith(chrome.i18n.getUILanguage().split('-')[0]),
    ) ||
    voices[0];
  return startSpeech(
    chrome.tts,
    text,
    voice,
    rate ?? stored.rate ?? 1,
    () => request === playbackRequest,
  );
}

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== 'read-selection' || !info.selectionText) return;
  // Session storage is memory-only; no email text is written to disk or sync.
  void chrome.storage.session
    .set({ preview: info.selectionText })
    .then(() => read(info.selectionText))
    .then(() => chrome.action.setBadgeText({ text: '' }))
    .catch(async () => {
      await chrome.action.setBadgeText({ text: '!' });
    });
});

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  // Only the bundled popup may control speech. Web pages/content scripts cannot.
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return;
  const run = async () => {
    if (message.type === 'voices')
      return { voices: await localVoices(), speaking: await chrome.tts.isSpeaking() };
    if (message.type === 'read') {
      if (!(await read(message.text, message.voice, message.rate))) return {};
      await chrome.storage.local.set({ voice: message.voice, rate: message.rate });
      await chrome.storage.session.set({ preview: message.text });
      await chrome.action.setBadgeText({ text: '' });
    } else if (message.type === 'pause') chrome.tts.pause();
    else if (message.type === 'resume') chrome.tts.resume();
    else if (message.type === 'stop') {
      playbackRequest++;
      chrome.tts.stop();
      await chrome.storage.session.remove('preview');
    } else throw new Error('readerFailed');
    return {};
  };
  run()
    .then((result) => respond({ ok: true, ...result }))
    .catch((error) =>
      respond({
        ok: false,
        error: ['readerEmpty', 'noLocalVoice'].includes(error.message)
          ? error.message
          : 'readerFailed',
      }),
    );
  return true;
});
