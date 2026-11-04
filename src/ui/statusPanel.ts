import { CONFIG } from '../config';
import type { Stage, Tone } from '../config';
import { h } from '../core/util';

interface Row { def: (typeof CONFIG.terminal.statusRows)[number]; label: HTMLElement; value: HTMLElement; segs: HTMLElement[] }

/** SYSTEM STATUS rows: label, value (toned) and an optional segmented bar. */
export class StatusPanel {
  readonly el: HTMLElement;
  private rows = new Map<string, Row>();

  constructor(parent: HTMLElement) {
    const T = CONFIG.terminal;
    this.el = h('section', 'status', parent);
    h('div', 'panel-title', this.el).textContent = T.statusTitle;
    const list = h('div', 'status-list', this.el);
    for (const def of T.statusRows) {
      const r = h('div', 'srow', list);
      const label = h('span', 'srow-label', r);
      const value = h('span', 'srow-value', r);
      const segs: HTMLElement[] = [];
      if (def.bar) {
        const bar = h('span', 'srow-bar', r);
        for (let i = 0; i < T.statusSegments; i++) segs.push(h('i', '', bar));
      }
      this.rows.set(def.key, { def, label, value, segs });
      this.set(def.key, def.value, def.tone, def.label);
    }
  }

  /** Update one row. `label` is optional (the mesh row renames itself in Act 2). */
  set(key: string, value: string, tone?: Tone, label?: string) {
    const r = this.rows.get(key);
    if (!r) return;
    r.value.textContent = value;
    if (tone) { r.value.dataset.tone = tone; r.value.parentElement!.dataset.tone = tone; }
    if (label) r.label.textContent = label;
    if (r.segs.length) {
      const pct = Math.max(0, Math.min(100, parseFloat(value) || 0));
      const lit = pct > 0 ? Math.max(1, Math.round((pct / 100) * r.segs.length)) : 0;
      r.segs.forEach((s, i) => s.classList.toggle('on', i < lit));
    }
  }

  /** Back to the configured defaults. */
  reset() {
    this.rows.forEach((r, k) => this.set(k, r.def.value, r.def.tone, r.def.label));
  }

  /** Defaults, then the stage's overrides. */
  apply(stage: Stage) {
    this.reset();
    for (const [k, v] of Object.entries(stage.status ?? {})) this.set(k, v[0], v[1], v[2]);
  }
}
