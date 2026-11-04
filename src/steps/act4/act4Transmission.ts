import { CONFIG } from '../../config';
import type { Game, Step } from '../../core/stateMachine';
import { abortError, sleep } from '../../core/util';
import { enterMonitor } from '../common';
import { getTransmission, hideAllPanels, setHint } from '../../ui/transmission';
import { radioCrackle } from '../../sfx4';

const CANPLAY_TIMEOUT_MS = 4000;
const BINS = 32;

/** Plays the recovered transmission: audio-driven when possible, a virtual clock otherwise. */
export const act4TransmissionStep: Step = {
  id: 'act4Transmission',
  keepExtra: true, // our panel lives in mainExtra; relay.reset() would hide the container
  async enter(g: Game) {
    const { monitor } = g.ui;
    const T = CONFIG.act4.transmission;
    const tx = getTransmission(g);
    enterMonitor(g, 'green', true);
    g.inputLocked = true;
    setHint(g, null);
    hideAllPanels(g); // globe and Nova core make room for the panel
    tx.clear();
    monitor.core.setState('hidden');
    monitor.applyStage('network');
    monitor.setLight('green');
    tx.open();

    // ---- audio setup ----
    let audio: HTMLAudioElement | null = new Audio();
    audio.preload = 'auto';
    audio.src = T.src;
    let analyser: AnalyserNode | null = null;
    let source: MediaElementAudioSourceNode | null = null;
    const ctx = g.audio.ensure();
    if (ctx && g.audio.master) {
      try {
        source = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser).connect(g.audio.master);
      } catch {
        source = analyser = null;
      }
    }
    const routed = !!source;
    if (!routed) { audio.volume = 1; audio.muted = g.audio.muted; }
    g.audio.onMute((m) => { if (audio && !routed) audio.muted = m; });

    let virtual = false;
    let virtualStart = 0;
    let started = false;
    let endCrackled = false;
    let finished = false;
        let raf = 0;
    const freq = new Uint8Array(analyser?.frequencyBinCount ?? 0);
    const levels = new Array<number>(BINS).fill(0);
    let resolveEnd: () => void = () => {};
    const ended = new Promise<void>((res) => { resolveEnd = res; });

    const total = () => (!virtual && audio && isFinite(audio.duration) && audio.duration > 1 ? audio.duration : T.fallbackDurationS);
    const now = () => (virtual ? (performance.now() - virtualStart) / 1000 : audio?.currentTime ?? 0);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (finished) return;
      const dur = total();
      const t = Math.min(now(), dur);
      tx.render(t, dur);
      tx.setProgress(t, dur);
      if (started) {
        if (analyser && !virtual && audio && !audio.paused) {
          analyser.getByteFrequencyData(freq);
          // speech lives in the low bins: fold the first ~60% of them into BINS bars
          const use = Math.floor(freq.length * 0.6);
          for (let i = 0; i < BINS; i++) {
            let s = 0;
            const a = Math.floor((i / BINS) * use), b = Math.max(a + 1, Math.floor(((i + 1) / BINS) * use));
            for (let k = a; k < b; k++) s += freq[k];
            levels[i] = Math.min(1, (s / (b - a) / 255) * 1.5);
          }
        } else if (virtual) {
          for (let i = 0; i < BINS; i++) levels[i] = 0.12 + Math.random() * 0.6 * (0.5 + 0.5 * Math.sin(t * 5 + i * 0.5));
        } else levels.fill(0);
        tx.drawWave(levels);
        monitor.meter.setLevels(levels);
        if (!endCrackled && dur - t <= T.crackleMs / 1000 && t > 1) {
          endCrackled = true;
          radioCrackle(g.audio, T.crackleMs, T.crackleGain);
        }
        if (virtual && t >= dur) resolveEnd();
      }
    };

    const stopAll = () => {
      finished = true;
      cancelAnimationFrame(raf);
      monitor.meter.setLevels(null);
      if (audio) {
        audio.onended = audio.onerror = audio.oncanplay = null;
        try { audio.pause(); } catch { /* ignore */ }
      }
      try { source?.disconnect(); analyser?.disconnect(); } catch { /* ignore */ }
    };

    const useVirtual = () => {
      if (virtual || started) return;
      virtual = true;
      if (audio) {
        audio.onended = audio.onerror = audio.oncanplay = null;
        try { audio.pause(); } catch { /* ignore */ }
      }
      source?.disconnect();
      begin();
    };

    const begin = () => {
      if (started) return;
      started = true;
      virtualStart = performance.now();
      radioCrackle(g.audio, T.crackleMs, T.crackleGain);
    };

    // Skip: stop everything, show all cues, finish as if the audio ended.
    tx.skipButton?.addEventListener('click', () => resolveEnd());

    g.signal.addEventListener('abort', () => stopAll(), { once: true });

    raf = requestAnimationFrame(frame);
    try {
      // wait for the audio to be playable (or give up and use the virtual clock)
      const loaded = new Promise<void>((resolve, reject) => {
        const a = audio!;
        let settled = false;
        const settle = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(); } };
        const fail = () => { if (settled) return; useVirtual(); settle(); };
        const timer = setTimeout(fail, CANPLAY_TIMEOUT_MS);
        g.signal.addEventListener('abort', () => { clearTimeout(timer); reject(abortError()); }, { once: true });
        a.onerror = fail;
        a.onended = () => resolveEnd();
        a.oncanplay = () => {
          if (settled) return;
          a.oncanplay = null;
          a.play().then(() => { begin(); settle(); }, (e: unknown) => {
            if (e instanceof DOMException && e.name === 'NotAllowedError') {
              const btn = tx.addButton('▶ Tap to play transmission', () => {
                g.audio.ensure();
                a.play().then(() => { btn.remove(); begin(); }, () => { btn.remove(); useVirtual(); });
              });
              settle();
            } else fail();
          });
        };
        a.load();
      });
      const aborted = new Promise<never>((_, reject) => g.signal.addEventListener('abort', () => reject(abortError()), { once: true }));
      aborted.catch(() => {});
      await Promise.race([loaded, ended, aborted]);
      await Promise.race([ended, aborted]);
      stopAll();
      cancelAnimationFrame(raf);
      monitor.meter.setLevels(null);
      tx.finish();
      await sleep(T.endHoldMs, g.signal);
      g.goto('act4End');
    } finally {
      stopAll();
    }
  },
};
