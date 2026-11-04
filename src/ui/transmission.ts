import '../act4.css';
import { CONFIG } from '../config';
import { h } from '../core/util';
import type { Game } from '../core/stateMachine';

export function setHint(g: Game, text: string | null): void {
  g.ui.monitor.setHint(text);
}
export function hideAllPanels(g: Game): void {
  g.ui.relay.hideAll();
}

type CueDef = (typeof CONFIG.act4.transmission.cues)[number];
interface Part { text: string; el: HTMLElement; len: number }
interface CueView { def: CueDef; el: HTMLElement; parts: Part[]; len: number; shown: number }

/** Split a cue into styled runs; visible characters flow across the runs in order. */
function splitCue(def: CueDef): Array<{ text: string; cls: string }> {
  const T = CONFIG.act4.transmission;
  if (def.style === 'list') {
    const m = def.text.match(/^(\S+)\s+[—-]\s+(.*)$/s);
    if (m) return [{ text: m[1], cls: 'tx-badge' }, { text: m[2], cls: 'tx-listtext' }];
  }
  if (def.style === 'hero') {
    const i = def.text.indexOf(T.heroPhrase);
    if (i >= 0) {
      const pre = def.text.slice(0, i), post = def.text.slice(i + T.heroPhrase.length);
      return [
        ...(pre ? [{ text: pre, cls: 'tx-pre' }] : []),
        { text: T.heroPhrase, cls: 'tx-hero-phrase' },
        ...(post ? [{ text: post, cls: 'tx-post' }] : []),
      ];
    }
  }
  return [{ text: def.text, cls: '' }];
}

const fmt = (s: number) => {
  s = Math.max(0, Math.floor(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};

/** Act 4 UI in the terminal's main area: the alarm banner and the RECOVERED TRANSMISSION panel. */
export class Transmission {
  private bannerEl: HTMLElement | null = null;
  private root: HTMLElement | null = null;
  private body: HTMLElement | null = null;
  private cues: CueView[] = [];
  private caret: HTMLElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private actionsEl: HTMLElement | null = null;
  private meterBox: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private fill: HTMLElement | null = null;
  private timeEl: HTMLElement | null = null;
  private lastActive = -1;
  private lastTotal = CONFIG.act4.transmission.fallbackDurationS;

  constructor(private g: Game) {}

  get hasPanel(): boolean { return !!this.root; }
  private get extra(): HTMLElement { return this.g.ui.monitor.mainExtra; }

  banner(text: string): void {
    this.hideBanner();
    const host = this.extra.parentElement?.parentElement ?? this.g.ui.monitor.root; // .term-main
    this.bannerEl = h('div', 'tx-banner', host);
    this.bannerEl.setAttribute('role', 'alert');
    this.bannerEl.textContent = text;
  }
  hideBanner(): void { this.bannerEl?.remove(); this.bannerEl = null; }

  /** Build the (empty) panel, plus the live meter and progress bar in the status column. */
  open(): void {
    this.removePanel();
    const T = CONFIG.act4.transmission;
    this.extra.classList.add('on');
    this.root = h('div', 'tx enter', this.extra);
    h('div', 'tx-title', this.root).textContent = T.title;
    this.body = h('div', 'tx-body', this.root);
    this.body.tabIndex = -1;
    this.cues = T.cues.map((def) => {
      const el = h('p', 'tx-cue' + (def.style ? ' ' + def.style : ''), this.body!);
      const parts = splitCue(def).map((p) => ({ text: p.text, len: p.text.length, el: h('span', p.cls, el) }));
      return { def, el, parts, len: def.text.length, shown: 0 };
    });
    this.cues.forEach((c) => (c.el.style.visibility = 'hidden'));
    this.caret = h('span', 'tx-cursor');
    this.skipBtn = h('button', 'tx-skip', this.root);
    this.skipBtn.textContent = T.skipLabel;
    this.skipBtn.dataset.nofocus = '1';
    this.actionsEl = h('div', 'tx-actions', this.root);
    this.actionsEl.dataset.nofocus = '1';

    // status column: meter canvas + progress
    const side = this.g.ui.monitor.status.el.parentElement!;
    this.meterBox = h('section', 'status tx-meterbox', side);
    h('div', 'panel-title', this.meterBox).textContent = T.meterLabel;
    this.canvas = h('canvas', 'tx-wave', this.meterBox);
    const bar = h('div', 'tx-progress', this.meterBox);
    this.fill = h('i', '', bar);
    this.timeEl = h('div', 'tx-time', this.meterBox);
    this.setProgress(0, T.fallbackDurationS);
  }

  get skipButton(): HTMLButtonElement | null { return this.skipBtn; }
  get actions(): HTMLElement | null { return this.actionsEl; }
  get host(): HTMLElement | null { return this.root; }

  /** Paint every cue for transmission time `t` (seconds). Cues type from their `t` to ~0.3s before the next. */
  render(t: number, total: number, all = false): void {
    let active = -1;
    this.cues.forEach((c, i) => {
      const next = i + 1 < this.cues.length ? this.cues[i + 1].def.t : total;
      const raw = next - 0.3 - c.def.t;
      const dur = Math.min(Math.max(raw, c.len * 0.012), c.len * 0.06);
      const n = all ? c.len : Math.floor(Math.min(1, Math.max(0, (t - c.def.t) / dur)) * c.len);
      if (n > 0) active = i;
      if (n === c.shown && !(all && c.el.style.visibility === 'hidden')) return;
      c.shown = n;
      c.el.style.visibility = n > 0 ? 'visible' : 'hidden';
      let left = n;
      for (const p of c.parts) {
        const k = Math.max(0, Math.min(p.len, left));
        left -= k;
        const s = p.text.slice(0, k);
        if (p.el.textContent !== s) p.el.textContent = s;
      }
    });
    if (active >= 0) {
      const c = this.cues[active];
      const part = [...c.parts].reverse().find((p) => p.el.textContent) ?? c.parts[0];
      if (this.caret!.parentElement !== part.el.parentElement || this.caret!.previousSibling !== part.el) part.el.after(this.caret!);
      this.caret!.classList.toggle('done', all);
      if (active !== this.lastActive) {
        this.lastActive = active;
        this.scrollTo(c.el);
      } else if (c.shown < c.len) this.scrollTo(c.el);
    }
  }

  private scrollTo(el: HTMLElement): void {
    const b = this.body!;
    const bottom = el.offsetTop + el.offsetHeight;
    const want = bottom - b.clientHeight + 24;
    if (want > b.scrollTop) b.scrollTop = want;
  }

  setProgress(t: number, total: number): void {
    if (!this.fill) return;
    this.lastTotal = total;
    const f = total > 0 ? Math.min(1, Math.max(0, t / total)) : 0;
    this.fill.style.width = (f * 100).toFixed(1) + '%';
    this.timeEl!.textContent = `${fmt(t)} / ${fmt(total)}`;
  }

  /** Draw bars (0..1) on the status-column canvas. */
  drawWave(levels: ArrayLike<number>): void {
    const c = this.canvas;
    if (!c) return;
    const w = c.clientWidth, hgt = c.clientHeight;
    if (!w || !hgt) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(hgt * dpr); }
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const n = levels.length, bw = w / n;
    ctx.fillStyle = '#b6ff7a';
    ctx.shadowColor = 'rgba(182,255,122,0.7)';
    ctx.shadowBlur = 5;
    for (let i = 0; i < n; i++) {
      const v = Math.max(0.04, Math.min(1, levels[i]));
      const bh = v * hgt;
      ctx.fillRect(i * bw + 1, (hgt - bh) / 2, Math.max(1, bw - 2), bh);
    }
  }

  /** A small button above the text, e.g. the autoplay "tap to play". */
  addButton(label: string, onClick: () => void, cls = 'tx-btn'): HTMLElement {
    const b = h('button', cls, this.actionsEl!);
    b.textContent = label;
    b.dataset.nofocus = '1';
    b.addEventListener('click', onClick);
    return b;
  }

  /** Show the finished panel: every cue complete, no skip button. */
  finish(): void {
    this.skipBtn?.remove();
    this.skipBtn = null;
    this.render(0, 0, true);
    this.setProgress(this.lastTotal, this.lastTotal);
    this.drawWave(new Array(32).fill(0));
    this.lastActive = -1;
    this.body!.scrollTop = this.body!.scrollHeight;
  }

  private removePanel(): void {
    this.root?.remove();
    this.meterBox?.remove();
    this.root = this.body = this.skipBtn = this.actionsEl = this.meterBox = this.canvas = this.fill = this.timeEl = this.caret = null;
    this.cues = [];
    this.lastActive = -1;
  }

  clear(): void {
    this.hideBanner();
    this.removePanel();
    if (this.extra.childElementCount === 0) this.extra.classList.remove('on');
  }
}

const cache = new WeakMap<Game, Transmission>();
export function getTransmission(g: Game): Transmission {
  let t = cache.get(g);
  if (!t) {
    t = new Transmission(g);
    cache.set(g, t);
    // Tear the Act 4 panel down as soon as we leave the transmission and its end screen (debug jumps included).
    g.onChange((id) => { if (id !== 'act4Transmission' && id !== 'act4End') t!.clear(); });
  }
  return t;
}
