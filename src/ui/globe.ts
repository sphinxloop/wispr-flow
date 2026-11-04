import { CONFIG } from '../config';

type Node = { name: string; lat: number; lon: number };
const RAD = Math.PI / 180;
const COLOR = '182, 255, 122';
const NODE_COLOR = '255, 106, 58';

interface Curve { lat?: number; lon?: number } // a parallel (lat) or a meridian (lon)

/** Wireframe globe on a canvas: draws itself, rotates, and shows pulsing relay nodes. */
export class Globe {
  private ctx: CanvasRenderingContext2D | null;
  private raf = 0;
  private stopped = false;
  private drawStart = -1;
  private drawn = 0; // 0..1
  private nodesAt = -1;
  private nodesInstant = false;
  private curves: Curve[] = [];
  private w = 0;
  private h = 0;
  private dpr = 1;
  private ro: ResizeObserver | null = null;
  private t0 = performance.now();

  constructor(private canvas: HTMLCanvasElement, private nodes: Node[]) {
    this.ctx = canvas.getContext('2d');
    const S = CONFIG.act2.globeStyle;
    for (let lat = -90 + S.latStepDeg; lat < 90; lat += S.latStepDeg) this.curves.push({ lat });
    for (let lon = 0; lon < 360; lon += S.lonStepDeg) this.curves.push({ lon });
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.raf = requestAnimationFrame(this.frame);
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(this.canvas.clientWidth * this.dpr));
    this.h = Math.max(1, Math.round(this.canvas.clientHeight * this.dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  /** Begin the self-drawing animation now (or finish at once when `instant`). */
  startDraw(instant = false) {
    this.drawStart = performance.now();
    if (instant) this.drawn = 1;
  }

  showNodes(instant = false) {
    this.nodesAt = performance.now();
    this.nodesInstant = instant;
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
  }

  private frame = (now: number) => {
    if (this.stopped) return;
    if (!this.canvas.isConnected) return this.stop();
    this.raf = requestAnimationFrame(this.frame);
    this.render(now);
  };

  private render(now: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { w, h, dpr } = this;
    ctx.clearRect(0, 0, w, h);
    if (this.drawStart < 0) return;

    const S = CONFIG.act2.globeStyle;
    const p = this.drawn >= 1 ? 1 : Math.min(1, (now - this.drawStart) / CONFIG.act2.globeDrawMs);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.42;
    const theta = (-S.startLonDeg + ((now - this.t0) / 1000 / CONFIG.act2.globeRotateSecs) * 360) * RAD;
    const tilt = S.tiltDeg * RAD;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    // lat/lon (deg) -> screen x, y and depth z (z > 0 faces the viewer)
    const proj = (lat: number, lon: number) => {
      const la = lat * RAD;
      const lo = lon * RAD + theta;
      const x = Math.cos(la) * Math.sin(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.cos(lo);
      return { x: cx + R * x, y: cy - R * (y * cosT - z * sinT), z: y * sinT + z * cosT };
    };

    // outline circle first (first 15% of the draw time)
    const outline = Math.min(1, p / 0.15);
    ctx.lineWidth = 1.4 * dpr;
    ctx.strokeStyle = `rgba(${COLOR}, 0.9)`;
    ctx.shadowColor = `rgba(${COLOR}, 0.9)`;
    ctx.shadowBlur = 10 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * outline);
    ctx.stroke();

    // lines: batched into one front path and one back path
    const front = new Path2D();
    const back = new Path2D();
    const q = Math.max(0, (p - 0.15) / 0.85);
    const n = this.curves.length;
    const STEP = 6;
    this.curves.forEach((c, i) => {
      const frac = Math.min(1, Math.max(0, (q - (i / n) * 0.7) / 0.3));
      if (frac <= 0) return;
      const count = Math.max(1, Math.floor((c.lat !== undefined ? 360 : 180) / STEP) * frac);
      let prev: { x: number; y: number; z: number } | null = null;
      for (let k = 0; k <= count; k++) {
        const u = Math.min(k, count) / (c.lat !== undefined ? 360 / STEP : 180 / STEP);
        const pt = c.lat !== undefined ? proj(c.lat, u * 360) : proj(-90 + u * 180, c.lon!);
        if (prev) {
          const path = (prev.z + pt.z) / 2 > 0 ? front : back;
          path.moveTo(prev.x, prev.y);
          path.lineTo(pt.x, pt.y);
        }
        prev = pt;
      }
    });
    ctx.lineWidth = 1 * dpr;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${COLOR}, 0.16)`;
    ctx.stroke(back);
    ctx.shadowBlur = 7 * dpr;
    ctx.strokeStyle = `rgba(${COLOR}, 0.8)`;
    ctx.stroke(front);
    ctx.shadowBlur = 0;

    if (this.nodesAt >= 0 && p >= 1) this.drawNodes(ctx, proj, now);
  }

  private drawNodes(
    ctx: CanvasRenderingContext2D,
    proj: (lat: number, lon: number) => { x: number; y: number; z: number },
    now: number,
  ) {
    const dpr = this.dpr;
    const fade = this.nodesInstant ? 1 : Math.min(1, (now - this.nodesAt) / CONFIG.act2.fx.nodeFadeMs);
    const t = now / 1000;
    ctx.font = `${Math.round(15 * dpr)}px VT323, monospace`;
    ctx.textBaseline = 'middle';
    this.nodes.forEach((nd, i) => {
      const pt = proj(nd.lat, nd.lon);
      if (pt.z <= 0.05) return; // front hemisphere only
      const vis = Math.min(1, pt.z * 3) * fade;
      const pulse = Math.sin(t * 3 + i * 1.7);
      const r = (3 + pulse * 1.1) * dpr;
      ctx.shadowColor = `rgba(${NODE_COLOR}, 0.9)`;
      ctx.shadowBlur = 10 * dpr;
      ctx.fillStyle = `rgba(${NODE_COLOR}, ${(0.7 + pulse * 0.25) * vis})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      const ph = (t / 1.8 + i * 0.33) % 1; // expanding ring
      ctx.strokeStyle = `rgba(${NODE_COLOR}, ${(1 - ph) * 0.6 * vis})`;
      ctx.lineWidth = 1.2 * dpr;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r + ph * 16 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      const label = nd.name;
      const tw = ctx.measureText(label).width;
      const left = pt.x + r + 8 * dpr + tw > this.w;
      ctx.textAlign = left ? 'right' : 'left';
      ctx.fillStyle = `rgba(255, 176, 138, ${vis})`;
      ctx.fillText(label, pt.x + (left ? -1 : 1) * (r + 8 * dpr), pt.y);
    });
  }
}
