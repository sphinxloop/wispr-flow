import { CONFIG } from '../../config';
import { h } from '../../core/util';
import { makeNodeStep } from './nodeStep';
import type { NodeView } from './nodeStep';

const N = CONFIG.act3.nodes.queensland;
const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
};

export const act3QueenslandStep = makeNodeStep({
  stepId: 'act3Queensland',
  key: 'queensland',
  hint: CONFIG.hints.queensland,
  enter: N.enter,
  wrongFirst: N.wrongFirst,
  success: N.success,
  build(g, body, onStop): NodeView {
    body.classList.add('np-morse');
    const top = h('div', 'np-morse-top', body);
    const lampBox = h('div', 'np-lampbox', top);
    const lamp = h('div', 'np-lamp', lampBox);
    h('div', 'np-label', lampBox).textContent = CONFIG.act3.ui.signalLabel;
    const side = h('div', 'np-morse-side', top);
    const replay = h('button', 'np-replay', side);
    replay.textContent = N.replayLabel;
    replay.dataset.nofocus = '1';

    // The intercepted code, permanently on screen: dots and dashes grouped by letter. Never decoded for the player.
    h('div', 'np-label', body).textContent = N.codeLabel;
    const codeEl = h('div', 'np-code', body);
    codeEl.setAttribute('aria-label', N.morse);
    const groups = N.morse.split(' ');
    const syms: HTMLElement[][] = groups.map((grp) => {
      const g1 = h('span', 'np-code-group', codeEl);
      return Array.from(grp).map((ch) => {
        const sy = h('span', 'np-sym ' + (ch === '-' ? 'dash' : 'dot'), g1);
        sy.textContent = ch;
        return sy;
      });
    });

    h('div', 'np-label', body).textContent = CONFIG.act3.ui.morseTitle;
    const card = h('div', 'np-morsecard', body);
    for (const [l, m] of Object.entries(MORSE)) {
      const c = h('div', 'np-morse-cell', card);
      h('b', '', c).textContent = l;
      h('span', '', c).textContent = m.replace(/\./g, '•').replace(/-/g, '−');
    }

    // Morse player: standard timing from unitMs, loops with loopGapMs; softer after the first pass, REPLAY restarts at full volume.
    let run = 0;
    let timer = 0;
    const wait = (ms: number) => new Promise<void>((res) => { timer = window.setTimeout(() => res(), ms); });
    const dark = () => syms.forEach((grp) => grp.forEach((s) => s.classList.remove('on')));
    const play = async () => {
      const id = ++run;
      const u = N.unitMs;
      let pass = 0;
      while (id === run) {
        const vol = pass++ === 0 ? 1 : N.loopVolume;
        for (let li = 0; li < groups.length && id === run; li++) {
          const sym = groups[li];
          for (let si = 0; si < sym.length && id === run; si++) {
            const dash = sym[si] === '-';
            lamp.classList.add('on');
            syms[li][si].classList.add('on');
            g.sfx.beep(N.toneHz, dash ? 3 * u : u, vol);
            await wait(dash ? 3 * u : u);
            lamp.classList.remove('on');
            syms[li][si].classList.remove('on');
            await wait(si < sym.length - 1 ? u : 3 * u); // intra-char gap 1, letter gap 3
          }
        }
        if (id === run) await wait(N.loopGapMs);
      }
    };
    const pause = () => { run++; clearTimeout(timer); lamp.classList.remove('on'); dark(); };
    const start = () => { pause(); void play(); };
    replay.addEventListener('click', () => { if (!g.inputLocked) start(); });
    onStop(pause);
    g.ui.relay.onReset(pause);

    return { resume: start, pause, check: (raw) => raw.toLowerCase().replace(/[^a-z]/g, '').includes(N.answer), stop: pause };
  },
});
