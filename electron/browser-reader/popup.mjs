import { extractReadablePage } from './extract.mjs';
import { MAX_READER_TEXT } from './speech.mjs';

const t = (key) => chrome.i18n.getMessage(key);
document.documentElement.lang = chrome.i18n.getUILanguage();
document.documentElement.dir = chrome.i18n.getUILanguage().startsWith('ar') ? 'rtl' : 'ltr';
document.querySelectorAll('[data-msg]').forEach((node) => {
  node.textContent = t(node.dataset.msg);
});
document.querySelectorAll('[data-msg-placeholder]').forEach((node) => {
  node.placeholder = t(node.dataset.msgPlaceholder);
});
const preview = document.querySelector('#preview');
const status = document.querySelector('#status');
const rate = document.querySelector('#rate');
const readButton = document.querySelector('#read');
const key = (voice) => JSON.stringify([voice.voiceName, voice.lang, voice.extensionId || '']);
const send = async (message) => {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || 'readerFailed');
  return result;
};
const failure = (error) => {
  status.textContent = t(error.message) || t('readerFailed');
};
let voices = [];
let selectedVoice = '';
const updateRead = () => {
  readButton.disabled =
    !selectedVoice || !preview.value.trim() || preview.value.length > MAX_READER_TEXT;
};
const showVoices = () => {
  const list = document.querySelector('#voices');
  list.replaceChildren();
  const search = document.querySelector('#voice-search').value.toLocaleLowerCase();
  for (const voice of voices.filter((item) =>
    `${item.voiceName} ${item.lang}`.toLocaleLowerCase().includes(search),
  )) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'voice';
    input.value = key(voice);
    input.checked = input.value === selectedVoice;
    input.addEventListener('change', () => {
      selectedVoice = input.value;
      updateRead();
    });
    label.append(input, document.createTextNode(`${voice.voiceName} (${voice.lang || ''})`));
    list.append(label);
  }
  updateRead();
};
document.querySelector('#voice-search').setAttribute('aria-label', t('search'));
document.querySelector('#voice-search').addEventListener('input', showVoices);
preview.addEventListener('input', updateRead);
rate.addEventListener('input', () => {
  document.querySelector('#rate-value').textContent = `${rate.value}×`;
});
readButton.addEventListener('click', async () => {
  readButton.disabled = true;
  status.textContent = '';
  try {
    await send({
      type: 'read',
      text: preview.value,
      voice: selectedVoice,
      rate: Number(rate.value),
    });
  } catch (error) {
    failure(error);
  } finally {
    updateRead();
  }
});
for (const type of ['pause', 'resume', 'stop'])
  document.querySelector(`#${type}`).addEventListener('click', () => {
    void send({ type }).catch(failure);
  });

try {
  const { voices: available } = await send({ type: 'voices' });
  voices = available;
  const stored = await chrome.storage.local.get(['voice', 'rate']);
  selectedVoice = voices.find((voice) => key(voice) === stored.voice)
    ? stored.voice
    : key(
        voices.find((voice) => voice.lang?.startsWith(chrome.i18n.getUILanguage().split('-')[0])) ||
          voices[0] ||
          {},
      );
  if (!voices.length) {
    selectedVoice = '';
    status.textContent = t('noLocalVoice');
  }
  if (stored.rate >= 0.5 && stored.rate <= 2) rate.value = String(stored.rate);
  document.querySelector('#rate-value').textContent = `${rate.value}×`;
  showVoices();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractReadablePage,
  });
  document.querySelector('#source').textContent = `${result.site} · ${result.title}`;
  if (!result.text || result.text.length > MAX_READER_TEXT) {
    if (voices.length) status.textContent = t('readerEmpty');
  } else preview.value = result.text;
  updateRead();
} catch (error) {
  failure(error);
}
