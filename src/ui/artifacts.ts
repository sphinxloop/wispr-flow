import { CONFIG } from '../config';
import type { ArtifactId, Line } from '../config';
import { h, place } from '../core/util';
import { ART } from './evidenceArt';

const ICONS: Record<ArtifactId, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  badge: '<rect x="6" y="6" width="12" height="16" rx="2"/><path d="M10 3h4v3h-4zM9 12h6M9 16h6"/>',
};

export interface ArtifactHooks {
  play: (line: Line, signal: AbortSignal) => Promise<void>;
  onSeen: (id: ArtifactId) => void;
  onClose: () => void; // refocus the voice input
}

/** Clickable evidence hotspots on the monitor + full-screen close-ups. */
export class Artifacts {
  private spots = new Map<ArtifactId, HTMLButtonElement>();
  private overlay: HTMLElement | null = null;
  private ctl: AbortController | null = null;
  private hooks!: ArtifactHooks;

  constructor(private stage: HTMLElement, private app: HTMLElement) {
    (Object.keys(CONFIG.evidence) as ArtifactId[]).forEach((id) => {
      const b = h('button', 'hotspot hidden', stage);
      b.dataset.nofocus = '1';
      b.dataset.id = id;
      place(b, CONFIG.layout.artifacts[id]);
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg><span>${CONFIG.evidence[id].label}</span>`;
      b.addEventListener('click', () => this.open(id));
      this.spots.set(id, b);
    });
  }

  setHooks(hooks: ArtifactHooks) { this.hooks = hooks; }

  show() { this.spots.forEach((b) => b.classList.remove('hidden')); }

  /** Hide hotspots and close any open close-up. */
  hide() {
    this.spots.forEach((b) => b.classList.add('hidden'));
    this.closeUp();
  }

  setIntensity(level: 'normal' | 'bright') {
    this.spots.forEach((b) => { b.dataset.intensity = level; });
  }

  get isOpen() { return !!this.overlay; }

  /** Stop the close-up's survivor line (if playing) without closing it. */
  cancelLine() {
    this.ctl?.abort();
    this.ctl = null;
  }

  open(id: ArtifactId) {
    this.closeUp();
    const art = ART[id];
    const o = h('div', 'closeup', this.app);
    const holder = h('div', 'closeup-art', o);
    holder.style.setProperty('--aspect', String(art.aspect));
    holder.innerHTML = art.svg();
    h('div', 'closeup-warm', o);
    h('div', 'closeup-grain', o);
    h('div', 'closeup-vignette', o);
    const back = h('button', 'back-btn', o);
    back.dataset.nofocus = '1';
    back.textContent = CONFIG.backLabel;
    back.addEventListener('click', () => {
      this.closeUp();
      this.hooks.onClose();
    });
    this.overlay = o;
    this.hooks.onSeen(id);
    this.ctl = new AbortController();
    this.hooks.play(CONFIG.evidence[id].line, this.ctl.signal).catch(() => {});
  }

  closeUp() {
    this.cancelLine();
    this.overlay?.remove();
    this.overlay = null;
  }
}
