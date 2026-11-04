import { CONFIG } from '../config';
import type { Speaker } from '../config';
import { h } from '../core/util';

/** Bottom-center subtitle bar, fixed to the viewport. Silent unless CONFIG.subtitlesEnabled. */
export class Subtitles {
  private bar: HTMLElement;
  private text: HTMLElement;
  private current = '';

  constructor(parent: HTMLElement) {
    this.bar = h('div', 'subtitles', parent);
    this.text = h('span', 'subtitle-text', this.bar);
  }

  show(text: string, speaker: Speaker = 'survivor') {
    if (!CONFIG.subtitlesEnabled) return;
    const key = speaker + text;
    if (key === this.current) return;
    this.current = key;
    this.text.textContent = text;
    this.bar.className = `subtitles on ${speaker}`;
  }

  hide() {
    this.current = '';
    this.bar.classList.remove('on');
  }
}
