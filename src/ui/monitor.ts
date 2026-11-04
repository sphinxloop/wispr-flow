import { CONFIG } from '../config';
import { h, place, sleep } from '../core/util';

export type LightMode = 'amber-pulse' | 'green' | 'off' | 'red';
export interface TypeOpts { className?: 'faint' | 'alert' | 'success'; charMs?: number; signal?: AbortSignal }

const MAX_LINES = 18;

/** The CRT text area plus the little status LED. */
export class Monitor {
  private crt: HTMLElement;
  private text: HTMLElement;
  private led: HTMLElement;

  constructor(stage: HTMLElement, private getSignal: () => AbortSignal) {
    this.crt = h('div', 'crt', stage);
    place(this.crt, CONFIG.layout.screenText);
    this.text = h('div', 'crt-text', this.crt);
    h('div', 'crt-scan', this.crt);
    h('div', 'crt-vignette', this.crt);

    const l = CONFIG.layout.statusLight;
    this.led = h('div', 'led off', stage);
    this.led.style.left = l.left + '%';
    this.led.style.top = l.top + '%';
    this.led.style.width = l.size + '%';
    this.led.style.aspectRatio = '1';
  }

  clear() { this.text.replaceChildren(); }

  private addLine(text: string, className?: string): HTMLElement {
    const d = h('div', 'line' + (className ? ' ' + className : ''), this.text);
    d.textContent = text;
    while (this.text.children.length > MAX_LINES) this.text.firstElementChild?.remove();
    return d;
  }

  /** Replace everything instantly. */
  setLines(lines: string[], className?: TypeOpts['className']) {
    this.clear();
    lines.forEach((l) => this.addLine(l, className));
  }

  /** Does any line on screen contain this text? */
  contains(s: string): boolean {
    return Array.from(this.text.children).some((c) => c.textContent?.includes(s));
  }

  /** Typewriter: appends lines one char at a time. Rejects (AbortError) on abort. */
  async typeLines(lines: string[], opts: TypeOpts = {}): Promise<void> {
    const signal = opts.signal ?? this.getSignal();
    const ms = opts.charMs ?? CONFIG.timing.typewriterCharMs;
    for (const full of lines) {
      const el = this.addLine('', opts.className);
      el.classList.add('typing');
      try {
        for (let i = 1; i <= full.length; i++) {
          el.textContent = full.slice(0, i);
          await sleep(ms, signal);
        }
      } finally {
        el.classList.remove('typing');
      }
      await sleep(Math.max(60, ms * 4), signal);
    }
  }

  flashRed(on: boolean) { this.crt.classList.toggle('red', on); }
  brighten(on = true) { this.crt.classList.toggle('bright', on); }
  setDim(level: number) { this.crt.style.setProperty('--dim', String(level)); }

  /** Back to the plain look (used when entering a step by debug jump). */
  resetMode() {
    this.flashRed(false);
    this.brighten(false);
    this.setDim(1);
  }

  setLight(mode: LightMode) { this.led.className = 'led ' + mode; }
}
