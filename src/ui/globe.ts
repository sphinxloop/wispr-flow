import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate, geoDistance, geoCircle } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';
import { CONFIG } from '../config';

type Node = { name: string; lat: number; lon: number };
export type NodeState = 'idle' | 'clickable' | 'solved';
type LatLon = [number, number];

const RAD = Math.PI / 180;
const LINE = '170, 255, 140'; // fallback RGB for glows (matches CONFIG.act3.globe.line)
const NODE = '255, 179, 71';
const SOLVED = '157, 255, 122';

// Countries are code-split: the JSON loads once, on first use.
let landPromise: Promise<FeatureCollection<Geometry>> | null = null;
function loadLand(): Promise<FeatureCollection<Geometry>> {
  landPromise ??= import('world-atlas/countries-110m.json').then((m) => {
    const topo = (m.default ?? m) as unknown as Topology;
    return feature(topo, topo.objects.countries as GeometryCollection) as FeatureCollection<Geometry>;
  });
  return landPromise;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

interface Tween { fromLam: number; fromPhi: number; toLam: number; toPhi: number; start: number; ms: number; done: () => void }
interface ArcJob { pts: LatLon[]; start: number; ms: number }
interface Wave { origin: LatLon; start: number; ms: number }

/** Real orthographic globe on a canvas (d3-geo + world-atlas). Draws in, spins, focuses nodes, arcs and waves. */
export class Globe {
  private ctx: CanvasRenderingContext2D | null;
  private raf = 0;
  private stopped = false;
  private drawStart = -1;
  private drawn = 0; // 0..1
  private nodesAt = -1;
  private nodesInstant = false;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private ro: ResizeObserver | null = null;
  private last = performance.now();
  private land: FeatureCollection<Geometry> | null = null;

  // view
  private lam: number;
  private phi: number;
  private spinning = true;
  private tween: Tween | null = null;
  private fill = false;
  private proj: GeoProjection = geoOrthographic().clipAngle(90).precision(0.4);
  private graticule = geoGraticule10();

  // nodes
  private states = new Map<string, NodeState>();
  private screenPos = new Map<string, { x: number; y: number }>();
  private clickCb: ((name: string) => void) | null = null;

  // effects
  private arcs: ArcJob[] = [];
  private arcDone: Array<() => void> = [];
  private wave_: Wave | null = null;
  private waveDone: (() => void) | null = null;
  private lastFocus: LatLon = [20, 40];

  constructor(private canvas: HTMLCanvasElement, private nodes: Node[]) {
    this.ctx = canvas.getContext('2d');
    const G = CONFIG.act3.globe;
    this.lam = -CONFIG.act2.globeStyle.startLonDeg;
    this.phi = G.tiltDeg;
    nodes.forEach((n) => this.states.set(n.name, 'idle'));
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('click', this.onClick);
    canvas.addEventListener('pointerleave', () => { canvas.style.cursor = ''; });
    loadLand().then((l) => { this.land = l; }).catch(() => {});
    this.raf = requestAnimationFrame(this.frame);
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(this.canvas.clientWidth * this.dpr));
    this.h = Math.max(1, Math.round(this.canvas.clientHeight * this.dpr));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  // ---------- public API ----------

  /** Begin the self-drawing animation now (or finish at once when `instant`). */
  startDraw(instant = false) {
    this.drawStart = performance.now();
    if (instant) this.drawn = 1;
  }

  showNodes(instant = false) {
    this.nodesAt = performance.now();
    this.nodesInstant = instant;
  }

  /** Big mode: the globe fills the main area. */
  setFill(on: boolean) { this.fill = on; }

  setNodeState(name: string, state: NodeState) { this.states.set(name, state); }

  onNodeClick(cb: ((name: string) => void) | null) { this.clickCb = cb; }

  /** Smoothly rotate so the point is centred. Idle spin pauses. Resolves when done (or when replaced). */
  focusOn(lat: number, lon: number, ms: number): Promise<void> {
    this.spinning = false;
    this.lastFocus = [lat, lon];
    this.tween?.done();
    return new Promise<void>((resolve) => {
      const toLam0 = -lon;
      // shortest way round
      let d = ((toLam0 - this.lam + 540) % 360) - 180;
      if (ms <= 0) { this.lam += d; this.phi = -lat; this.tween = null; return resolve(); }
      this.tween = { fromLam: this.lam, fromPhi: this.phi, toLam: this.lam + d, toPhi: -lat, start: performance.now(), ms, done: resolve };
    });
  }

  resumeSpin() {
    this.tween?.done();
    this.tween = null;
    this.spinning = true;
  }

  /** Great-circle arcs drawn one after another, then pulsing. Resolves when drawn. */
  drawArcs(pairs: LatLon[][], ms: number): Promise<void> {
    const now = performance.now();
    const per = ms / Math.max(1, pairs.length);
    this.arcs = pairs.map((p, i) => {
      const interp = geoInterpolate([p[0][1], p[0][0]], [p[1][1], p[1][0]]);
      const pts: LatLon[] = [];
      for (let k = 0; k <= 64; k++) { const [lo, la] = interp(k / 64); pts.push([la, lo]); }
      return { pts, start: now + i * per, ms: per };
    });
    return new Promise<void>((res) => { this.arcDone.push(res); setTimeout(res, ms + 30); });
  }

  /** Country outlines brighten in a ring sweeping out from the focused point. */
  wave(ms: number): Promise<void> {
    this.wave_ = { origin: this.centerLatLon(), start: performance.now(), ms };
    return new Promise<void>((res) => { this.waveDone = res; setTimeout(res, ms * 1.2 + 100); });
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.tween?.done();
    this.arcDone.forEach((f) => f());
    this.waveDone?.();
  }

  // ---------- interaction ----------

  private hit(e: MouseEvent): string | null {
    const r = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * this.w;
    const y = ((e.clientY - r.top) / r.height) * this.h;
    let best: string | null = null;
    let bestD = 30 * this.dpr;
    this.screenPos.forEach((p, name) => {
      if (this.states.get(name) !== 'clickable') return;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestD) { bestD = d; best = name; }
    });
    return best;
  }

  private onMove = (e: PointerEvent) => { this.canvas.style.cursor = this.hit(e) ? 'pointer' : ''; };
  private onClick = (e: MouseEvent) => {
    const name = this.hit(e);
    if (name) this.clickCb?.(name);
  };

  // ---------- rendering ----------

  private centerLatLon(): LatLon { return [-this.phi, -this.lam]; }

  private frame = (now: number) => {
    if (this.stopped) return;
    if (!this.canvas.isConnected) return this.stop();
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.step(now, dt);
    this.render(now);
  };

  private step(now: number, dt: number) {
    const G = CONFIG.act3.globe;
    if (this.tween) {
      const t = this.tween;
      const k = Math.min(1, (now - t.start) / t.ms);
      const e = ease(k);
      this.lam = t.fromLam + (t.toLam - t.fromLam) * e;
      this.phi = t.fromPhi + (t.toPhi - t.fromPhi) * e;
      if (k >= 1) { this.tween = null; t.done(); }
    } else if (this.spinning) {
      this.lam += G.rotateDegPerSec * dt;
      this.phi += (G.tiltDeg - this.phi) * Math.min(1, dt * 2.5);
    }
  }

  private render(now: number) {
    const ctx = this.ctx;
    if (!ctx) return;
    const { w, h, dpr } = this;
    const G = CONFIG.act3.globe;
    ctx.clearRect(0, 0, w, h);
    if (this.drawStart < 0) return;

    const p = this.drawn >= 1 ? 1 : Math.min(1, (now - this.drawStart) / CONFIG.act2.globeDrawMs);
    if (p >= 1) this.drawn = 1;
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * (this.fill ? 0.455 : 0.4);
    const proj = this.proj.translate([cx, cy]).scale(R).rotate([this.lam, this.phi, 0]);
    const path = geoPath(proj, ctx);
    const sphere = { type: 'Sphere' } as const;

    // atmosphere halo behind the disc
    const halo = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.28);
    halo.addColorStop(0, `rgba(${LINE}, ${0.2 * smooth(p / 0.2)})`);
    halo.addColorStop(1, `rgba(${LINE}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
    ctx.fill();

    // ocean disc
    const ocean = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R);
    ocean.addColorStop(0, '#0b1d10');
    ocean.addColorStop(0.6, G.ocean);
    ocean.addColorStop(1, '#010302');
    ctx.globalAlpha = smooth(p / 0.2);
    ctx.fillStyle = ocean;
    ctx.beginPath();
    path(sphere);
    ctx.fill();

    // graticule
    ctx.globalAlpha = smooth((p - 0.1) / 0.4);
    ctx.lineWidth = dpr * 0.8;
    ctx.strokeStyle = G.graticule;
    ctx.beginPath();
    path(this.graticule);
    ctx.stroke();

    // countries: fill + glowing outline, fading in with the draw
    const landA = smooth((p - 0.25) / 0.75);
    if (this.land && landA > 0) {
      ctx.globalAlpha = landA;
      ctx.fillStyle = 'rgba(120, 220, 100, 0.07)';
      ctx.beginPath();
      path(this.land);
      ctx.fill();
      ctx.lineWidth = dpr * 0.9;
      ctx.strokeStyle = G.line;
      ctx.shadowColor = `rgba(${LINE}, 0.8)`;
      ctx.shadowBlur = 6 * dpr;
      ctx.stroke();
      ctx.shadowBlur = 0;
      this.drawWave(ctx, path, proj, now);
    }
    ctx.globalAlpha = 1;

    // scan line during the draw-in
    if (p < 1) {
      const c = this.centerLatLon();
      const lon = c[1] - 100 + 200 * smooth(p);
      const meridian = { type: 'LineString', coordinates: Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5]) } as const;
      ctx.strokeStyle = `rgba(${LINE}, ${0.9 * (1 - p)})`;
      ctx.lineWidth = dpr * 1.6;
      ctx.shadowColor = `rgba(${LINE}, 1)`;
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();
      path(meridian);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // limb light + outline with glow
    const limb = ctx.createRadialGradient(cx, cy, R * 0.72, cx, cy, R);
    limb.addColorStop(0, `rgba(${LINE}, 0)`);
    limb.addColorStop(1, `rgba(${LINE}, ${0.16 * smooth(p / 0.3)})`);
    ctx.fillStyle = limb;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = dpr * 1.6;
    ctx.strokeStyle = `rgba(${LINE}, ${0.85 * smooth(p / 0.15)})`;
    ctx.shadowColor = `rgba(${LINE}, 0.9)`;
    ctx.shadowBlur = 14 * dpr;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p / 0.15));
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (p >= 1) {
      this.drawArcsLayer(ctx, proj, now);
      if (this.nodesAt >= 0) this.drawNodes(ctx, proj, now);
    }
  }

  /** Brighter country outlines inside a moving ring. */
  private drawWave(ctx: CanvasRenderingContext2D, path: ReturnType<typeof geoPath>, proj: GeoProjection, now: number) {
    const wv = this.wave_;
    if (!wv || !this.land) return;
    const k = (now - wv.start) / wv.ms;
    if (k >= 1.15) {
      this.wave_ = null;
      this.waveDone?.();
      this.waveDone = null;
      return;
    }
    const front = k * 200; // degrees from the origin
    const inner = Math.max(0.01, front - 38);
    const outer = Math.min(179.9, Math.max(0.02, front));
    if (front <= 0.02) return;
    const circ = (r: number) => geoCircle().center([wv.origin[1], wv.origin[0]]).radius(r).precision(2)();
    ctx.save();
    ctx.beginPath();
    path(circ(outer));
    if (inner < outer - 0.05) path(circ(inner));
    ctx.clip('evenodd');
    ctx.beginPath();
    path(this.land);
    ctx.lineWidth = this.dpr * 1.8;
    ctx.strokeStyle = `rgba(230, 255, 190, ${0.95 * Math.min(1, (1.15 - k) * 3)})`;
    ctx.shadowColor = 'rgba(200, 255, 150, 1)';
    ctx.shadowBlur = 16 * this.dpr;
    ctx.stroke();
    ctx.restore();
    void proj;
  }

  private visible(lat: number, lon: number): boolean {
    const c = this.centerLatLon();
    return geoDistance([lon, lat], [c[1], c[0]]) < Math.PI / 2 - 0.04;
  }

  private drawArcsLayer(ctx: CanvasRenderingContext2D, proj: GeoProjection, now: number) {
    if (!this.arcs.length) return;
    const dpr = this.dpr;
    const [cx, cy] = proj.translate();
    const R = proj.scale();
    const lift = (la: number, lo: number, f: number) => {
      const pt = proj([lo, la]);
      if (!pt) return null;
      const hgt = 1 + Math.sin(Math.PI * f) * 0.14;
      return { x: cx + (pt[0] - cx) * hgt, y: cy + (pt[1] - cy) * hgt };
    };
    const pulse = 0.65 + 0.35 * Math.sin(now / 260);
    this.arcs.forEach((a, ai) => {
      const prog = Math.max(0, Math.min(1, (now - a.start) / a.ms));
      if (prog <= 0) return;
      const n = Math.floor(prog * (a.pts.length - 1));
      const done = prog >= 1;
      ctx.lineWidth = dpr * 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255, 190, 90, ${done ? 0.5 + 0.4 * pulse : 0.95})`;
      ctx.shadowColor = 'rgba(255, 170, 60, 1)';
      ctx.shadowBlur = (done ? 8 + 10 * pulse : 14) * dpr;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const [la, lo] = a.pts[i];
        if (!this.visible(la, lo)) { pen = false; continue; }
        const q = lift(la, lo, i / (a.pts.length - 1));
        if (!q) { pen = false; continue; }
        if (pen) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
        pen = true;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // travelling spark on finished arcs (and the drawing head on live ones)
      const f = done ? ((now / 1600 + ai * 0.37) % 1) : prog;
      const idx = Math.floor(f * (a.pts.length - 1));
      const [la, lo] = a.pts[idx];
      if (this.visible(la, lo)) {
        const q = lift(la, lo, f);
        if (q) {
          ctx.fillStyle = 'rgba(255, 245, 210, 0.95)';
          ctx.shadowColor = 'rgba(255, 200, 100, 1)';
          ctx.shadowBlur = 12 * dpr;
          ctx.beginPath();
          ctx.arc(q.x, q.y, 3 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });
    void R;
  }

  private drawNodes(ctx: CanvasRenderingContext2D, proj: GeoProjection, now: number) {
    const dpr = this.dpr;
    const fade = this.nodesInstant ? 1 : Math.min(1, (now - this.nodesAt) / CONFIG.act2.fx.nodeFadeMs);
    const t = now / 1000;
    this.screenPos.clear();
    ctx.textBaseline = 'middle';
    this.nodes.forEach((nd, i) => {
      if (!this.visible(nd.lat, nd.lon)) return;
      const pt = proj([nd.lon, nd.lat]);
      if (!pt) return;
      const c = this.centerLatLon();
      const z = Math.cos(geoDistance([nd.lon, nd.lat], [c[1], c[0]]));
      const vis = Math.min(1, z * 3.5) * fade;
      const state = this.states.get(nd.name) ?? 'idle';
      const rgb = state === 'solved' ? SOLVED : NODE;
      const pulse = Math.sin(t * (state === 'clickable' ? 4.2 : 3) + i * 1.7);
      const base = state === 'clickable' ? 5.5 : state === 'solved' ? 4.5 : 3;
      const r = (base + (state === 'solved' ? 0 : pulse * (state === 'clickable' ? 1.4 : 1.1))) * dpr;
      const [x, y] = pt;
      if (state === 'clickable') this.screenPos.set(nd.name, { x, y });

      ctx.shadowColor = `rgba(${rgb}, 1)`;
      ctx.shadowBlur = (state === 'idle' ? 10 : 22) * dpr;
      ctx.fillStyle = `rgba(${rgb}, ${(state === 'solved' ? 1 : 0.7 + pulse * 0.25) * vis})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (state !== 'solved') {
        const ph = (t / (state === 'clickable' ? 1.3 : 1.8) + i * 0.33) % 1;
        ctx.strokeStyle = `rgba(${rgb}, ${(1 - ph) * 0.7 * vis})`;
        ctx.lineWidth = 1.4 * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r + ph * (state === 'clickable' ? 26 : 16) * dpr, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `rgba(${rgb}, ${0.55 * vis})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.arc(x, y, r + 5 * dpr, 0, Math.PI * 2);
        ctx.stroke();
      }
      // label
      const size = Math.round((state === 'clickable' ? 20 : 16) * dpr);
      ctx.font = `${size}px VT323, monospace`;
      const tw = ctx.measureText(nd.name).width;
      const left = x + r + 10 * dpr + tw > this.w;
      ctx.textAlign = left ? 'right' : 'left';
      ctx.fillStyle = state === 'solved' ? `rgba(200, 255, 170, ${vis})` : `rgba(255, 210, 160, ${vis})`;
      ctx.shadowColor = `rgba(${rgb}, 0.9)`;
      ctx.shadowBlur = (state === 'clickable' ? 10 : 4) * dpr;
      ctx.fillText(nd.name, x + (left ? -1 : 1) * (r + 10 * dpr), y);
      ctx.shadowBlur = 0;
    });
  }
}
