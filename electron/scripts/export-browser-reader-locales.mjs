import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const catalogue = resolve(root, 'src/renderer/src/i18n/locales');
const keys = {
  chromeHint: 'sallyStudio.chrome_hint',
  localOnly: 'sallyStudio.reader_local',
  readSelection: 'sallyStudio.reader_selection',
  readerEmpty: 'sallyStudio.reader_empty',
  readerFailed: 'sallyStudio.reader_failed',
  noLocalVoice: 'sallyStudio.reader_no_voice',
  readAloud: 'sallyStudio.read_aloud',
  script: 'clone.script',
  voice: 'stories.voiceLabel',
  speed: 'clone.speed',
  search: 'common.search',
  pause: 'common.pause',
  resume: 'common.resume',
  stop: 'common.stop',
};
for (const file of readdirSync(catalogue).filter((item) => item.endsWith('.json'))) {
  const source = JSON.parse(readFileSync(resolve(catalogue, file), 'utf8'));
  const messages = Object.fromEntries(
    Object.entries(keys).map(([key, path]) => {
      const value = path.split('.').reduce((current, part) => current?.[part], source);
      if (typeof value !== 'string') throw new Error(`${file}: missing ${path}`);
      return [key, { message: value }];
    }),
  );
  const directory = resolve(root, 'browser-reader/_locales', file.slice(0, -5).replace('-', '_'));
  mkdirSync(directory, { recursive: true });
  const target = resolve(directory, 'messages.json');
  const expected = JSON.stringify(messages, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== expected)
      throw new Error(`${file}: stale browser-reader locale`);
  } else writeFileSync(target, expected);
}
console.log('Browser reader locales match the 22 renderer catalogues.');
