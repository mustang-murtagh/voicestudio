import { DownloadIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getBridge } from './bridge';
import { Button } from './ui/button';
import { saveExport } from '@/lib/export-history';
import { downloadAudio, saveMp3 } from '@/lib/audio-export';
import { saveLocalFile } from '@/lib/local-export';

export function SaveAudioButton({
  url,
  suggestedName,
  disabled = false,
  iconOnly = false,
  format = 'original',
}: {
  url?: string;
  suggestedName: string;
  disabled?: boolean;
  /** A compact secondary action: the label becomes the tooltip. */
  iconOnly?: boolean;
  format?: 'original' | 'mp3';
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const bridge = getBridge();
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const label = t(format === 'mp3' ? 'sallyStudio.save_mp3' : 'clone.download');

  const save = async () => {
    if (!url || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    try {
      const saved =
        format === 'mp3'
          ? await saveMp3(url, suggestedName, controller.signal)
          : bridge
            ? await saveExport(url, suggestedName)
            : await saveLocalFile(await downloadAudio(url, controller.signal), suggestedName);
      if (!saved) return;
      if (!controller.signal.aborted && !saved.canceled && saved.path && bridge) {
        const path = saved.path;
        toast.success(t('clone.saved_to', { path }), {
          action: {
            label: t('clone.reveal'),
            onClick: () =>
              void bridge.files.revealPath(path).catch((error) => {
                const message = error instanceof Error ? error.message : String(error);
                toast.error(t('clone.download_failed', { message }));
              }),
          },
        });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t('clone.download_failed', { message }));
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={iconOnly ? 'icon-sm' : 'sm'}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={() => void save()}
      disabled={disabled || saving || !url}
    >
      <DownloadIcon />
      {iconOnly ? null : label}
    </Button>
  );
}
