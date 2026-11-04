import { CONFIG } from '../../config';
import { h } from '../../core/util';
import { makeNodeStep } from './nodeStep';
import type { NodeView } from './nodeStep';

const N = CONFIG.act3.nodes.bangalore;
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

export const act3BangaloreStep = makeNodeStep({
  stepId: 'act3Bangalore',
  key: 'bangalore',
  hint: CONFIG.hints.bangalore,
  enter: N.enter,
  wrongFirst: N.wrongFirst,
  success: N.success,
  build(_g, body): NodeView {
    body.classList.add('np-decrypt');
    h('div', 'np-label', body).textContent = N.noteLabel;
    h('p', 'np-note', body).textContent = N.note;
    h('div', 'np-cipher', body).textContent = N.cipher;
    h('div', 'np-shiftclue', body).textContent = N.shiftClue;

    h('div', 'np-label', body).textContent = CONFIG.act3.ui.alphabetTitle;
    const strip = h('div', 'np-alpha', body);
    for (let i = 0; i < 26; i++) {
      const cell = h('div', 'np-alpha-cell', strip);
      h('span', 'np-alpha-l', cell).textContent = String.fromCharCode(65 + i);
      h('span', 'np-alpha-n', cell).textContent = String(i + 1);
    }

    return { check: (raw) => letters(raw).includes(N.answer), stop: () => {} };
  },
});
