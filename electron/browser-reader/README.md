# VoiceStudio Reader for Chrome

Read an open Gmail newsletter, the latest Claude reply, an article or selected
text without copying and pasting. The reader speaks with **installed on-device
voices**, using Chrome's speech API. It does not need a running VoiceStudio
backend, a paid voice service, an email API key or mailbox access.

## Install on Sally's Mac

1. Download/check out this repo's `sally/local-voice-workflows` branch.
2. Open `chrome://extensions` in Chrome and turn on **Developer mode**.
3. Choose **Load unpacked**, then select this folder: `electron/browser-reader`.
4. Pin **VoiceStudio Reader** using Chrome's extensions menu.
5. Open a newsletter email in Gmail, a Claude conversation or an article. Click
   the extension icon, review the automatically extracted text, choose a local
   voice and click **Read aloud**.

The popup has voice search, reading speed, Pause, Resume and Stop. You can close
the popup and keep listening: the entire newsletter is queued in Chrome. Reopen
the popup to pause or stop. Changing the voice or speed takes effect when you
start reading again.

Alternatively, highlight any passage on a normal web page, right-click and
choose **Read selection in VoiceStudio**. Selection takes priority over the
automatic page extraction. You can also edit the preview before listening.

If no local voices appear, download an appropriate voice in macOS speech / spoken
content settings, restart Chrome and reopen the reader. Only voices Chrome
reports as on-device (`remote: false`) are offered; a cloud voice is never
silently substituted.

## What it reads

- **Gmail:** the last visible, expanded message body in the open thread. It
  omits quoted replies, old signatures and hidden text. To hear an earlier
  message in a thread, select that message's text first.
- **Claude:** the latest completed assistant reply in supported page markup,
  without reading your prompts or the conversation sidebar. If Claude changes
  its layout, or is still generating, highlight the desired text instead.
- **Articles:** the largest visible article, falling back to the main content;
  navigation, forms, hidden text and page headers/footers are excluded.
- **Other webmail/sites:** highlight the desired passage first when automatic
  article extraction is unsuitable. You do not have to copy it.

This reads the page you deliberately open. It does not fetch unread mail in the
background, scan your inbox, change email labels, mark messages read or send
anything. It does not read native Mac Mail or Claude desktop windows. Chrome
internal pages, inaccessible cross-origin frames, canvas-rendered text and some
PDF viewers require another route. There is a 100,000-character input limit;
oversized text is rejected rather than silently truncated.

## Voices, audio files and privacy

The extension's fast listening voices come from the operating system. Sally's
cloned voice and downloadable MP3 lessons remain in VoiceStudio's **Create a
voiceover** / **Stories** workspaces; the extension does not claim to read using
her clone or export the operating system's spoken output.

There are no remote resources, telemetry, host permissions or always-on content
scripts. Chrome grants access to the current tab only when you invoke the
extension. Preview text lives in the popup; after starting speech a copy is kept
in memory-only extension session storage until Stop or browser exit. Voice/rate
preferences are saved locally, never synced. No newsletter text, meeting audio,
voice samples or credentials belong in this public repo.

## Development and verification

UI messages are generated from the 22 renderer catalogues. After changing them:

```sh
node electron/scripts/export-browser-reader-locales.mjs
node electron/scripts/export-browser-reader-locales.mjs --check
node --test electron/browser-reader/test/*.test.mjs
# With Playwright Chromium installed, an isolated fixture-based integration check:
node electron/browser-reader/test/browser-smoke.mjs
```

Tests cover Gmail/Claude extraction, selection, hidden/quoted text, paragraph
boundaries, long newsletters, local-only voices, queueing and permissions. Browser
fixtures are not a claim of live authenticated Gmail/Claude acceptance. Mac voice
availability, real speech output and current production website layouts still
need acceptance in Sally's Chrome profile. Load the folder locally; the extension
has not been published to the Chrome Web Store.
