import { CONFIG } from '../config';
import type { Line } from '../config';
import type { AudioEngine } from './audio';
import type { Subtitles } from '../ui/subtitles';
import type { Monitor } from '../ui/monitor';
import { abortError, sleep } from './util';

const LOAD_TIMEOUT_MS = 2500;

export interface PlayOpts {
  /** false: Nova's text is appended to the log instantly instead of typed (video scenes). */
  typeOnTerminal?: boolean;
}

function distortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

/** Plays dialogue lines: audio if present, otherwise a timed wait (subtitles only if enabled). Never throws on missing audio. */
export class Dialogue {
  private cache = new Map<string, AudioBuffer | null>(); // null = missing

  constructor(private audio: AudioEngine, private subtitles: Subtitles, private monitor: Monitor) {}

  /** Plays lines in order. Rejects with AbortError if the signal fires (after cleaning up). */
  async play(lines: Line[], signal: AbortSignal, opts: PlayOpts = {}): Promise<void> {
    // Hide synchronously on abort so a follow-up line is never wiped by a late cleanup.
    const onAbort = () => this.subtitles.hide();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      for (const line of lines) {
        if (signal.aborted) throw abortError();
        await this.playLine(line, signal, opts.typeOnTerminal !== false);
        await sleep(CONFIG.timing.lineGapMs, signal);
      }
    } finally {
      signal.removeEventListener('abort', onAbort);
      if (!signal.aborted) this.subtitles.hide();
    }
  }

  private async playLine(line: Line, signal: AbortSignal, typeOnTerminal: boolean): Promise<void> {
    const buffer = await this.load(line.id, signal);
    if (signal.aborted) throw abortError();

    const nova = line.speaker === 'nova';
    this.subtitles.show(line.text, line.speaker);
    let typing: Promise<void> = Promise.resolve();
    if (nova) {
      const full = CONFIG.screens.novaPrefix + line.text;
      if (typeOnTerminal) typing = this.monitor.typeLines([full], { signal });
      else this.monitor.appendLine(full);
    }
    typing.catch(() => {});

    const speakTok = nova ? this.monitor.core.beginSpeak() : 0;
    try {
      const playing = buffer && this.canPlay() ? this.playBuffer(buffer, nova, signal) : null;
      if (playing) {
        await Promise.all([playing, typing]);
      } else {
        const ms = CONFIG.timing.noAudioBaseMs + line.text.length * CONFIG.timing.noAudioPerCharMs;
        await Promise.all([sleep(ms, signal), typing]);
      }
    } finally {
      if (nova) this.monitor.core.endSpeak(speakTok);
    }
  }

  private canPlay(): boolean {
    const ctx = this.audio.ensure();
    return !!ctx && ctx.state === 'running' && !!this.audio.master;
  }

  /** Fetch + decode, cached. Resolves null on any problem. */
  private async load(id: string, signal: AbortSignal): Promise<AudioBuffer | null> {
    if (this.cache.has(id)) return this.cache.get(id) ?? null;
    const ctx = this.audio.ensure();
    if (!ctx) return null;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), LOAD_TIMEOUT_MS);
    const onAbort = () => ctl.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    try {
      const res = await fetch(`${CONFIG.paths.audioDir}${id}.mp3`, { signal: ctl.signal });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || type.includes('text/html')) {
        this.cache.set(id, null);
        return null;
      }
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      this.cache.set(id, buf);
      return buf;
    } catch {
      if (!signal.aborted) this.cache.set(id, null); // timeouts/decode errors count as missing
      return null;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
    }
  }

  private playBuffer(buf: AudioBuffer, nova: boolean, signal: AbortSignal): Promise<void> {
    const ctx = this.audio.ctx!;
    const master = this.audio.master!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const nodes: AudioNode[] = [src];
    let staticSrc: AudioBufferSourceNode | null = null;

    if (nova) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = CONFIG.audio.novaBandLowHz;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = CONFIG.audio.novaBandHighHz;
      const ws = ctx.createWaveShaper();
      if (CONFIG.audio.novaDistortion > 0) ws.curve = distortionCurve(CONFIG.audio.novaDistortion);
      const out = ctx.createGain();
      out.gain.value = 0.9;
      src.connect(hp).connect(lp).connect(ws).connect(out).connect(master);
      nodes.push(hp, lp, ws, out);
      // Tap the Nova chain so the core visual can follow the voice.
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      out.connect(an);
      nodes.push(an);
      this.monitor.core.setAnalyser(an);
      staticSrc = this.audio.noiseSource();
      if (staticSrc) {
        const sg = ctx.createGain();
        sg.gain.value = CONFIG.audio.novaStaticGain;
        staticSrc.connect(sg).connect(master);
        nodes.push(sg);
        staticSrc.start();
      }
    } else {
      src.connect(master);
    }

    return new Promise<void>((resolve, reject) => {
      let finished = false;
      const cleanup = () => {
        clearTimeout(fallback);
        signal.removeEventListener('abort', onAbort);
        try { src.stop(); } catch { /* not started */ }
        try { staticSrc?.stop(); } catch { /* not started */ }
        nodes.forEach((n) => n.disconnect());
      };
      const done = () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve();
      };
      const onAbort = () => {
        if (finished) return;
        finished = true;
        cleanup();
        this.subtitles.hide();
        reject(abortError());
      };
      const fallback = setTimeout(done, buf.duration * 1000 + 1000);
      src.onended = done;
      signal.addEventListener('abort', onAbort, { once: true });
      src.start();
    });
  }
}
