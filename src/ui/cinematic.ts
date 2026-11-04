import { CONFIG } from '../config';
import type { Cue, Line } from '../config';
import type { AudioEngine } from '../core/audio';
import type { Dialogue } from '../core/dialogue';
import type { Subtitles } from './subtitles';
import { abortError, h, sleep } from '../core/util';

export interface SceneOpts {
  src: string;
  /** Seconds into the video when `lines` start. */
  startAt: number;
  lines: Line[];
  /** Played on the held last frame once both video and `lines` are done. */
  after?: Line[];
  /** Subtitle cues keyed to the video's currentTime. */
  cues?: Cue[];
  signal: AbortSignal;
}

/** Rejects with AbortError when the signal fires; otherwise follows `p`. */
function abortable<T>(p: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
      (e) => { signal.removeEventListener('abort', onAbort); reject(e); },
    );
  });
}

/** Full-screen video player for the Act 2 scenes. One shared <video>, ducked under narration. */
export class Cinematic {
  readonly video: HTMLVideoElement;
  private root: HTMLElement;
  private scene = 0; // token: stale cleanup from an aborted scene must not touch a newer one
  private rampId = 0;
  private preloads: HTMLVideoElement[] = [];

  constructor(app: HTMLElement, private audio: AudioEngine, private dialogue: Dialogue, private subtitles: Subtitles) {
    this.root = h('div', 'cine', app);
    this.video = h('video', 'cine-video', this.root);
    this.video.playsInline = true;
    this.video.controls = false;
    this.video.loop = false;
    this.video.preload = 'auto';
    this.video.setAttribute('playsinline', '');
    audio.addVideo(this.video);
  }

  /** Warm the HTTP cache with hidden video elements. */
  preload(srcs: string[]) {
    for (const src of srcs) {
      if (this.preloads.some((v) => v.getAttribute('src') === src)) continue;
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.setAttribute('playsinline', '');
      v.src = src;
      v.load();
      this.preloads.push(v);
    }
  }

  get visible() { return this.root.style.display === 'flex'; }

  /** Show instantly over everything below, with the video itself fading in from black. */
  private show() {
    const v = this.video;
    this.root.style.transition = 'none';
    this.root.style.opacity = '1';
    this.root.style.display = 'flex';
    v.style.transition = 'none';
    v.style.opacity = '0';
    void v.offsetWidth;
    v.style.transition = `opacity ${CONFIG.act2.videoFadeMs}ms linear`;
    v.style.opacity = '1';
  }

  /** Pause and hide immediately. Safe to call any time. */
  hide() {
    this.scene++;
    this.subtitles.hide();
    this.rampId++;
    this.video.pause();
    this.video.onended = null;
    this.video.onerror = null;
    this.root.style.display = 'none';
  }

  /** Fade the whole player out (revealing what is underneath), then hide. */
  async fadeOut(ms: number, signal: AbortSignal) {
    this.root.style.transition = `opacity ${ms}ms linear`;
    this.root.style.opacity = '0';
    await sleep(ms, signal);
    this.hide();
  }

  private ramp(to: number, ms: number) {
    const id = ++this.rampId;
    const from = this.video.volume;
    const start = performance.now();
    const tick = (now: number) => {
      if (id !== this.rampId) return;
      const k = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
      try { this.video.volume = from + (to - from) * k; } catch { /* ignore */ }
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Play one scene: video with its own audio, Nova's lines ducked over it from `startAt`,
   * last frame held until the narration is done. Aborts cleanly; failures fall back to black.
   */
  async playScene(o: SceneOpts): Promise<void> {
    const { signal } = o;
    const v = this.video;
    const A = CONFIG.act2;
    const token = ++this.scene;
    this.rampId++;
    this.show();
    v.muted = this.audio.muted;
    try { v.volume = 1; } catch { /* ignore */ }

    let failed = false;
    let fireNarration!: () => void;
    const narrationGo = new Promise<void>((res) => { fireNarration = res; });
    let finishVideo!: () => void;
    const videoDone = new Promise<void>((res) => { finishVideo = res; });
    const fail = () => { failed = true; fireNarration(); finishVideo(); };

    v.onended = () => { fireNarration(); finishVideo(); };
    v.onerror = fail;
    v.src = o.src;
    v.load();
    v.currentTime = 0;
    const started = v.play();
    if (started) {
      started.catch(() => {
        if (token !== this.scene) return;
        v.muted = true; // autoplay policy: retry silently
        v.play().catch(fail);
      });
    }

    // Subtitle cues follow the video clock (act2.mp4 only).
    if (o.cues?.length) {
      const cueTick = () => {
        if (token !== this.scene || signal.aborted || v.ended) return this.subtitles.hide();
        const t = v.currentTime;
        const cue = o.cues!.find((c) => t >= c.start && t < c.end);
        if (cue) this.subtitles.show(cue.text, cue.speaker ?? 'survivor', { video: true, prefix: true });
        else this.subtitles.hide();
        requestAnimationFrame(cueTick);
      };
      requestAnimationFrame(cueTick);
    }

    // Trigger narration when playback reaches startAt (rAF poll; timeupdate is too coarse).
    const poll = () => {
      if (token !== this.scene || signal.aborted || failed) return;
      if (v.currentTime >= o.startAt) return fireNarration();
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);

    if (CONFIG.videoVoiceBaked) {
      // Voice is in the video: full volume, no ducking, no narration lines.
      try {
        await abortable(videoDone, signal);
        if (failed) await sleep(CONFIG.timing.noAudioMinMs, signal);
      } catch (e) {
        if (token === this.scene) this.hide();
        throw e;
      }
      return;
    }

    try {
      const narration = (async () => {
        await abortable(narrationGo, signal);
        this.ramp(A.duckLevel, A.duckFadeMs);
        await this.dialogue.play(o.lines, signal, { typeOnTerminal: false });
        this.ramp(1, A.duckFadeMs);
      })();
      await Promise.all([narration, abortable(videoDone, signal)]);
      if (o.after?.length) await this.dialogue.play(o.after, signal, { typeOnTerminal: false });
    } catch (e) {
      if (token === this.scene) this.hide();
      throw e;
    }
  }
}
