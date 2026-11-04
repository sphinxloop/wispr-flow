import { CONFIG } from '../config';
import { h, sleep } from '../core/util';
import { NovaCore } from './novaCore';
import { StatusPanel } from './statusPanel';

export type LightMode = 'amber-pulse' | 'green' | 'off' | 'red';
export interface TypeOpts { className?: 'faint' | 'alert' | 'success'; charMs?: number; signal?: AbortSignal }

const BARS = 24;

/** Tiny live level meter in the prompt bar: idles flat, bursts on a voice insert. */
class LevelMeter {
  readonly el: HTMLElement;
  private bars: HTMLElement[] = [];
  private burstUntil = 0;
  private external = false;

  constructor(parent: HTMLElement) {
    this.el = h('div', 'term-meter', parent);
    for (let i = 0; i < BARS; i++) this.bars.push(h('i', '', this.el));
  }

  burst(ms = 1000) { this.burstUntil = performance.now() + ms; }

  /** Drive the bars from outside (0..1 per bar, any length); null hands control back to the idle animation. */
  setLevels(levels: ArrayLike<number> | null) {
    this.external = !!levels;
    if (!levels) return;
    this.bars.forEach((b, i) => {
      const v = levels[Math.min(levels.length - 1, Math.floor((i / BARS) * levels.length))] ?? 0;
      b.style.transform = `scaleY(${(0.06 + Math.min(1, v) * 0.94).toFixed(2)})`;
    });
  }

  tick(now: number) {
    if (this.external) return;
    const left = this.burstUntil - now;
    this.bars.forEach((b, i) => {
      let v = 0.05 + Math.random() * 0.07;
      if (left > 0) {
        const env = Math.min(1, left / 400) * (0.45 + 0.55 * Math.sin((i / (BARS - 1)) * Math.PI));
        v = 0.12 + Math.random() * 0.88 * env;
      }
      b.style.transform = `scaleY(${v.toFixed(2)})`;
    });
  }
}

/**
 * The full-screen CRT terminal: header strip, the Nova core, the log, a `mainExtra` slot for Act 2 panels,
 * the right-hand evidence + status panel and the prompt bar.
 */
export class Monitor {
  readonly root: HTMLElement;
  readonly mainExtra: HTMLElement;
  readonly evidencePanel: HTMLElement;
  readonly evidenceList: HTMLElement;
  readonly promptRow: HTMLElement;
  readonly warnEl: HTMLElement;
  readonly core: NovaCore;
  readonly status: StatusPanel;
  readonly meter: LevelMeter;
  private log: HTMLElement;
  private logInner: HTMLElement;
  private led: HTMLElement;
  private ledLabel: HTMLElement;
  private power: HTMLElement;
  private clockEl: HTMLElement;
  private signalBars: HTMLElement[] = [];
  private hintEl: HTMLElement;
  private voiceHint: HTMLElement;
  private hintOverlay: HTMLElement | null = null;
  private hintOverlayText: HTMLElement | null = null;
  private hintText: string | null = null;
  private hintDismissed = false;
  private wasLocked = false;
  private audioLogEl: HTMLElement;
  private isLocked: () => boolean = () => false;
  private clockBase = 0;
  private clockT0 = Date.now();
  private glitchLine: HTMLElement;
  private glitchTimer = 0;
  private lastSec = -1;

  constructor(parent: HTMLElement, private getSignal: () => AbortSignal) {
    const T = CONFIG.terminal;
    const [hh, mm, ss] = T.clockStart.split(':').map(Number);
    this.clockBase = hh * 3600 + mm * 60 + ss;
    this.root = h('div', 'term', parent);

    // header strip
    const top = h('div', 'term-top', this.root);
    const head = h('div', 'term-header', top);
    h('span', 'term-glyph', head).textContent = T.headerGlyph;
    h('span', '', head).textContent = T.header;
    this.clockEl = h('div', 'term-clock', top);
    const status = h('div', 'term-status', top);
    const sig = h('span', 'term-signal', status);
    for (let i = 0; i < 5; i++) this.signalBars.push(h('i', '', sig));
    this.led = h('span', 'led off', status);
    this.ledLabel = h('span', 'term-ledlabel', status);
    this.power = h('span', 'term-power', status);
    this.power.textContent = T.power;

    const main = h('div', 'term-main', this.root);
    if (CONFIG.hintOverlay.enabled) this.buildHintOverlay(main);
    // left zone: the Nova core (or the Act 2 panels in its place)
    const stage = h('div', 'term-stage', main);
    this.core = new NovaCore(stage);
    this.mainExtra = h('div', 'term-extra', stage);

    // log column
    const logCol = h('section', 'term-logcol', main);
    h('div', 'panel-title', logCol).textContent = T.logTitle;
    this.log = h('div', 'term-log', logCol);
    this.logInner = h('div', 'term-log-inner', this.log);
    this.audioLogEl = h('div', 'term-audiolog', logCol);

    // right column: evidence tiles (when unlocked) above the system status rows
    const side = h('div', 'term-side', main);
    this.evidencePanel = h('aside', 'term-evidence hidden', side);
    h('div', 'panel-title', this.evidencePanel).textContent = T.evidenceTitle;
    this.evidenceList = h('div', 'term-evidence-list', this.evidencePanel);
    this.status = new StatusPanel(side);

    const bottom = h('div', 'term-bottom', this.root);
    this.warnEl = h('div', 'term-warn', bottom);
    this.voiceHint = h('div', 'term-hint', bottom);
    this.voiceHint.hidden = true;
    this.promptRow = h('div', 'term-prompt', bottom);
    h('span', 'term-prompt-label', this.promptRow).textContent = T.promptLabel;
    // The voice input is appended here by VoiceInput; CSS order places meter + hint after it.
    this.meter = new LevelMeter(this.promptRow);
    this.hintEl = h('span', 'term-prompt-hint', this.promptRow);
    this.hintEl.textContent = T.promptHint;

    h('div', 'term-flicker', this.root);
    h('div', 'term-scan', this.root);
    h('div', 'term-roll', this.root);
    h('div', 'term-grain', this.root);
    this.glitchLine = h('div', 'term-glitchline', this.root);
    h('div', 'term-vignette', this.root);
    for (const c of ['tl', 'tr', 'bl', 'br']) h('div', 'term-corner ' + c, this.root);
    this.glitchLine.addEventListener('animationend', () => this.glitchLine.classList.remove('go'));
    this.scheduleGlitchLine();
    this.setLight('off');
    this.paintClock();
    window.setInterval(() => this.tick(), 60);
  }

  /** Give the prompt bar access to the input lock (for the "NOVA TRANSMITTING" label). */
  bindLock(fn: () => boolean) { this.isLocked = fn; }

  private clockText(withSeconds: boolean): string {
    const t = (this.clockBase + Math.floor((Date.now() - this.clockT0) / 1000)) % 86400;
    const p = (n: number) => String(n).padStart(2, '0');
    const hms = [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map(p);
    return withSeconds ? hms.join(':') : hms[0] + ':' + hms[1];
  }

  private paintClock() {
    const [hh, mm] = this.clockText(false).split(':');
    this.clockEl.innerHTML = `${CONFIG.terminal.dateShort} · ${hh}<span class="colon">:</span>${mm}`;
  }

  /** ~16fps: meter bars, signal bars and (each second) the clock. Idle when the terminal is not on screen. */
  private tick() {
    if (document.hidden || !this.root.offsetParent) return;
    const now = performance.now();
    this.meter.tick(now);
    const locked = this.isLocked();
    if (this.wasLocked && !locked) this.hintDismissed = false; // Nova finished replying: bring the big hint back
    this.wasLocked = locked;
    this.paintHintOverlay(locked);
    this.promptRow.classList.toggle('locked', locked);
    this.voiceHint.classList.toggle('dim', locked);
    const hint = locked ? CONFIG.terminal.promptTransmitting : CONFIG.terminal.promptHint;
    if (this.hintEl.textContent !== hint) this.hintEl.textContent = hint;
    if (Math.floor(now / 260) !== this.lastSec) {
      this.lastSec = Math.floor(now / 260);
      this.signalBars.forEach((b) => { b.style.transform = `scaleY(${(0.2 + Math.random() * 0.8).toFixed(2)})`; });
    }
    const sec = Math.floor((Date.now() - this.clockT0) / 1000);
    if (sec !== this.lastClockSec) { this.lastClockSec = sec; this.paintClock(); }
  }
  private lastClockSec = -1;

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

  /** The amber hint line above the prompt bar. null hides it. */
  setHint(text: string | null) {
    this.voiceHint.hidden = !text;
    this.voiceHint.textContent = text ?? '';
    this.hintText = text;
    this.hintDismissed = false;
    if (this.hintOverlayText && text) this.hintOverlayText.textContent = text;
    this.paintHintOverlay(this.isLocked());
  }

  get currentHint(): string | null { return this.hintText; }

  /** A voice insert arrived: fade the centred overlay out. */
  dismissHint() {
    this.hintDismissed = true;
    this.paintHintOverlay(this.isLocked());
  }

  /** Bring the centred overlay back (e.g. after a wrong answer that did not lock input). */
  reshowHint() {
    this.hintDismissed = false;
    this.paintHintOverlay(this.isLocked());
  }

  private buildHintOverlay(parent: HTMLElement) {
    const C = CONFIG.hintOverlay;
    const o = h('div', 'hint-overlay', parent);
    o.style.setProperty('--hint-fade', C.fadeMs + 'ms');
    o.setAttribute('aria-hidden', 'true');
    const box = h('div', 'hint-overlay-box', o);
    const icons = h('div', 'hint-overlay-icons', box);
    h('span', 'hint-key', icons).textContent = C.keyLabel;
    h('span', 'hint-mic', icons).textContent = C.icon;
    this.hintOverlayText = h('div', 'hint-overlay-text', box);
    this.hintOverlay = o;
  }

  private paintHintOverlay(locked: boolean) {
    const o = this.hintOverlay;
    if (!o) return;
    let on = !!this.hintText && !locked && !this.hintDismissed && !!this.root.offsetParent;
    if (on) {
      const cine = document.querySelector('.cine') as HTMLElement | null;
      if (document.querySelector('.closeup, .blink-lids, .fly-wrap') || cine?.style.display === 'flex') on = false;
    }
    // Auto-fade after a few seconds so it never hides puzzle clues for long (it returns after a wrong answer).
    const now = performance.now();
    if (on && !this.hintShownAt) this.hintShownAt = now;
    if (!on) this.hintShownAt = 0;
    const auto = CONFIG.hintOverlay.autoHideMs;
    if (on && auto > 0 && now - this.hintShownAt > auto) { this.hintDismissed = true; on = false; this.hintShownAt = 0; }
    o.classList.toggle('on', on);
  }
  private hintShownAt = 0;

  /** Pulsing "audio log" tag at the log bottom while a line without an audio file plays. null hides it. */
  setAudioLog(text: string | null) {
    this.audioLogEl.textContent = text ?? '';
    this.audioLogEl.classList.toggle('on', !!text);
  }

  clear() { this.logInner.replaceChildren(); }

  private scroll() { this.log.scrollTop = this.log.scrollHeight; }

  /** Append one finished line (also used to silently log Nova during video scenes). */
  appendLine(text: string, className?: string): HTMLElement {
    const d = h('div', 'line' + (className ? ' ' + className : ''), this.logInner);
    h('span', 'ts', d).textContent = this.clockText(true);
    h('span', 'tx', d).textContent = text;
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
      const line = this.appendLine('', opts.className);
      const el = line.querySelector('.tx') as HTMLElement;
      line.classList.add('typing');
      try {
        for (let i = 1; i <= full.length; i++) {
          el.textContent = full.slice(0, i);
          this.scroll();
          await sleep(ms, signal);
        }
      } finally {
        line.classList.remove('typing');
      }
      await sleep(Math.max(60, ms * 4), signal);
    }
  }

  flashRed(on: boolean) { this.root.classList.toggle('red', on); }
  brighten(on = true) { this.root.classList.toggle('bright', on); }
  setDim(level: number) { this.root.style.setProperty('--dim', String(level)); }
  setPower(text: string) { this.power.textContent = text; }

  /** Core state + status rows for a key moment (see CONFIG.terminal.stages). */
  applyStage(name: string) {
    const st = CONFIG.terminal.stages[name];
    if (!st) return;
    this.core.setState(st.core);
    this.status.apply(st);
  }

  /** Back to the plain look (used when entering a step by debug jump). */
  resetMode() {
    this.flashRed(false);
    this.brighten(false);
    this.setDim(1);
  }

  setLight(mode: LightMode) {
    this.led.className = 'led ' + mode;
    this.ledLabel.textContent = CONFIG.terminal.lightLabels[mode] ?? '';
  }
}
