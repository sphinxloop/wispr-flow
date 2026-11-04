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

    h('div', 'np-label', body).textContent = CONFIG.act3.ui.alphabetTitle;
    const strip = h('div', 'np-alpha', body);
    const used = new Set(Array.from(N.cipher.toUpperCase()).map((c) => c.charCodeAt(0) - 65));
    const prev = new Set(Array.from(used).map((i) => (i - N.shift + 26) % 26));
    for (let i = 0; i < 26; i++) {
      const cell = h('div', 'np-alpha-cell' + (used.has(i) ? ' hot' : '') + (prev.has(i) ? ' prev' : ''), strip);
      h('span', 'np-alpha-l', cell).textContent = String.fromCharCode(65 + i);
      h('span', 'np-alpha-n', cell).textContent = String(i + 1);
      h('span', 'np-alpha-m', cell).textContent = used.has(i) ? `‹−${N.shift}` : '';
    }

    return { check: (raw) => letters(raw).includes(N.answer), stop: () => {} };
  },
});
