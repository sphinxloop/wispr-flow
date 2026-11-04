import { CONFIG } from '../config';
import { h } from '../core/util';
import '../act3.css';

/** The framed puzzle panel that sits beside the globe while a relay node is open. */
export class NodePanel {
  private el: HTMLElement | null = null;
  private cleanups: Array<() => void> = [];
  backBtn: HTMLButtonElement | null = null;

  constructor(private host: () => HTMLElement | null) {}

  get body(): HTMLElement | null { return this.el?.querySelector('.np-body') ?? null; }

  /** Build the frame and return its body. `onBack` leaves the node. */
  open(title: string, name: string, onBack: () => void): HTMLElement {
    this.close();
    const host = this.host();
    if (!host) throw new Error('no relay host');
    const el = h('div', 'node-panel enter', host);
    this.el = el;
    const head = h('div', 'np-head', el);
    const t = h('div', 'np-titles', head);
    h('div', 'np-title', t).textContent = title;
    h('div', 'np-name', t).textContent = name;
    const back = h('button', 'np-back', head);
    back.textContent = CONFIG.act3.ui.back;
    back.dataset.nofocus = '1';
    back.addEventListener('click', onBack);
    this.backBtn = back;
    return h('div', 'np-body', el);
  }

  /** Register something to stop when the panel closes (timers, audio). */
  onClose(fn: () => void) { this.cleanups.push(fn); }

  close() {
    this.cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    this.el?.remove();
    this.el = null;
    this.backBtn = null;
  }
}
