import { CONFIG } from '../config';
import type { Rect } from '../config';
import type { Game } from '../core/stateMachine';
import { h, place } from '../core/util';

/** Dev overlay: shows hotspot/text/input rects and lets you jump to any step. */
export class Debug {
  private boxes: HTMLElement;
  private panel: HTMLElement;
  private label: HTMLElement;
  private list: HTMLElement;
  private on = false;

  constructor(private game: Game, private stage: HTMLElement, app: HTMLElement) {
    this.boxes = h('div', 'debug-boxes', stage);
    const add = (name: string, r: Rect) => {
      const b = h('div', 'debug-box', this.boxes);
      place(b, r);
      b.dataset.label = name;
    };
    const L = CONFIG.layout;
    add('screenText', L.screenText);
    add('voiceInput', L.voiceInput);
    const s = L.statusLight;
    add('statusLight', { left: s.left, top: s.top, width: s.size, height: s.size * (16 / 9) });
    (Object.keys(L.artifacts) as Array<keyof typeof L.artifacts>).forEach((k) => add(k, L.artifacts[k]));

    this.panel = h('div', 'debug-panel', app);
    this.label = h('div', 'debug-current', this.panel);
    this.list = h('div', 'debug-steps', this.panel);
    game.onChange(() => this.refresh());

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        this.toggle();
      } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && e.target !== game.input.el) {
        this.toggle();
      }
    });
    if (new URLSearchParams(location.search).has('debug')) this.toggle(true);
  }

  toggle(force?: boolean) {
    this.on = force ?? !this.on;
    this.stage.classList.toggle('debug-on', this.on);
    this.panel.classList.toggle('on', this.on);
    this.refresh();
  }

  private refresh() {
    if (!this.on) return;
    this.label.textContent = `step: ${this.game.current || '-'}`;
    this.list.replaceChildren();
    for (const id of this.game.stepIds) {
      const b = h('button', id === this.game.current ? 'cur' : '', this.list);
      b.textContent = id;
      b.dataset.nofocus = '1';
      b.addEventListener('click', () => {
        this.game.audio.ensure();
        this.game.goto(id);
      });
    }
  }
}
