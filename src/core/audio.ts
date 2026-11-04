// One AudioContext, one master gain, and all procedural sound effects.

export interface Handle { stop(): void; fadeOut(ms: number): void }

export class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  muted = false;
  private videos: HTMLVideoElement[] = [];
  private noise: AudioBuffer | null = null;
  private listeners: Array<(muted: boolean) => void> = [];

  /** Lazily create the context. Safe to call repeatedly. */
  ensure(): AudioContext | null {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  addVideo(v: HTMLVideoElement) { this.videos.push(v); }
  onMute(fn: (muted: boolean) => void) { this.listeners.push(fn); }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
    this.videos.forEach((v) => { v.muted = this.muted; });
    this.listeners.forEach((f) => f(this.muted));
    return this.muted;
  }

  /** Shared 2s white-noise buffer. */
  noiseBuffer(): AudioBuffer | null {
    const ctx = this.ensure();
    if (!ctx) return null;
    if (!this.noise) {
      const n = ctx.sampleRate * 2;
      this.noise = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  noiseSource(): AudioBufferSourceNode | null {
    const buf = this.noiseBuffer();
    if (!buf || !this.ctx) return null;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    return s;
  }
}

const nullHandle: Handle = { stop() {}, fadeOut() {} };

export class Sfx {
  constructor(private a: AudioEngine) {}

  private env(g: GainNode, t: number, peak: number, attack: number, hold: number, release: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.linearRampToValueAtTime(0, t + attack + hold + release);
  }

  /** Harsh feedback squeal (~0.4s), then hard silence. */
  screech(): void {
    const ctx = this.a.ensure();
    if (!ctx || !this.a.master) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.connect(this.a.master);
    this.env(out, t, 0.28, 0.01, 0.35, 0.02);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 6;
    bp.connect(out);
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(2600, t);
    o1.frequency.exponentialRampToValueAtTime(3900, t + 0.35);
    const o2 = ctx.createOscillator();
    o2.type = 'square';
    o2.frequency.setValueAtTime(4150, t);
    o2.frequency.linearRampToValueAtTime(3500, t + 0.35);
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;
    o1.connect(bp);
    o2.connect(g2).connect(bp);
    const n = this.a.noiseSource();
    if (n) {
      const ng = ctx.createGain();
      ng.gain.value = 0.25;
      n.connect(ng).connect(bp);
      n.start(t);
      n.stop(t + 0.4);
    }
    o1.start(t);
    o2.start(t);
    o1.stop(t + 0.4);
    o2.stop(t + 0.4);
  }

  /** Deep filtered noise + low sine. Auto-stops after durationMs. */
  rumble(durationMs: number): Handle {
    const ctx = this.a.ensure();
    const n = this.a.noiseSource();
    if (!ctx || !n || !this.a.master) return nullHandle;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(0.9, t + 0.4);
    out.connect(this.a.master);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 110;
    const ng = ctx.createGain();
    ng.gain.value = 0.9;
    n.connect(lp).connect(ng).connect(out);
    const sine = ctx.createOscillator();
    sine.type = 'sine';
    sine.frequency.value = 42;
    const sg = ctx.createGain();
    sg.gain.value = 0.35;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.8;
    const lg = ctx.createGain();
    lg.gain.value = 0.12;
    lfo.connect(lg).connect(sg.gain);
    sine.connect(sg).connect(out);
    n.start(t);
    sine.start(t);
    lfo.start(t);
    let done = false;
    const stopAll = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const s of [n, sine, lfo]) {
        try { s.stop(); } catch { /* already stopped */ }
      }
    };
    const fadeOut = (ms: number) => {
      if (done) return;
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + ms / 1000);
      setTimeout(stopAll, ms + 50);
    };
    const timer = setTimeout(() => fadeOut(800), durationMs);
    return { stop: stopAll, fadeOut };
  }

  /** Soft sine sweep up (~1.5s). */
  risingTone(): void {
    const ctx = this.a.ensure();
    if (!ctx || !this.a.master) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    this.env(g, t, 0.13, 1.1, 0.1, 0.5);
    g.connect(this.a.master);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 1.5);
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(330, t);
    o2.frequency.exponentialRampToValueAtTime(1320, t + 1.5);
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o.connect(g);
    o2.connect(g2).connect(g);
    o.start(t);
    o2.start(t);
    o.stop(t + 1.8);
    o2.stop(t + 1.8);
  }

  /** Short bitcrushed noise blip. */
  glitch(): void {
    const ctx = this.a.ensure();
    if (!ctx || !this.a.master) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.14);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let held = 0;
    for (let i = 0; i < len; i++) {
      if (i % 10 === 0) held = Math.round((Math.random() * 2 - 1) * 4) / 4; // sample-and-hold + 2-bit
      d[i] = held * (1 - i / len);
    }
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    s.connect(g).connect(this.a.master);
    s.start(t);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    const og = ctx.createGain();
    this.env(og, t, 0.08, 0.005, 0.03, 0.07);
    o.connect(og).connect(this.a.master);
    o.start(t);
    o.stop(t + 0.15);
  }

  /** Rising buzz ending in a thump. */
  powerSurge(): void {
    const ctx = this.a.ensure();
    if (!ctx || !this.a.master) return;
    const t = ctx.currentTime;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(2400, t + 1.2);
    const g = ctx.createGain();
    this.env(g, t, 0.16, 1.0, 0.2, 0.5);
    lp.connect(g).connect(this.a.master);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(50, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 1.2);
    o.connect(lp);
    o.start(t);
    o.stop(t + 1.9);
    const th = ctx.createOscillator();
    th.type = 'sine';
    th.frequency.setValueAtTime(80, t + 1.15);
    th.frequency.exponentialRampToValueAtTime(28, t + 1.7);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t);
    tg.gain.setValueAtTime(0.6, t + 1.15);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    th.connect(tg).connect(this.a.master);
    th.start(t);
    th.stop(t + 1.9);
  }

  /** Short low thud for the SEALED stamp. */
  stamp(): void {
    const ctx = this.a.ensure();
    if (!ctx || !this.a.master) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(this.a.master);
    o.start(t);
    o.stop(t + 0.35);
    const n = this.a.noiseSource();
    if (n) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.35, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      n.connect(lp).connect(ng).connect(this.a.master);
      n.start(t);
      n.stop(t + 0.15);
    }
  }

  /** Heavy mechanical unlock: low thunk, metallic clank, then a hiss. */
  unlock(): void {
    const ctx = this.a.ensure();
    if (!ctx || !this.a.master) return;
    const t = ctx.currentTime;
    const master = this.a.master;
    // thunk
    const th = ctx.createOscillator();
    th.type = 'sine';
    th.frequency.setValueAtTime(95, t);
    th.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.8, t);
    tg.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    th.connect(tg).connect(master);
    th.start(t);
    th.stop(t + 0.45);
    // clank: filtered noise burst + resonant ~120Hz sine
    const clankAt = t + 0.12;
    const n = this.a.noiseSource();
    if (n) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.55, clankAt);
      ng.gain.exponentialRampToValueAtTime(0.001, clankAt + 0.18);
      n.connect(bp).connect(ng).connect(master);
      n.start(clankAt);
      n.stop(clankAt + 0.22);
    }
    const ring = ctx.createOscillator();
    ring.type = 'sine';
    ring.frequency.value = 120;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.5, clankAt);
    rg.gain.exponentialRampToValueAtTime(0.001, clankAt + 0.7);
    ring.connect(rg).connect(master);
    ring.start(clankAt);
    ring.stop(clankAt + 0.75);
    // hiss
    const hissAt = t + 0.35;
    const hn = this.a.noiseSource();
    if (hn) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3500;
      const hg = ctx.createGain();
      hg.gain.setValueAtTime(0.0001, hissAt);
      hg.gain.linearRampToValueAtTime(0.14, hissAt + 0.15);
      hg.gain.exponentialRampToValueAtTime(0.001, hissAt + 0.9);
      hn.connect(hp).connect(hg).connect(master);
      hn.start(hissAt);
      hn.stop(hissAt + 0.95);
    }
  }

  /** Filtered noise whir that spins up and then loops softly. */
  fans(): Handle {
    const ctx = this.a.ensure();
    const n = this.a.noiseSource();
    if (!ctx || !n || !this.a.master) return nullHandle;
    const t = ctx.currentTime;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(150, t);
    bp.frequency.exponentialRampToValueAtTime(700, t + 2.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 2.5);
    g.gain.linearRampToValueAtTime(0.045, t + 5);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lg = ctx.createGain();
    lg.gain.value = 0.01;
    lfo.connect(lg).connect(g.gain);
    n.connect(bp).connect(g).connect(this.a.master);
    n.start(t);
    lfo.start(t);
    let done = false;
    const stop = () => {
      if (done) return;
      done = true;
      for (const s of [n, lfo]) {
        try { s.stop(); } catch { /* already stopped */ }
      }
    };
    return {
      stop,
      fadeOut: (ms) => {
        const now = ctx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0, now + ms / 1000);
        setTimeout(stop, ms + 50);
      },
    };
  }
}
