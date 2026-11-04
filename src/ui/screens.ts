import { CONFIG } from '../config';
import { h } from '../core/util';

export type ScreenName = 'start' | 'intro' | 'monitor' | 'end';

/** Builds the four top-level screens and switches between them. */
export class Screens {
  readonly beginBtn: HTMLButtonElement;
  readonly video: HTMLVideoElement;
  readonly soundHint: HTMLButtonElement;
  readonly monitorScreen: HTMLElement;
  private screens: Record<ScreenName, HTMLElement>;

  constructor(app: HTMLElement) {
    // START
    const start = h('div', 'screen screen-start', app);
    const title = h('h1', 'start-title', start);
    title.textContent = CONFIG.title;
    const sub = h('p', 'start-sub', start);
    sub.textContent = CONFIG.subtitle;
    this.beginBtn = h('button', 'begin-btn', start);
    this.beginBtn.textContent = CONFIG.beginLabel;

    // INTRO
    const intro = h('div', 'screen screen-intro', app);
    this.video = h('video', 'intro-video', intro);
    this.video.playsInline = true;
    this.video.controls = false;
    this.video.loop = false;
    this.video.preload = 'none';
    this.video.setAttribute('playsinline', '');
    this.soundHint = h('button', 'sound-hint', intro);
    this.soundHint.textContent = 'tap for sound';
    this.soundHint.hidden = true;
    this.soundHint.dataset.nofocus = '1';

    // MONITOR
    const monitor = h('div', 'screen screen-monitor', app);
    this.monitorScreen = monitor;

    // END
    const end = h('div', 'screen screen-end', app);
    const card = h('div', 'end-card', end);
    card.textContent = CONFIG.endCard;

    this.screens = { start, intro, monitor, end };
  }

  show(name: ScreenName) {
    (Object.keys(this.screens) as ScreenName[]).forEach((k) => {
      this.screens[k].classList.toggle('active', k === name);
    });
  }
}
