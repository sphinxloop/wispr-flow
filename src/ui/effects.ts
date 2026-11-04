import { h } from '../core/util';

/** Screen effects: shake, dust, flash, fades. Everything cleans up on abort. */
export class Effects {
  private black: HTMLElement;
  private isBlack = false;

  constructor(private stage: HTMLElement, app: HTMLElement, private getSignal: () => AbortSignal) {
    this.black = h('div', 'black-overlay', app);
  }

  /** Jitter the stage; intensity decays to zero. */
  shake(ms: number) {
    const signal = this.getSignal();
    const start = performance.now();
    const w = this.stage.clientWidth;
    const reset = () => { this.stage.style.transform = ''; };
    const tick = (now: number) => {
      const t = (now - start) / ms;
      if (t >= 1 || signal.aborted) return reset();
      const k = (1 - t) * w * 0.008;
      this.stage.style.transform = `translate(${(Math.random() - 0.5) * 2 * k}px, ${(Math.random() - 0.5) * 2 * k}px) rotate(${(Math.random() - 0.5) * 0.004 * (1 - t)}rad)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** Greyish specks falling from the top. */
  dust(ms: number) {
    const signal = this.getSignal();
    const cv = h('canvas', 'dust', this.stage);
    const W = (cv.width = this.stage.clientWidth || 960);
    const H = (cv.height = this.stage.clientHeight || 540);
    const ctx = cv.getContext('2d');
    if (!ctx) return cv.remove();
    const parts = Array.from({ length: 170 }, () => {
      const big = Math.random() < 0.08;
      return {
        x: Math.random() * W,
        y: -Math.random() * H * 0.5,
        vy: (40 + Math.random() * 120) * (W / 960),
        vx: (Math.random() - 0.5) * 20,
        r: (big ? 3 + Math.random() * 3 : 0.8 + Math.random() * 1.8) * (W / 960),
        a: 0.15 + Math.random() * 0.4,
        delay: Math.random() * ms * 0.7,
      };
    });
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      const el = now - start;
      const dt = (now - last) / 1000;
      last = now;
      if (el > ms || signal.aborted) return cv.remove();
      const fade = Math.min(1, (ms - el) / 800);
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        if (el < p.delay) continue;
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        ctx.globalAlpha = p.a * fade;
        ctx.fillStyle = '#b9b6ab';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /** Quick colored flash over the stage. */
  flash(color: string, ms: number) {
    const f = h('div', 'flash', this.stage);
    f.style.background = color;
    f.style.transition = `opacity ${ms}ms ease-out`;
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.opacity = '0'; }));
    setTimeout(() => f.remove(), ms + 100);
  }

  private fade(toBlack: boolean, ms: number): Promise<void> {
    const signal = this.getSignal();
    const p = new Promise<void>((resolve, reject) => {
      this.black.style.transition = `opacity ${ms}ms linear`;
      this.black.style.opacity = toBlack ? '1' : '0';
      this.isBlack = toBlack;
      const t = setTimeout(resolve, ms);
      signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
    p.catch(() => {});
    return p;
  }

  fadeToBlack(ms: number) { return this.fade(true, ms); }
  /** No-op when the screen is not currently black. */
  fadeFromBlack(ms: number) { return this.isBlack ? this.fade(false, ms) : Promise.resolve(); }

  clearBlack() {
    this.black.style.transition = 'none';
    this.black.style.opacity = '0';
    this.isBlack = false;
  }
}
