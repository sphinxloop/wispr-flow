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
    const code = h('div', 'np-code', side);
    code.textContent = ' ';
    const replay = h('button', 'np-replay', side);
    replay.textContent = N.replayLabel;
    replay.dataset.nofocus = '1';

    h('div', 'np-label', body).textContent = CONFIG.act3.ui.morseTitle;
    const card = h('div', 'np-morsecard', body);
    for (const [l, m] of Object.entries(MORSE)) {
      const c = h('div', 'np-morse-cell', card);
      h('b', '', c).textContent = l;
      h('span', '', c).textContent = m.replace(/\./g, '•').replace(/-/g, '−');
    }

    // Morse player: standard timing from unitMs, loops with loopGapMs.
    let run = 0;
    let timer = 0;
    const wait = (ms: number, id: number) => new Promise<void>((res) => { timer = window.setTimeout(() => res(), ms); void id; });
    const play = async () => {
      const id = ++run;
      const u = N.unitMs;
      while (id === run) {
        code.textContent = ' ';
        let shown = '';
        const letters = N.morse.split(' ');
        for (let li = 0; li < letters.length && id === run; li++) {
          const sym = letters[li];
          for (let si = 0; si < sym.length && id === run; si++) {
            const dash = sym[si] === '-';
            lamp.classList.add('on');
            g.sfx.beep(N.toneHz, dash ? 3 * u : u);
            shown += dash ? '−' : '•';
            code.textContent = shown;
            await wait(dash ? 3 * u : u, id);
            lamp.classList.remove('on');
            await wait(si < sym.length - 1 ? u : 3 * u, id); // intra-char gap 1, letter gap 3
          }
          shown += ' ';
          code.textContent = shown;
        }
        await wait(N.loopGapMs, id);
      }
    };
    const pause = () => { run++; clearTimeout(timer); lamp.classList.remove('on'); };
    const start = () => { pause(); void play(); };
    replay.addEventListener('click', () => { if (!g.inputLocked) start(); });
    onStop(pause);
    g.ui.relay.onReset(pause);

    return { resume: start, pause, check: (raw) => raw.toLowerCase().replace(/[^a-z]/g, '').includes(N.answer), stop: pause };
  },
});
