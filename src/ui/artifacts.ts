import { CONFIG } from '../config';
import type { ArtifactId, Line } from '../config';
import { h, sleep } from '../core/util';
import type { PlayOpts } from '../core/dialogue';
import { ART } from './evidenceArt';

const ICONS: Record<ArtifactId, string> = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  badge: '<rect x="6" y="6" width="12" height="16" rx="2"/><path d="M10 3h4v3h-4zM9 12h6M9 16h6"/>',
};

export interface ArtifactHooks {
  play: (line: Line, signal: AbortSignal, opts?: PlayOpts) => Promise<void>;
  onSeen: (id: ArtifactId) => void;
  onClose: () => void; // refocus the voice input
}

/** Evidence tiles in the terminal's side panel + full-screen close-ups. */
export class Artifacts {
  private tiles = new Map<ArtifactId, HTMLButtonElement>();
  private overlay: HTMLElement | null = null;
  private ctl: AbortController | null = null;
  private hooks!: ArtifactHooks;
  private extras = new Set<HTMLElement>(); // blink lids + flying clones of the reveal sequence

  constructor(private panel: HTMLElement, list: HTMLElement, private app: HTMLElement) {
    (Object.keys(CONFIG.evidence) as ArtifactId[]).forEach((id) => {
      const b = h('button', 'tile', list);
      b.dataset.nofocus = '1';
      b.dataset.id = id;
      b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg><span>${CONFIG.evidence[id].label}</span>`;
      b.addEventListener('click', () => this.open(id));
      this.tiles.set(id, b);
    });
  }

  setHooks(hooks: ArtifactHooks) { this.hooks = hooks; }

  show() { this.panel.classList.remove('hidden'); }

  /** Hide the evidence panel and close any open close-up. */
  hide() {
    this.panel.classList.add('hidden');
    this.closeUp();
    this.clearReveal();
  }

  setIntensity(level: 'normal' | 'bright') {
    this.tiles.forEach((b) => { b.dataset.intensity = level; });
  }

  get isOpen() { return !!this.overlay; }

  /** Stop the close-up's survivor line (if playing) without closing it. */
  cancelLine() {
    this.ctl?.abort();
    this.ctl = null;
  }

  private build(id: ArtifactId, withBack: boolean): HTMLElement {
    const art = ART[id];
    const o = h('div', 'closeup', this.app);
    const holder = h('div', 'closeup-art', o);
    holder.style.setProperty('--aspect', String(art.aspect));
    holder.innerHTML = art.svg();
    h('div', 'closeup-warm', o);
    h('div', 'closeup-grain', o);
    h('div', 'closeup-vignette', o);
    if (withBack) {
      const back = h('button', 'back-btn', o);
      back.dataset.nofocus = '1';
      back.textContent = CONFIG.backLabel;
      back.addEventListener('click', () => {
        this.closeUp();
        this.hooks.onClose();
      });
    }
    this.overlay = o;
    this.hooks.onSeen(id);
    return o;
  }

  open(id: ArtifactId) {
    this.closeUp();
    this.build(id, true);
    this.ctl = new AbortController();
    this.hooks.play(CONFIG.evidence[id].line, this.ctl.signal).catch(() => {});
  }

  // ---------- evidence reveal sequence ----------

  private track<T extends HTMLElement>(el: T): T { this.extras.add(el); return el; }
  private untrack(el: HTMLElement) { el.remove(); this.extras.delete(el); }

  /** Remove the blink lids, close-up and flying clones immediately (abort-safe). */
  clearReveal() {
    this.extras.forEach((e) => e.remove());
    this.extras.clear();
  }

  /** Eyelids close, `mid` runs while shut, eyelids open. */
  private async blink(mid: () => void, signal: AbortSignal) {
    const half = CONFIG.evidenceReveal.blinkMs / 2;
    const lids = this.track(h('div', 'blink-lids', this.app));
    const top = h('div', 'blink-lid top', lids);
    const bottom = h('div', 'blink-lid bottom', lids);
    const run = (from: [string, string], to: [string, string], easing: string) => {
      top.animate([{ transform: from[0] }, { transform: to[0] }], { duration: half, easing, fill: 'forwards' });
      bottom.animate([{ transform: from[1] }, { transform: to[1] }], { duration: half, easing, fill: 'forwards' });
    };
    run(['translateY(-102%)', 'translateY(102%)'], ['translateY(0)', 'translateY(0)'], 'ease-in');
    await sleep(half, signal);
    mid();
    await sleep(60, signal);
    run(['translateY(0)', 'translateY(0)'], ['translateY(-102%)', 'translateY(102%)'], 'ease-out');
    await sleep(half, signal);
    this.untrack(lids);
  }

  /** Blink → close-up (no Back) → its line, for each artifact; then the close-ups fly into the tiles. */
  async reveal(signal: AbortSignal) {
    const R = CONFIG.evidenceReveal;
    for (const id of R.order) {
      await this.blink(() => { this.closeUp(); this.build(id, false); }, signal);
      const line = CONFIG.evidence[id].line;
      await this.hooks.play(line, signal, { noAudioMs: R.holdNoAudioMs });
      await sleep(R.holdAfterLineMs, signal);
    }
    this.show(); // tiles become visible
    await sleep(60, signal);
    await this.flyToTiles(signal);
  }

  private async flyToTiles(signal: AbortSignal) {
    const R = CONFIG.evidenceReveal;
    // The close-up on screen leaves first (reverse order), the rest appear in the same spot.
    const ids = [...R.order].reverse();
    const old = this.overlay;
    this.overlay = null;
    if (old) {
      this.extras.add(old);
      old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: R.flyMs * 0.6, fill: 'forwards' });
      setTimeout(() => this.untrack(old), R.flyMs * 0.6);
    }
    const flights = ids.map((id, i) => (async () => {
      await sleep(i * R.flyStaggerMs, signal);
      const wrap = this.track(h('div', 'fly-wrap', this.app));
      const el = h('div', 'closeup-art', wrap);
      el.style.setProperty('--aspect', String(ART[id].aspect));
      el.innerHTML = ART[id].svg();
      const from = el.getBoundingClientRect();
      const to = this.tiles.get(id)?.getBoundingClientRect();
      const ok = !!to && to.width > 0 && to.height > 0 && to.bottom > 0 && to.right > 0 && to.top < innerHeight && to.left < innerWidth;
      const appear = i === 0 ? 0 : 0.12;
      const frames: Keyframe[] = ok
        ? [
            { transform: 'translate(0,0) scale(1)', opacity: i === 0 ? 1 : 0, filter: 'blur(0px)', offset: 0 },
            { opacity: 1, filter: 'blur(0px)', offset: appear || 0.001, transform: 'translate(0,0) scale(1)' },
            {
              transform: `translate(${to!.left + to!.width / 2 - (from.left + from.width / 2)}px, ${to!.top + to!.height / 2 - (from.top + from.height / 2)}px) scale(${Math.min(to!.width / from.width, to!.height / from.height)})`,
              opacity: 0.3, filter: 'blur(2px)', offset: 1,
            },
          ]
        : [{ opacity: i === 0 ? 1 : 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }];
      el.animate(frames, { duration: R.flyMs, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      await sleep(R.flyMs, signal);
      this.untrack(wrap);
      if (ok) this.popTile(id);
    })());
    await Promise.all(flights);
  }

  private popTile(id: ArtifactId) {
    const t = this.tiles.get(id);
    if (!t) return;
    t.classList.remove('pop');
    void t.offsetWidth;
    t.classList.add('pop');
    t.addEventListener('animationend', () => t.classList.remove('pop'), { once: true });
  }

  closeUp() {
    this.cancelLine();
    this.overlay?.remove();
    this.overlay = null;
  }
}
