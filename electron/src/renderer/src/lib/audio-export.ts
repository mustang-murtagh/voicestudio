import { API_BASE, apiFetch } from '@/lib/api/client';
import { saveLocalFile } from '@/lib/local-export';

/** Fetch through the authenticated API client, preserving configured URL prefixes. */
export async function downloadAudio(url: string, signal?: AbortSignal): Promise<Blob> {
  if (!url.startsWith(`${API_BASE}/`)) throw new Error('Invalid audio export URL');
  return (await apiFetch(url.slice(API_BASE.length), { signal })).blob();
}

/** Encoding happens on the user's backend, without a voice-service account. */
export async function saveMp3(url: string, suggestedName: string, signal?: AbortSignal) {
  const audio = await downloadAudio(url, signal);
  const body = new FormData();
  body.set('file', audio, 'voiceover.wav');
  body.set('format', 'mp3');
  body.set('bitrate', '192k');
  const response = await apiFetch('/stories/encode', { method: 'POST', body, signal });
  const encoded = await response.blob();
  signal?.throwIfAborted();
  return saveLocalFile(encoded, suggestedName.replace(/\.[^.]+$/, '') + '.mp3');
}
