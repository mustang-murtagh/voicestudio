import { afterEach, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ API_BASE: '/studio/api', apiFetch: mock.fetch }));
vi.mock('@/lib/local-export', () => ({ saveLocalFile: mock.save }));
import { downloadAudio, saveMp3 } from './audio-export';

afterEach(() => vi.resetAllMocks());

it('encodes on the local backend and saves MP3 bytes with an MP3 filename', async () => {
  const wav = new Blob(['RIFF'], { type: 'audio/wav' });
  const mp3 = new Blob(['ID3'], { type: 'audio/mpeg' });
  mock.fetch.mockResolvedValueOnce({ blob: async () => wav });
  mock.fetch.mockResolvedValueOnce({ blob: async () => mp3 });
  mock.save.mockResolvedValue({ canceled: false });
  const signal = new AbortController().signal;
  await saveMp3('/studio/api/audio/take.wav', 'client.lesson.wav', signal);
  expect(mock.fetch.mock.calls[0]).toEqual(['/audio/take.wav', { signal }]);
  const [path, init] = mock.fetch.mock.calls[1];
  expect(path).toBe('/stories/encode');
  expect(init.method).toBe('POST');
  expect(init.body.get('format')).toBe('mp3');
  expect(init.body.get('file').type).toBe('audio/wav');
  expect(mock.save).toHaveBeenCalledWith(mp3, 'client.lesson.mp3');
});

it('does not download a mislabeled WAV when MP3 encoding fails', async () => {
  mock.fetch.mockResolvedValueOnce({ blob: async () => new Blob(['RIFF']) });
  mock.fetch.mockRejectedValueOnce(new Error('ffmpeg unavailable'));
  await expect(saveMp3('/studio/api/audio/take.wav', 'lesson.mp3')).rejects.toThrow(
    'ffmpeg unavailable',
  );
  expect(mock.save).not.toHaveBeenCalled();
});

it('does not save after the view closes during encoding', async () => {
  const controller = new AbortController();
  mock.fetch.mockResolvedValueOnce({ blob: async () => new Blob(['RIFF']) });
  mock.fetch.mockResolvedValueOnce({
    blob: async () => {
      controller.abort();
      return new Blob(['ID3']);
    },
  });
  await expect(
    saveMp3('/studio/api/audio/take.wav', 'lesson.mp3', controller.signal),
  ).rejects.toThrow();
  expect(mock.save).not.toHaveBeenCalled();
});

it('rejects a foreign export URL before using backend credentials', async () => {
  await expect(downloadAudio('https://other.example/audio.wav')).rejects.toThrow(
    'Invalid audio export URL',
  );
  expect(mock.fetch).not.toHaveBeenCalled();
});
