# Sally's local Voice Studio

This fork is configured for Sally's Mac and a browser connected to her own
VoiceStudio backend. Speech generation, voice cloning, transcription and MP3
encoding use local processing. A paid voice API is not required. Model downloads
and first-run dependency setup need internet access; choose installed local
engines for subsequent offline work.

## Start from source

Use an Apple Silicon Mac for this repo's supported on-device Mac engines.
Intel Macs can use the interface with a backend on another supported computer;
see [Mac installation](install/macos.md). Mac hardware has not yet been confirmed
for Sally.

Install Git, Node.js and Bun (the version in the root `package.json`), then:

```sh
git clone https://github.com/mustang-murtagh/voicestudio.git
cd voicestudio
git switch sally/local-voice-workflows
bun install --frozen-lockfile
bun run desktop
```

Follow the existing first-run setup and explicitly choose/download the local
models needed for speech and dictation. Review available disk space and model
licences in Settings before downloading. For browser use, run:

```sh
bun run dev:web
```

Open the local URL printed by Vite. The browser interface needs the backend
running on the Mac; this is not a separately hosted cloud service. Keep it on
localhost unless deliberately configuring authenticated remote access.

## Main tasks

The home screen offers five starting points:

| Task | Workflow |
| --- | --- |
| Listen to text | Open **Read aloud**, choose a saved voice or reference, paste text or use Import, generate, then play. The existing player supports playback controls. Use Stories for long documents. |
| Create a voiceover | Open **Create a voiceover**, record/upload a voice reference, save the profile, write the script and generate. **Save MP3** produces a real 192 kbps MP3; **Save as…** retains the original WAV. Both work in desktop and browser modes. |
| Dictate | Open Transcriptions to record or transcribe and copy the resulting text. On the Mac desktop app, use Settings → Models → Dictation to enable the floating recorder/global shortcut and target-app insertion. Browser tabs cannot insert into unrelated desktop applications. |
| Create client voices | Open Voice Design, choose supported language/accent and voice traits, preview and save a named profile. Availability and accent quality depend on the installed engine. |
| Create learning audio | Use Stories for longer scripts, saved client voices, sections and MP3 exports. Use Audiobooks for chapter-based material. |

Reading from another app currently means copying the text into Read aloud or
importing a document. This build does not automatically inspect other apps'
screens or add a browser extension. Text/Markdown import works in both interfaces;
PDF/EPUB import uses the local backend. Word document import currently requires
the desktop app. Scanned PDFs may need OCR elsewhere first.

MP3 export uses the existing local `/stories/encode` endpoint and requires FFmpeg
(provided by normal runtime setup). An encoding error is shown as a save error;
WAV bytes are never silently given an `.mp3` extension. Cancelling a native save
dialog leaves the source recording intact. Original native exports retain the
existing export-history behavior; generated takes remain in Recent takes.

## Set up Sally's voice

Sally's voice is not bundled or cloned yet. In Voice cloning, record or upload
a clean, natural 5–15 second sample with no background music, review/correct its
transcript and save it as a named profile. Complete the existing consent flow.
Generate a short test before producing a full client resource. Longer engine
reference limits and automatic passage selection are documented in
[audio quality](audio-quality.md).

Keep personal voice recordings, client scripts, generated lessons and model
weights in the app's local data storage, not in this public source repository.

## Useful additions already available

- Name saved voices by client and preference, then reuse them for consistent narration.
- Use the pronunciation dictionary for names, acronyms and specialist vocabulary.
- Adjust generation speed and playback speed for different listening needs.
- Keep the source script alongside client audio for accessibility and later revisions.
- Preview a short passage before rendering a long learning resource.

## Validation and remaining checks

The fork adds the start screen, Read aloud entry point, browser audio downloads
and MP3 saves for current and saved takes. The underlying local speech engines,
voice consent, import, voice design and native dictation are inherited from
VoiceStudio; they have not been replaced with mocked implementations.

Automated checks cover authenticated source fetching, genuine MP3 encoding
requests, failure/cancellation, original native saves and browser saves. A real
local WAV-to-MP3 request has also been exercised with FFmpeg. Native microphone,
Mac Accessibility permissions, cross-app insertion and the sound/likeness of
Sally's voice still need acceptance on her Mac with her recording. No Mac
installer has been built or signed in the Linux development environment.

The original project overview and contributor credits remain at `#/about`.
