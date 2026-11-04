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

/** Light radio crackle: short high-passed noise with random pops. Returns a stop function. */
export function radioCrackle(a: AudioEngine, ms: number, peak: number): void {
  if (!a.ensure() || !a.master) return;
  const ctx = a.ctx!;
  const src = a.noiseSource();
  if (!src) return;
  const t = ctx.currentTime;
  const dur = ms / 1000;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  for (let x = 0.02; x < dur; x += 0.03 + Math.random() * 0.05) {
    const fade = 1 - x / dur;
    g.gain.setValueAtTime(Math.random() < 0.55 ? peak * fade * (0.4 + Math.random()) : peak * 0.12 * fade, t + x);
  }
  g.gain.setValueAtTime(0, t + dur);
  src.connect(hp).connect(g).connect(a.master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}
