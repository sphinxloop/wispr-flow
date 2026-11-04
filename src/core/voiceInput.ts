import { CONFIG } from '../config';
import { h, isCoarse, place } from './util';
import { normalize } from './normalize';
import type { Sfx } from './audio';

/**
 * The voice box. Dictation (Wispr Flow) inserts a whole phrase in ONE input
 * event; real typing adds 1-2 chars per event. We tell them apart by size.
 */
export class VoiceInput {
  readonly el: HTMLInputElement;
  private warn: HTMLElement;
  private prevLen = 0;
  private submitTimer = 0;
  private warnTimer = 0;
  private active = false;
  private coarse = isCoarse();
  onSubmit: (raw: string, normalized: string) => void = () => {};

  constructor(stage: HTMLElement, private sfx: Sfx, private isLocked: () => boolean) {
    this.el = h('input', 'voice-input', stage);
    this.el.type = 'text';
    this.el.placeholder = '● listening — hold your Wispr Flow key';
    this.el.autocomplete = 'off';
    this.el.autocapitalize = 'off';
    this.el.spellcheck = false;
    this.el.setAttribute('aria-label', 'Voice input');
    this.el.setAttribute('autocorrect', 'off');
    place(this.el, CONFIG.layout.voiceInput);
    this.warn = h('div', 'voice-warn', stage);
    place(this.warn, { ...CONFIG.layout.voiceInput, top: CONFIG.layout.voiceInput.top - 7, height: 6 });

    this.el.addEventListener('input', () => this.onInput());
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault(); // voice only
    });
    this.el.addEventListener('blur', () => {
      if (this.active && !this.coarse) setTimeout(() => this.focus(), 0);
    });
    document.addEventListener('click', (e) => {
      if (!this.active) return;
      const t = e.target as HTMLElement;
      if (t.closest('[data-nofocus]')) return;
      if (this.coarse && !t.closest('.stage')) return;
      this.focus();
    });
  }

  /** Visible and (on desktop) permanently focused while true. */
  setActive(on: boolean) {
    this.active = on;
    this.el.classList.toggle('inactive', !on);
    if (on) this.focus();
    else this.reset();
  }

  focus() {
    if (!this.active) return;
    try { this.el.focus({ preventScroll: true }); } catch { /* ignore */ }
  }

  /** Clear text and cancel any pending submit. */
  private lastVoiceAt = -1e9;

  reset() {
    clearTimeout(this.submitTimer);
    this.el.value = '';
    this.prevLen = 0;
  }

  private onInput() {
    const len = this.el.value.length;
    const added = len - this.prevLen;
    this.prevLen = len;
    if (this.isLocked() || !this.active) return this.reset();
    const now = performance.now();
    // Small follow-ups right after a voice insert (e.g. a trailing space) are part of it.
    const inGrace = now - this.lastVoiceAt < 600;
    if (added >= CONFIG.timing.minVoiceChars || (added >= 1 && inGrace)) {
      if (added >= CONFIG.timing.minVoiceChars) this.lastVoiceAt = now;
      clearTimeout(this.submitTimer);
      this.submitTimer = window.setTimeout(() => this.submit(), CONFIG.timing.autoSubmitMs);
    } else if (added >= 1) {
      this.reset();
      this.sfx.glitch();
      this.flashWarning();
    } else if (!len) {
      clearTimeout(this.submitTimer);
    }
  }

  private flashWarning() {
    this.warn.textContent = CONFIG.screens.keyboardDestroyed;
    this.warn.classList.add('on');
    clearTimeout(this.warnTimer);
    this.warnTimer = window.setTimeout(() => this.warn.classList.remove('on'), 1500);
  }

  private submit() {
    const raw = this.el.value.trim();
    this.reset();
    if (!raw || this.isLocked()) return;
    this.onSubmit(raw, normalize(raw));
  }
}
