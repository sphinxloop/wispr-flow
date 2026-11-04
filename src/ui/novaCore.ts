import { CONFIG } from '../config';
import type { CoreState } from '../config';
import { h } from '../core/util';

type RGB = [number, number, number];
interface Look { color: RGB; amp: number; speed: number; jitter: number; glow: number; rings: number }

const LOOKS: Record<CoreState, Look> = {
  dormant: { color: [255, 179, 71], amp: 0.05, speed: 0.35, jitter: 0, glow: 0.35, rings: 0.45 },
  alert: { color: [255, 84, 64], amp: 0.5, speed: 2.4, jitter: 1, glow: 1, rings: 0.8 },
  online: { color: [150, 255, 130], amp: 0.12, speed: 0.6, jitter: 0, glow: 0.75, rings: 0.7 },
  speaking: { color: [170, 255, 140], amp: 0.3, speed: 1.6, jitter: 0.1, glow: 1, rings: 0.85 },
  surge: { color: [255, 238, 190], amp: 0.34, speed: 1.4, jitter: 0.1, glow: 1.4, rings: 1 },
  hidden: { color: [255, 179, 71], amp: 0, speed: 0, jitter: 0, glow: 0, rings: 0 },
};

const TAU = Math.PI * 2;
const HARMONICS = [2, 3, 5, 8, 13];

/** The Nova "presence": a radial-waveform orb on a canvas with a name + status label under it. */
export class NovaCore {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private wrap: HTMLElement;
  private statusEl: HTMLElement;
  private base: CoreState = 'dormant';
  private shown: CoreState = 'dormant';
  private speaking = false;
  private speakId = 0;
  private analyser: AnalyserNode | null = null;
  private buf: Uint8Array<ArrayBuffer> | null = null;
  private surgeTimer = 0;
  private glitchUntil = 0;
  private nextGlitch = 0;
  private raf = 0;
  private w = 0;
  private hgt = 0;
  private dpr = 1;
  private last = 0;
  private cur: Look = { ...LOOKS.dormant, color: [...LOOKS.dormant.color] as RGB };
  private level = 0;
  private surgeRings: number[] = [];
  private nextSurge = 0;
  private ro: ResizeObserver;

  constructor(parent: HTMLElement) {
    this.el = h('div', 'core', parent);
    this.wrap = h('div', 'core-stage', this.el);
    this.canvas = h('canvas', 'core-canvas', this.wrap);
    this.ctx = this.canvas.getContext('2d');
    const label = h('div', 'core-label', this.el);
    h('div', 'core-name', label).textContent = CONFIG.terminal.core.name;
    this.statusEl = h('div', 'core-status', label);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.wrap);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
    this.apply();
    this.start();
  }

  get state(): CoreState { return this.base; }

  /** Set the resting state. 'surge' settles to 'online' by itself. */
  setState(s: CoreState) {
    clearTimeout(this.surgeTimer);
    const prev = this.base;
    this.base = s;
    if (s === 'alert' && prev !== 'alert') this.glitchUntil = performance.now() + CONFIG.terminal.core.glitchMs;
    if (s === 'surge') {
      this.surgeRings = [];
      this.nextSurge = 0;
      this.surgeTimer = window.setTimeout(() => {
        if (this.base === 'surge') { this.base = 'online'; this.apply(); }
      }, CONFIG.terminal.core.surgeMs);
    }
    this.apply();
  }

  /** A Nova line starts: animate the speaking look (from the analyser when one is given later). Returns a token for endSpeak. */
  beginSpeak(): number {
    this.speaking = true;
    this.analyser = null;
    this.apply();
    return ++this.speakId;
  }

  /** Audio is playing: drive the waveform from this analyser instead of the procedural motion. */
  setAnalyser(a: AnalyserNode) {
    this.analyser = a;
    this.buf = new Uint8Array(new ArrayBuffer(a.fftSize));
  }

  endSpeak(token: number) {
    if (token !== this.speakId) return;
    this.speaking = false;
    this.analyser = null;
    this.apply();
  }

  /** The state actually drawn: alert/surge/hidden win over speaking. */
  private effective(): CoreState {
    if (this.base === 'alert' || this.base === 'surge' || this.base === 'hidden') return this.base;
    return this.speaking ? 'speaking' : this.base;
  }

  private apply() {
    this.shown = this.effective();
    this.el.dataset.state = this.shown;
    this.el.classList.toggle('hidden', this.shown === 'hidden');
    this.statusEl.textContent = CONFIG.terminal.core.words[this.shown];
  }

  private start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(this.wrap.clientWidth * this.dpr));
    this.hgt = Math.max(1, Math.round(this.wrap.clientHeight * this.dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.hgt;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.shown === 'hidden' || !this.ctx || !this.wrap.clientWidth || !this.wrap.clientHeight) return;
    if (this.canvas.width !== this.w || this.canvas.height !== this.hgt) this.resize();
    this.draw(now, dt);
  };

  /** Audio level 0..1 from the analyser, or a procedural stand-in. */
  private measure(t: number): number {
    if (this.analyser && this.buf) {
      this.analyser.getByteTimeDomainData(this.buf);
      let sum = 0;
      for (let i = 0; i < this.buf.length; i++) { const v = (this.buf[i] - 128) / 128; sum += v * v; }
      return Math.min(1, Math.sqrt(sum / this.buf.length) * 4);
    }
    return 0.45 + 0.35 * Math.abs(Math.sin(t * 7.3)) * Math.abs(Math.sin(t * 2.9 + 1)) + 0.2 * Math.random();
  }

  private draw(now: number, dt: number) {
    const ctx = this.ctx!;
    const t = now / 1000;
    const target = LOOKS[this.shown];
    const k = 1 - Math.exp(-dt * 4);
    const c = this.cur;
    for (let i = 0; i < 3; i++) c.color[i] += (target.color[i] - c.color[i]) * k;
    c.amp += (target.amp - c.amp) * k;
    c.speed += (target.speed - c.speed) * k;
    c.jitter += (target.jitter - c.jitter) * k;
    c.glow += (target.glow - c.glow) * k;
    c.rings += (target.rings - c.rings) * k;

    let amp = c.amp;
    if (this.shown === 'speaking') {
      this.level += (this.measure(t) - this.level) * Math.min(1, dt * 14);
      amp = 0.08 + this.level * 0.3;
    } else if (this.shown === 'dormant') {
      amp += 0.025 * Math.sin(t * 0.9); // slow breathing
    }
    const breathe = this.shown === 'dormant' ? 1 + 0.025 * Math.sin(t * 0.9) : 1;

    const W = this.w;
    const H = this.hgt;
    const cx = W / 2;
    const cy = H / 2;
    const R = (Math.min(W, H) / 2) * 0.96;
    const col = `${c.color[0] | 0}, ${c.color[1] | 0}, ${c.color[2] | 0}`;
    const rgba = (a: number) => `rgba(${col}, ${a})`;
    const dpr = this.dpr;
    const hair = Math.max(1, dpr * 0.8);

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cx, cy);

    // glitch: a brief horizontal tear + red/cyan split
    const glitching = now < this.glitchUntil || (this.shown === 'alert' && now > this.nextGlitch);
    if (this.shown === 'alert' && now > this.nextGlitch) {
      this.glitchUntil = now + 160;
      this.nextGlitch = now + 900 + Math.random() * 1400;
    }

    // soft inner glow
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.62);
    g.addColorStop(0, rgba(0.14 * c.glow));
    g.addColorStop(1, rgba(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.62, 0, TAU);
    ctx.fill();

    // concentric thin rings
    ctx.lineWidth = hair;
    [0.3, 0.62, 0.74, 0.97].forEach((r, i) => {
      ctx.strokeStyle = rgba((i === 3 ? 0.35 : 0.16) * c.rings + 0.03);
      ctx.beginPath();
      ctx.arc(0, 0, R * r * breathe, 0, TAU);
      ctx.stroke();
    });
    // a dashed ring turning slowly
    ctx.save();
    ctx.rotate(t * 0.12 * (c.speed + 0.3));
    ctx.setLineDash([dpr * 3, dpr * 9]);
    ctx.strokeStyle = rgba(0.3 * c.rings);
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.68, 0, TAU);
    ctx.stroke();
    ctx.restore();

    // ticks
    ctx.save();
    ctx.rotate(-t * 0.05 * (c.speed + 0.2));
    const N = 120;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      const major = i % 10 === 0;
      const r1 = R * 0.82;
      const r2 = R * (major ? 0.92 : 0.87);
      ctx.strokeStyle = rgba((major ? 0.7 : 0.28) * c.rings + 0.05);
      ctx.lineWidth = major ? hair * 1.5 : hair;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
    // bright sweep segment on the outer ring
    const sw = t * (0.5 + c.speed * 0.5);
    ctx.strokeStyle = rgba(0.9 * c.rings);
    ctx.lineWidth = hair * 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.97, sw, sw + 0.35);
    ctx.stroke();

    // surge: expanding rings
    if (this.shown === 'surge') {
      if (now > this.nextSurge) { this.surgeRings.push(0); this.nextSurge = now + 420; }
      this.surgeRings = this.surgeRings.map((p) => p + dt * 0.55).filter((p) => p < 1);
      for (const p of this.surgeRings) {
        ctx.strokeStyle = rgba((1 - p) * 0.8);
        ctx.lineWidth = hair * (2.5 - p * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, R * (0.4 + p * 0.75), 0, TAU);
        ctx.stroke();
      }
    }

    // the waveform ring
    const r0 = R * 0.46 * breathe;
    const POINTS = 200;
    const wave = (tt: number, jit: number) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= POINTS; i++) {
        const a = (i / POINTS) * TAU;
        let n = 0;
        HARMONICS.forEach((hk, j) => {
          n += (Math.sin(hk * a + tt * c.speed * (1 + j * 0.45) + j * 1.7) / (1 + j * 0.7));
        });
        n /= 2.2;
        if (jit > 0) n += (Math.random() - 0.5) * 1.1 * jit;
        const r = r0 * (1 + amp * n * 0.9);
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return pts;
    };
    const path = (pts: Array<[number, number]>, dx = 0) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y) : ctx.moveTo(x + dx, y)));
      ctx.closePath();
    };
    const jit = c.jitter;
    // trail (previous phase), then the main trace
    path(wave(t - 0.12, jit * 0.5));
    ctx.strokeStyle = rgba(0.28);
    ctx.lineWidth = hair;
    ctx.stroke();
    const main = wave(t, jit);
    if (glitching) {
      const d = R * 0.035;
      path(main, -d);
      ctx.strokeStyle = 'rgba(255, 60, 60, 0.55)';
      ctx.lineWidth = hair * 1.5;
      ctx.stroke();
      path(main, d);
      ctx.strokeStyle = 'rgba(60, 230, 255, 0.5)';
      ctx.stroke();
    }
    ctx.shadowColor = rgba(0.9);
    ctx.shadowBlur = 14 * dpr * c.glow;
    path(main);
    ctx.fillStyle = rgba(0.05 * c.glow);
    ctx.fill();
    ctx.strokeStyle = rgba(0.95);
    ctx.lineWidth = hair * 2.2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // centre mark
    ctx.strokeStyle = rgba(0.5);
    ctx.lineWidth = hair;
    const m = R * 0.05;
    ctx.beginPath();
    ctx.moveTo(-m, 0); ctx.lineTo(m, 0);
    ctx.moveTo(0, -m); ctx.lineTo(0, m);
    ctx.stroke();

    if (glitching) {
      // tear: shift a horizontal slice of what was drawn
      const sy = Math.round(cy + (Math.random() - 0.5) * R * 1.4);
      const sh = Math.round(R * (0.05 + Math.random() * 0.1));
      ctx.restore();
      try {
        const slice = ctx.getImageData(0, Math.max(0, sy), W, Math.min(sh, H - Math.max(0, sy)));
        ctx.putImageData(slice, Math.round((Math.random() - 0.5) * R * 0.18), Math.max(0, sy));
      } catch { /* ignore */ }
      return;
    }
    ctx.restore();
  }
}
