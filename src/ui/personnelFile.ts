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

    (async () => {
      for (let i = 0; i < texts.length; i++) {
        const el = els[i];
        el.classList.add('typing');
        for (let c = 1; c <= texts[i].length; c++) {
          if (skip) break;
          el.textContent = texts[i].slice(0, c);
          await new Promise((r) => setTimeout(r, A.personnelCharMs));
          if (token !== this.token) return;
        }
        el.textContent = texts[i];
        el.classList.remove('typing');
        if (token !== this.token) return;
        if (!skip) await new Promise((r) => setTimeout(r, 90));
      }
    })();
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
