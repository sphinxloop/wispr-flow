import type { Game } from '../core/stateMachine';
import { h } from '../core/util';

/** Dev overlay: outlines the terminal regions and lets you jump to any step. */
export class Debug {
  private panel: HTMLElement;
  private label: HTMLElement;
  private list: HTMLElement;
  private on = false;

  constructor(private game: Game, private root: HTMLElement, app: HTMLElement) {
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
    this.root.classList.toggle('debug-on', this.on);
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
