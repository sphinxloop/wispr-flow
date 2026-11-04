import { CONFIG } from '../config';
import type { NodeKey } from '../core/stateMachine';
import { h } from '../core/util';

export interface OpenOpts { instant?: boolean }

/** Full-screen dossier overlay: the recovered personnel file of one relay node. */
export class PersonnelFile {
  private overlay: HTMLElement | null = null;
  private token = 0;
  private resolveClose: (() => void) | null = null;

  constructor(private host: HTMLElement) {}

  get isOpen() { return !!this.overlay; }

  /** Show the file; resolves when the player closes it (or when `close()` is called). */
  open(key: NodeKey, opts: OpenOpts = {}): Promise<void> {
    this.close();
    const A = CONFIG.act3;
    const data = A.personnel[key];
    const token = ++this.token;
    const overlay = h('div', 'pf-overlay', this.host);
    this.overlay = overlay;
    const panel = h('div', 'pf-panel', overlay);
    panel.dataset.nofocus = '1';
    h('div', 'pf-title', panel).textContent = A.personnelTitle;
    const header = h('div', 'pf-header', panel);
    const body = h('div', 'pf-body', panel);
    const btn = h('button', 'pf-close', panel);
    btn.textContent = A.closeLabel;
    btn.dataset.nofocus = '1';

    const done = new Promise<void>((res) => { this.resolveClose = res; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });

    const texts = [data.header, ...data.entries];
    const els = [header, ...data.entries.map(() => h('p', 'pf-entry', body))];
    let skip = !!opts.instant;
    panel.addEventListener('click', () => { skip = true; });

    // Type everything in ~personnelTypeMs total: chars per frame derived from the total length.
    const total = texts.reduce((n, t) => n + t.length, 0);
    const perMs = total / Math.max(1, A.personnelTypeMs);
    const finish = () => {
      texts.forEach((t, i) => { els[i].textContent = t; els[i].classList.remove('typing'); });
    };
    if (skip) finish();
    else {
      let typed = 0;
      let last = performance.now();
      const tick = (now: number) => {
        if (token !== this.token) return;
        if (skip) return finish();
        typed += (now - last) * perMs;
        last = now;
        let left = Math.floor(typed);
        texts.forEach((t, i) => {
          const n = Math.min(t.length, left);
          left -= n;
          els[i].textContent = t.slice(0, n);
          els[i].classList.toggle('typing', n > 0 && n < t.length);
        });
        if (typed >= total) return finish();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    return done;
  }

  /** Remove the overlay and resolve the pending `open()`. */
  close() {
    this.token++;
    this.overlay?.remove();
    this.overlay = null;
    const r = this.resolveClose;
    this.resolveClose = null;
    r?.();
  }
}
