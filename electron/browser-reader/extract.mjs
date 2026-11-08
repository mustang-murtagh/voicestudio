/** Self-contained: Chrome serializes this function into the user-invoked tab. */
export function extractReadablePage() {
  const visible = (element) => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (
        node.hidden ||
        node.getAttribute('aria-hidden') === 'true' ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      )
        return false;
    }
    return true;
  };
  const clean = (text) =>
    text
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  const selected = clean(window.getSelection()?.toString() || '');
  const title = document.title.slice(0, 300);
  const site = location.hostname;
  if (selected) return { text: selected, title, site };
  const skipped =
    'script,style,noscript,nav,header,footer,aside,button,input,textarea,select,[contenteditable="true"],[role="navigation"],.gmail_quote,.gmail_signature';
  const textOf = (root) => {
    const visit = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
      if (node.nodeType !== Node.ELEMENT_NODE || node.matches(skipped) || !visible(node)) return '';
      if (node.tagName === 'BR') return '\n';
      const text = Array.from(node.childNodes, visit).join('');
      return /^(P|DIV|ARTICLE|SECTION|LI|H[1-6]|PRE|TR)$/.test(node.tagName)
        ? '\n' + text + '\n'
        : text;
    };
    return clean(visit(root));
  };
  const lastVisible = (selector) =>
    Array.from(document.querySelectorAll(selector)).filter(visible).at(-1);
  if (site === 'mail.google.com') {
    // Only an open, expanded message. Never fall back to the inbox/message list.
    const body = lastVisible('.a3s');
    return { text: body ? textOf(body) : '', title, site };
  }
  if (site === 'claude.ai' || site.endsWith('.claude.ai')) {
    for (const selector of [
      '[data-is-streaming]',
      '[data-testid="assistant-message"]',
      '.font-claude-response',
      '.standard-markdown',
    ]) {
      const reply = lastVisible(selector);
      if (reply)
        return {
          text: reply.getAttribute('data-is-streaming') === 'true' ? '' : textOf(reply),
          title,
          site,
        };
    }
    // A changed Claude layout must not read all prompts or the conversation sidebar.
    return { text: '', title, site };
  }
  const articles = Array.from(document.querySelectorAll('article')).filter(visible);
  const article = articles.map(textOf).sort((a, b) => b.length - a.length)[0];
  const main = document.querySelector('main, [role="main"]') || document.body;
  return { text: article || textOf(main), title, site };
}
