export const MAX_READER_TEXT = 100_000;

/** Queue all chunks in Chrome, so a closed popup cannot interrupt the next one. */
export function speechChunks(text, limit = 3000) {
  if (!Number.isInteger(limit) || limit < 32) throw new Error('readerFailed');
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_READER_TEXT)
    throw new Error('readerEmpty');
  const chunks = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const head = rest.slice(0, limit);
    const boundaries = [...head.matchAll(/[.!?。！？]\s+|\n+/gu)];
    let end = boundaries.at(-1)?.index;
    if (end == null || end < limit / 3) end = head.lastIndexOf(' ');
    if (end < limit / 3) end = limit;
    else if (/[.!?。！？]/u.test(rest[end])) end += 1;
    // Do not split an emoji / supplementary Unicode code point in half.
    if (/[\uD800-\uDBFF]/u.test(rest[end - 1])) end -= 1;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export async function startSpeech(tts, text, voice, rate = 1, isCurrent = () => true) {
  if (!voice || voice.remote !== false) throw new Error('noLocalVoice');
  if (!Number.isFinite(rate) || rate < 0.5 || rate > 2) throw new Error('readerFailed');
  const chunks = speechChunks(text);
  if (!isCurrent()) return false;
  tts.stop();
  const options = { voiceName: voice.voiceName, lang: voice.lang, rate, enqueue: true };
  if (voice.extensionId) options.extensionId = voice.extensionId;
  try {
    for (const chunk of chunks) {
      if (!isCurrent()) return false;
      await tts.speak(chunk, options);
    }
    return isCurrent();
  } catch (error) {
    if (isCurrent()) tts.stop();
    throw error;
  }
}
