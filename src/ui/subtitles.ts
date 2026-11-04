import { CONFIG } from '../config';
import type { Speaker } from '../config';
import { h } from '../core/util';

export interface SubtitleOpts {
  /** true: over a full-screen video (sits lower than above the terminal prompt bar). */
  video?: boolean;
  /** Video cues from Nova get the amber NOVA: prefix. */
  prefix?: boolean;
}

/** Bottom-center subtitle bar, fixed to the viewport. Silent unless CONFIG.subtitlesEnabled. */
export class Subtitles {
  private bar: HTMLElement;
  private text: HTMLElement;
  private inner: HTMLElement;
  private current = '';

  constructor(parent: HTMLElement) {
    this.bar = h('div', 'subtitles', parent);
    this.bar.style.setProperty('--sub-fade', `${CONFIG.subtitleFadeMs}ms`);
    this.bar.setAttribute('aria-hidden', 'true');
    this.text = h('span', 'subtitle-text', this.bar);
    this.inner = h('span', 'subtitle-inner', this.text);
  }

  show(text: string, speaker: Speaker = 'survivor', opts: SubtitleOpts = {}) {
    if (!CONFIG.subtitlesEnabled) return;
    const key = `${speaker}|${opts.video ? 1 : 0}|${text}`;
    if (key === this.current) return;
    this.current = key;
    this.inner.textContent = '';
    if (opts.prefix && speaker === 'nova') {
      const p = h('span', 'subtitle-prefix', this.inner);
      p.textContent = CONFIG.subtitleNovaPrefix + ' ';
    }
    this.inner.append(document.createTextNode(text));
    this.bar.className = `subtitles on ${speaker}${opts.video ? ' over-video' : ''}`;
  }

  hide() {
    this.current = '';
    this.bar.classList.remove('on');
  }
}
