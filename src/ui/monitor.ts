import { CONFIG } from '../config';
import { h, sleep } from '../core/util';

export type LightMode = 'amber-pulse' | 'green' | 'off' | 'red';
export interface TypeOpts { className?: 'faint' | 'alert' | 'success'; charMs?: number; signal?: AbortSignal }

/**
 * The full-screen CRT terminal: top bar (header, status light, power), the log,
 * a `mainExtra` slot for Act 2 panels, the evidence side panel and the prompt line.
 */
export class Monitor {
  readonly root: HTMLElement;
  readonly mainExtra: HTMLElement;
  readonly evidencePanel: HTMLElement;
  readonly evidenceList: HTMLElement;
  readonly promptRow: HTMLElement;
  readonly warnEl: HTMLElement;
  private log: HTMLElement;
  private logInner: HTMLElement;
  private led: HTMLElement;
  private power: HTMLElement;
  private glitchLine: HTMLElement;
  private glitchTimer = 0;

  constructor(parent: HTMLElement, private getSignal: () => AbortSignal) {
    const T = CONFIG.terminal;
    this.root = h('div', 'term', parent);

    const top = h('div', 'term-top', this.root);
    h('div', 'term-header', top).textContent = T.header;
    const status = h('div', 'term-status', top);
    this.led = h('span', 'led off', status);
    this.power = h('span', 'term-power', status);
    this.power.textContent = T.power;

    const main = h('div', 'term-main', this.root);
    const center = h('div', 'term-center', main);
    this.log = h('div', 'term-log', center);
    this.logInner = h('div', 'term-log-inner', this.log);
    this.mainExtra = h('div', 'term-extra', center);

    this.evidencePanel = h('aside', 'term-evidence hidden', main);
    h('div', 'term-evidence-title', this.evidencePanel).textContent = T.evidenceTitle;
    this.evidenceList = h('div', 'term-evidence-list', this.evidencePanel);

    const bottom = h('div', 'term-bottom', this.root);
    this.warnEl = h('div', 'term-warn', bottom);
    this.promptRow = h('div', 'term-prompt', bottom);
    h('span', 'term-prompt-label', this.promptRow).textContent = T.promptLabel;
    // The voice input is appended here by VoiceInput, then the hint (CSS order).
    h('span', 'term-prompt-hint', this.promptRow).textContent = T.promptHint;

    h('div', 'term-flicker', this.root);
    h('div', 'term-scan', this.root);
    this.glitchLine = h('div', 'term-glitchline', this.root);
    h('div', 'term-vignette', this.root);
    this.glitchLine.addEventListener('animationend', () => this.glitchLine.classList.remove('go'));
    this.scheduleGlitchLine();
  }

  /** One timer: a bright band sweeps down the screen at random intervals. */
  private scheduleGlitchLine() {
    const [lo, hi] = CONFIG.terminal.glitchLineEveryMs;
    this.glitchTimer = window.setTimeout(() => {
      if (this.root.offsetParent) {
        this.glitchLine.style.setProperty('--gl-top', Math.random() * 70 + '%');
        this.glitchLine.style.setProperty('--gl-dx', (Math.random() - 0.5) * 14 + 'px');
        this.glitchLine.classList.remove('go');
        void this.glitchLine.offsetWidth;
        this.glitchLine.classList.add('go');
      }
      this.scheduleGlitchLine();
    }, lo + Math.random() * (hi - lo));
  }

  clear() { this.logInner.replaceChildren(); }

  private scroll() { this.log.scrollTop = this.log.scrollHeight; }

  /** Append one finished line (also used to silently log Nova during video scenes). */
  appendLine(text: string, className?: string): HTMLElement {
    const d = h('div', 'line' + (className ? ' ' + className : ''), this.logInner);
    d.textContent = text;
    while (this.logInner.children.length > CONFIG.terminal.maxLogLines) this.logInner.firstElementChild?.remove();
    this.scroll();
    return d;
  }

  /** Replace everything instantly. */
  setLines(lines: string[], className?: TypeOpts['className']) {
    this.clear();
    lines.forEach((l) => this.appendLine(l, className));
  }

  /** Does any line on screen contain this text? */
  contains(s: string): boolean {
    return Array.from(this.logInner.children).some((c) => c.textContent?.includes(s));
  }

  /** Typewriter: appends lines one char at a time. Rejects (AbortError) on abort. */
  async typeLines(lines: string[], opts: TypeOpts = {}): Promise<void> {
    const signal = opts.signal ?? this.getSignal();
    const ms = opts.charMs ?? CONFIG.timing.typewriterCharMs;
    for (const full of lines) {
      const el = this.appendLine('', opts.className);
      el.classList.add('typing');
      try {
        for (let i = 1; i <= full.length; i++) {
          el.textContent = full.slice(0, i);
          this.scroll();
          await sleep(ms, signal);
        }
      } finally {
        el.classList.remove('typing');
      }
      await sleep(Math.max(60, ms * 4), signal);
    }
  }

  flashRed(on: boolean) { this.root.classList.toggle('red', on); }
  brighten(on = true) { this.root.classList.toggle('bright', on); }
  setDim(level: number) { this.root.style.setProperty('--dim', String(level)); }
  setPower(text: string) { this.power.textContent = text; }

  /** Back to the plain look (used when entering a step by debug jump). */
  resetMode() {
    this.flashRed(false);
    this.brighten(false);
    this.setDim(1);
  }

  setLight(mode: LightMode) { this.led.className = 'led ' + mode; }
}
