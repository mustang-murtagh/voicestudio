import {
  AudioLinesIcon,
  BookOpenIcon,
  FingerprintIcon,
  HeadphonesIcon,
  MicIcon,
  WandSparklesIcon,
  ArrowRightIcon,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { WorkspaceHeader } from '@/components/app-shell/workspace-header';

const tasks = [
  {
    to: '/listen',
    title: 'sallyStudio.read_aloud',
    description: 'sallyStudio.read_hint',
    icon: HeadphonesIcon,
  },
  {
    to: '/clone',
    title: 'sallyStudio.voiceover',
    description: 'clone.reference_hint',
    icon: FingerprintIcon,
  },
  {
    to: '/transcriptions',
    title: 'nav.dictation',
    description: 'homeUi.transcribe',
    icon: MicIcon,
  },
  {
    to: '/design',
    title: 'designWorkspace.title',
    description: 'homeUi.design',
    icon: WandSparklesIcon,
  },
  { to: '/stories', title: 'nav.stories', description: 'homeUi.stories', icon: BookOpenIcon },
] as const;

export function SallyStudio() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceHeader>
        <h1>{t('sallyStudio.title')}</h1>
      </WorkspaceHeader>
      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="space-y-3">
            <AudioLinesIcon aria-hidden="true" className="size-10 text-primary" />
            <h2 className="text-3xl font-semibold tracking-tight">{t('sallyStudio.title')}</h2>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">
              {t('sallyStudio.subtitle')}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {tasks.map(({ to, title, description, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon aria-hidden="true" className="mt-1 size-6 shrink-0 text-primary" />
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-medium">{t(title)}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{t(description)}</p>
                </div>
                <ArrowRightIcon
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-primary">
            <Link to="/personas" className="hover:underline">
              {t('nav.saved')}
            </Link>
            <Link to="/settings/models" className="hover:underline">
              {t('modelSettings.models')}
            </Link>
            <Link to="/settings/pronunciation" className="hover:underline">
              {t('pronunciation.title')}
            </Link>
            <Link to="/about" className="hover:underline">
              {t('homeUi.title')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
