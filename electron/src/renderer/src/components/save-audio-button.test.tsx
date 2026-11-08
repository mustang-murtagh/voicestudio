import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import '@/i18n';

const mock = vi.hoisted(() => ({
  bridge: null as object | null,
  original: vi.fn(),
  mp3: vi.fn(),
  download: vi.fn(),
  local: vi.fn(),
  error: vi.fn(),
}));
vi.mock('./bridge', () => ({ getBridge: () => mock.bridge }));
vi.mock('@/lib/export-history', () => ({ saveExport: mock.original }));
vi.mock('@/lib/audio-export', () => ({ downloadAudio: mock.download, saveMp3: mock.mp3 }));
vi.mock('@/lib/local-export', () => ({ saveLocalFile: mock.local }));
vi.mock('sonner', () => ({ toast: { error: mock.error, success: vi.fn() } }));
import { SaveAudioButton } from './save-audio-button';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  mock.bridge = null;
});

it('enables saving in a browser and downloads the original bytes', async () => {
  const audio = new Blob(['RIFF']);
  mock.download.mockResolvedValue(audio);
  mock.local.mockResolvedValue({ canceled: false });
  render(<SaveAudioButton url="/api/audio/a.wav" suggestedName="lesson.wav" />);
  const button = screen.getByRole('button', { name: 'Save as…' });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  await waitFor(() => expect(mock.local).toHaveBeenCalledWith(audio, 'lesson.wav'));
  expect(mock.original).not.toHaveBeenCalled();
});

it('retains native original-file saves without converting the audio', async () => {
  mock.bridge = { files: {} };
  mock.original.mockResolvedValue({ canceled: true });
  render(<SaveAudioButton url="/api/audio/a.wav" suggestedName="lesson.wav" />);
  fireEvent.click(screen.getByRole('button', { name: 'Save as…' }));
  await waitFor(() => expect(mock.original).toHaveBeenCalledWith('/api/audio/a.wav', 'lesson.wav'));
  expect(mock.download).not.toHaveBeenCalled();
});

it('offers explicit MP3 saving and surfaces encoding failure', async () => {
  mock.mp3.mockRejectedValue(new Error('ffmpeg unavailable'));
  render(<SaveAudioButton url="/api/audio/a.wav" suggestedName="lesson.mp3" format="mp3" />);
  fireEvent.click(screen.getByRole('button', { name: 'Save MP3' }));
  await waitFor(() =>
    expect(mock.error).toHaveBeenCalledWith(expect.stringContaining('ffmpeg unavailable')),
  );
  expect(screen.getByRole('button', { name: 'Save MP3' })).toBeEnabled();
});
