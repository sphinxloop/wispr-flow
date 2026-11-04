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
  private game: Game | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private replayBtn!: HTMLButtonElement;
  private barFill!: HTMLElement;
  private note!: HTMLElement;

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
      if (p.link && p.link !== '#') { // no link yet: show nothing
        const a = h('a', 'final-card-link', card);
        a.textContent = F.projectLinkLabel;
        this.externalise(a, p.link);
      }
    }

    // wispr
    const wispr = this.section(col, F.wisprTitle);
    const wgrid = h('div', 'final-grid final-wispr', wispr);
    F.wispr.forEach((w, i) => {
      const card = h('article', 'final-card', wgrid);
      h('div', 'final-num', card).textContent = String(i + 1).padStart(2, '0');
      h('h3', 'final-card-title', card).textContent = w.title;
      h('p', 'final-card-text', card).textContent = w.text;
    });

    // buttons
    const btns = h('div', 'final-buttons', col);
    const rw = h('div', 'final-replay-wrap', btns);
    this.replayBtn = h('button', 'final-pill final-replay', rw);
    this.replayBtn.type = 'button';
    this.replayBtn.textContent = F.replayLabel;
    this.replayBtn.addEventListener('click', () => (this.audioEl ? this.stopReplay() : this.startReplay()));
    const bar = h('div', 'final-progress', rw);
    this.barFill = h('div', 'final-progress-fill', bar);
    this.note = h('div', 'final-note', rw);
    this.note.textContent = 'Audio unavailable';
    this.note.hidden = true;
    for (const b of F.buttons) {
      const a = h('a', 'final-pill', btns);
      a.textContent = b.label;
      if (b.href && b.href !== '#') this.externalise(a, b.href);
      else {
        a.classList.add('disabled');
        a.setAttribute('aria-disabled', 'true');
        a.title = 'Coming soon';
      }
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

  attach(game: Game): void { this.game = game; }

  private startReplay(): void {
    this.note.hidden = true;
    const el = new Audio(CONFIG.act4.transmission.src);
    this.audioEl = el;
    el.muted = !!this.game?.audio?.muted;
    this.game?.audio?.onMute?.((m) => { if (this.audioEl === el) el.muted = m; });
    this.replayBtn.textContent = F.replayingLabel;
    this.replayBtn.classList.add('playing');
    el.addEventListener('timeupdate', () => {
      if (this.audioEl === el && el.duration) this.barFill.style.width = `${Math.min(100, (el.currentTime / el.duration) * 100)}%`;
    });
    el.addEventListener('ended', () => { if (this.audioEl === el) this.stopReplay(); });
    el.addEventListener('error', () => { if (this.audioEl === el) { this.stopReplay(); this.note.hidden = false; } });
    el.play().catch(() => { if (this.audioEl === el) { this.stopReplay(); this.note.hidden = false; } });
  }

  stopReplay(): void {
    const el = this.audioEl;
    this.audioEl = null;
    if (el) { try { el.pause(); el.removeAttribute('src'); el.load(); } catch { /* ignore */ } }
    this.replayBtn.textContent = F.replayLabel;
    this.replayBtn.classList.remove('playing');
    this.barFill.style.width = '0%';
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
    this.stopReplay();
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
  fs.attach(game);
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
    fs.stopReplay();
    fs.hide();
    game.goto('start');
  });
  // After main.ts finished registering steps and starting the game.
  setTimeout(goFinal, 0);
}
