import '../act4.css';
import { CONFIG } from '../config';
import { h } from '../core/util';
import type { Game } from '../core/stateMachine';

// ---- safe wrappers for contracts that may not exist yet ----
export function setHint(g: Game, text: string | null): void {
  g.ui.monitor.setHint(text);
}
export function hideAllPanels(g: Game): void {
  const r = g.ui.relay as unknown as { hideAll?: () => void; reset?: () => void };
  if (r.hideAll) r.hideAll();
  else r.reset?.();
}

/** Act 4 UI living in the terminal's main area: alarm banner, recovered letter, reply panel. */
export class Transmission {
  private bannerEl: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private letterEl: HTMLElement | null = null;
  private bodyEl: HTMLElement | null = null;
  private cursor: HTMLElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private replyEl: HTMLElement | null = null;
  private outEl: HTMLElement | null = null;
  private actionsEl: HTMLElement | null = null;
  nameInput: HTMLInputElement | null = null;
  skipRequested = false;
  onSkip: () => void = () => {};

  constructor(private g: Game) {}

  get hasLetter(): boolean { return !!this.letterEl; }

  private get extra(): HTMLElement { return this.g.ui.monitor.mainExtra; }

  banner(text: string): void {
    this.hideBanner();
    const host = this.extra.parentElement?.parentElement ?? this.g.ui.monitor.root; // .term-main
    this.bannerEl = h('div', 'tx-banner', host);
    this.bannerEl.setAttribute('role', 'alert');
    this.bannerEl.textContent = text;
  }
  hideBanner(): void { this.bannerEl?.remove(); this.bannerEl = null; }

  private ensureRoot(): HTMLElement {
    if (!this.root) {
      this.extra.classList.add('on');
      this.root = h('div', 'tx', this.extra);
    }
    return this.root;
  }

  /** Create the (empty) letter panel. */
  openLetter(): void {
    this.removeLetter();
    const root = this.ensureRoot();
    this.letterEl = h('div', 'tx-letter enter', root);
    h('div', 'tx-letter-title', this.letterEl).textContent = CONFIG.act4.letterTitle;
    this.bodyEl = h('div', 'tx-letter-body', this.letterEl);
    this.skipBtn = h('button', 'tx-skip', this.letterEl);
    this.skipBtn.textContent = CONFIG.act4.skipTypingLabel;
    this.skipBtn.dataset.nofocus = '1';
    this.skipBtn.addEventListener('click', () => { this.skipRequested = true; this.onSkip(); });
    this.cursor = h('span', 'tx-cursor');
    this.skipRequested = false;
  }

  /** Types the letter; resolves when done (or skipped). `tick` is called now and then for sound. */
  async typeLetter(text: string, charMs: number, signal: AbortSignal, tick: () => void): Promise<void> {
    const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const body = this.bodyEl!;
    let lastTick = 0;
    let n = 0;
    for (const para of paras) {
      const p = h('p', '', body);
      const txt = document.createTextNode('');
      p.append(txt, this.cursor!);
      for (let i = 1; i <= para.length; i++) {
        if (this.skipRequested) {
          txt.data = para;
          break;
        }
        txt.data = para.slice(0, i);
        body.scrollTop = body.scrollHeight;
        n++;
        const now = performance.now();
        if (n % 2 === 0 && now - lastTick > 55 && para[i - 1] !== ' ') { lastTick = now; tick(); }
        await this.wait(charMs, signal);
      }
      txt.data = para;
      if (this.skipRequested) {
        // finish remaining paragraphs instantly
        const rest = paras.slice(paras.indexOf(para) + 1);
        for (const r of rest) {
          const q = h('p', '', body);
          q.append(document.createTextNode(r));
        }
        break;
      }
      await this.wait(charMs * 8, signal);
    }
    this.cursor?.remove();
    this.skipBtn?.remove();
    this.skipBtn = null;
    body.scrollTop = body.scrollHeight;
  }

  private wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      if (this.skipRequested) return resolve();
      const done = () => { clearTimeout(t); signal.removeEventListener('abort', onAbort); this.onSkip = () => {}; resolve(); };
      const onAbort = () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); };
      const t = setTimeout(done, ms);
      this.onSkip = done;
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  compactLetter(): void {
    this.letterEl?.classList.add('compact');
    this.skipBtn?.remove();
    if (this.bodyEl) this.bodyEl.scrollTop = 0;
  }

  /** The reply panel: optional name field (typed), outgoing message slot, action row. */
  openReply(): HTMLInputElement {
    const root = this.ensureRoot();
    this.replyEl?.remove();
    this.replyEl = h('div', 'tx-reply enter', root);
    this.replyEl.dataset.nofocus = '1'; // clicks here never steal focus into the voice box
    h('div', 'tx-reply-title', this.replyEl).textContent = '▲ REPLY CHANNEL';
    const row = h('label', 'tx-name', this.replyEl);
    h('span', 'tx-name-label', row).textContent = CONFIG.act4.nameLabel;
    const input = h('input', 'tx-name-input', row);
    input.type = 'text';
    input.maxLength = 60;
    input.placeholder = CONFIG.act4.namePlaceholder;
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Your name (optional)');
    this.nameInput = input;
    this.outEl = h('div', 'tx-out', this.replyEl);
    this.actionsEl = h('div', 'tx-actions', this.replyEl);
    return input;
  }

  showOutgoing(message: string): void {
    if (!this.outEl) return;
    const m = h('div', 'tx-msg', this.outEl);
    h('div', 'tx-msg-head', m).textContent = '▶ OUTGOING TRANSMISSION' + (this.nameInput?.value.trim() ? ' · ' + this.nameInput.value.trim() : '');
    h('div', 'tx-msg-text', m).textContent = message;
    this.outEl.classList.add('on');
  }

  showContinue(label: string, onClick: () => void): void {
    if (!this.actionsEl) return;
    const b = h('button', 'tx-continue', this.actionsEl);
    b.textContent = label;
    b.dataset.nofocus = '1';
    b.addEventListener('click', onClick, { once: true });
    b.focus({ preventScroll: true });
  }

  private removeLetter(): void {
    this.letterEl?.remove();
    this.letterEl = this.bodyEl = this.skipBtn = this.cursor = null;
  }

  clear(): void {
    this.hideBanner();
    this.root?.remove();
    this.root = this.letterEl = this.bodyEl = this.skipBtn = this.cursor = this.replyEl = this.outEl = this.actionsEl = null;
    this.nameInput = null;
    if (this.g.ui.monitor.mainExtra.childElementCount === 0) this.g.ui.monitor.mainExtra.classList.remove('on');
  }
}

const cache = new WeakMap<Game, Transmission>();
export function getTransmission(g: Game): Transmission {
  let t = cache.get(g);
  if (!t) {
    t = new Transmission(g);
    cache.set(g, t);
    // Tear the Act 4 panels down as soon as we leave Act 4 (debug jumps included).
    g.onChange((id) => { if (!['act4Intro', 'act4Letter', 'act4Reply'].includes(id)) t!.clear(); });
  }
  return t;
}
