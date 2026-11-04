import { CONFIG } from '../../config';
import { h } from '../../core/util';
import { makeNodeStep } from './nodeStep';
import type { NodeView } from './nodeStep';

const N = CONFIG.act3.nodes.queensland;
const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
};

const LETTER_OF: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([l, m]) => [m, l]));

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
    h('div', 'np-label', side).textContent = N.slotsLabel;
    const word = N.morse.split(' ').map((m) => LETTER_OF[m] ?? '?');
    const slotRow = h('div', 'np-slots', side);
    const slots = word.map(() => h('span', 'np-slot', slotRow));
    const replay = h('button', 'np-replay', side);
    replay.textContent = N.replayLabel;
    replay.dataset.nofocus = '1';

    h('div', 'np-label', body).textContent = CONFIG.act3.ui.morseTitle;
    const card = h('div', 'np-morsecard', body);
    const cells: Record<string, HTMLElement> = {};
    for (const [l, m] of Object.entries(MORSE)) {
      const c = h('div', 'np-morse-cell', card);
      cells[l] = c;
      h('b', '', c).textContent = l;
      h('span', '', c).textContent = m.replace(/\./g, '•').replace(/-/g, '−');
    }

    // Morse player: standard timing from unitMs, loops with loopGapMs.
    let run = 0;
    let timer = 0;
    const wait = (ms: number) => new Promise<void>((res) => { timer = window.setTimeout(() => res(), ms); });
    const clearAll = () => {
      slots.forEach((s) => { s.textContent = ''; s.classList.remove('filled'); });
      Object.values(cells).forEach((c) => c.classList.remove('hot'));
    };
    const play = async () => {
      const id = ++run;
      const u = N.unitMs;
      while (id === run) {
        clearAll();
        const groups = N.morse.split(' ');
        for (let li = 0; li < groups.length && id === run; li++) {
          const sym = groups[li];
          const cell = cells[word[li]];
          cell?.classList.add('hot');
          for (let si = 0; si < sym.length && id === run; si++) {
            const dash = sym[si] === '-';
            lamp.classList.add('on');
            g.sfx.beep(N.toneHz, dash ? 3 * u : u);
            await wait(dash ? 3 * u : u);
            lamp.classList.remove('on');
            await wait(si < sym.length - 1 ? u : 3 * u); // intra-char gap 1, letter gap 3
          }
          if (id !== run) break;
          cell?.classList.remove('hot');
          slots[li].textContent = word[li];
          slots[li].classList.add('filled');
        }
        if (id === run) await wait(N.loopGapMs);
      }
    };
    const pause = () => { run++; clearTimeout(timer); lamp.classList.remove('on'); Object.values(cells).forEach((c) => c.classList.remove('hot')); };
    const start = () => { pause(); void play(); };
    replay.addEventListener('click', () => { if (!g.inputLocked) start(); });
    onStop(pause);
    g.ui.relay.onReset(pause);

    return { resume: start, pause, check: (raw) => raw.toLowerCase().replace(/[^a-z]/g, '').includes(N.answer), stop: pause };
  },
});
