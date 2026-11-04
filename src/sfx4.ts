// Act 4 sound effects, built on the shared AudioEngine context + master gain.
import type { AudioEngine } from './core/audio';

function tone(a: AudioEngine, type: OscillatorType, f0: number, f1: number, start: number, dur: number, peak: number) {
  const ctx = a.ctx!;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, start);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(peak, start + 0.01);
  g.gain.setValueAtTime(peak, start + Math.max(0.011, dur - 0.04));
  g.gain.linearRampToValueAtTime(0, start + dur);
  o.connect(g).connect(a.master!);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Two-tone alarm, 3 short pulses (~1.2s). */
export function alarmBeep(a: AudioEngine): void {
  if (!a.ensure() || !a.master) return;
  const t = a.ctx!.currentTime + 0.02;
  for (let i = 0; i < 3; i++) {
    tone(a, 'square', 880, 880, t + i * 0.4, 0.13, 0.07);
    tone(a, 'square', 660, 660, t + i * 0.4 + 0.15, 0.13, 0.07);
  }
}

/** Very quiet typewriter tick. */
export function letterTick(a: AudioEngine): void {
  if (!a.ctx || !a.master || a.ctx.state !== 'running') return;
  const t = a.ctx.currentTime;
  tone(a, 'square', 1500 + Math.random() * 500, 900, t, 0.018, 0.012);
}

/** Rising whoosh + confirm blips. */
export function sentWhoosh(a: AudioEngine): void {
  if (!a.ensure() || !a.master) return;
  const ctx = a.ctx!;
  const t = ctx.currentTime;
  const src = a.noiseSource();
  if (src) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(3500, t + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.3);
    g.gain.linearRampToValueAtTime(0, t + 0.8);
    src.connect(bp).connect(g).connect(a.master);
    src.start(t);
    src.stop(t + 0.85);
  }
  tone(a, 'sine', 660, 660, t + 0.6, 0.12, 0.08);
  tone(a, 'sine', 990, 990, t + 0.74, 0.2, 0.08);
}
