import '../final.css';
import { CONFIG } from '../config';
import { h } from '../core/util';
import type { Game } from '../core/stateMachine';

const F = CONFIG.final;

/** The calm full-page "real Vishal" screen. Plain DOM overlay above the game. */
export class FinalScreen {
  readonly root: HTMLElement;
  readonly playAgainLink: HTMLAnchorElement;
  private shown = false;

  constructor(parent: HTMLElement = document.body) {
    const root = (this.root = h('div', 'final', parent));
    root.id = 'final';
    root.hidden = true;
    root.setAttribute('role', 'main');
    const col = h('div', 'final-col', root);

    // hero
    const hero = h('header', 'final-hero', col);
    h('h1', 'final-headline', hero).textContent = F.headline;
    h('p', 'final-subline', hero).textContent = F.subline;

    // about
    const about = this.section(col, F.aboutTitle);
    F.about.split(/\n\s*\n/).forEach((p) => { h('p', 'final-text', about).textContent = p; });

    // experience timeline
    const exp = this.section(col, F.experienceTitle);
    const tl = h('ol', 'final-timeline', exp);
    for (const e of F.experience) {
      const li = h('li', 'final-tl-item', tl);
      h('span', 'final-tl-dot', li);
      h('div', 'final-tl-meta', li).textContent = `${e.when} · ${e.where}`;
      const role = h('div', 'final-tl-role', li);
      role.append(document.createTextNode(e.role + ' '));
      h('span', 'final-tl-org', role).textContent = '@ ' + e.org;
      h('p', 'final-tl-text', li).textContent = e.text;
    }

    // projects
    const proj = this.section(col, F.projectsTitle);
    const grid = h('div', 'final-grid final-projects', proj);
    for (const p of F.projects) {
      const card = h('article', 'final-card', grid);
      h('h3', 'final-card-title', card).textContent = p.name;
      h('p', 'final-card-text', card).textContent = p.text;
      const a = h('a', 'final-card-link', card);
      a.textContent = F.projectLinkLabel;
      this.externalise(a, p.link);
    }

    // wispr
    const wispr = this.section(col, F.wisprTitle);
    const wgrid = h('div', 'final-grid final-wispr', wispr);
    for (const w of F.wispr) {
      const card = h('article', 'final-card', wgrid);
      h('h3', 'final-card-title', card).textContent = w.title;
      h('p', 'final-card-text', card).textContent = w.text;
    }

    // buttons
    const btns = h('div', 'final-buttons', col);
    for (const b of F.buttons) {
      const a = h('a', 'final-pill', btns);
      a.textContent = b.label;
      this.externalise(a, b.href);
    }

    // footer
    const foot = h('footer', 'final-footer', col);
    h('p', '', foot).textContent = F.footer;
    this.playAgainLink = h('a', 'final-again', foot);
    this.playAgainLink.href = '#';
    this.playAgainLink.textContent = F.playAgain;
  }

  private section(col: HTMLElement, title: string): HTMLElement {
    const s = h('section', 'final-section', col);
    h('h2', 'final-h2', s).textContent = title;
    return s;
  }

  private externalise(a: HTMLAnchorElement, href: string) {
    a.href = href;
    if (href && href !== '#') {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  }

  get visible(): boolean { return this.shown; }

  show(): void {
    if (this.shown) return;
    this.shown = true;
    this.root.hidden = false;
    this.root.scrollTop = 0;
    document.body.classList.add('final-on');
    // let the browser paint the hidden state first so the fade runs
    requestAnimationFrame(() => this.root.classList.add('in'));
    try { (document.activeElement as HTMLElement | null)?.blur(); } catch { /* ignore */ }
  }

  hide(): void {
    this.shown = false;
    this.root.classList.remove('in');
    this.root.hidden = true;
    document.body.classList.remove('final-on');
  }
}

let instance: FinalScreen | null = null;
export function getFinalScreen(): FinalScreen {
  return (instance ??= new FinalScreen());
}

/** Hash routing: #final shows the final screen (also on load); "play again" restarts the game. */
export function initFinalRoute(game: Game): void {
  const fs = getFinalScreen();
  const goFinal = () => {
    if (location.hash === F.hash && game.current !== 'final') {
      fs.show();
      game.goto('final');
    }
  };
  window.addEventListener('hashchange', goFinal);
  fs.playAgainLink.addEventListener('click', (e) => {
    e.preventDefault();
    history.replaceState(null, '', location.pathname + location.search);
    fs.hide();
    game.goto('start');
  });
  // After main.ts finished registering steps and starting the game.
  setTimeout(goFinal, 0);
}
