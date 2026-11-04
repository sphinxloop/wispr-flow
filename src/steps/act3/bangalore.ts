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
  build(_g, body, onStop): NodeView {
    body.classList.add('np-decrypt');
    h('div', 'np-label', body).textContent = N.noteLabel;
    const note = h('p', 'np-note', body);
    // The note text with a handful of "corrupted" characters that flicker.
    const bad: HTMLElement[] = [];
    const pool = CONFIG.act3.ui.glitchChars;
    const chars = Array.from(N.note);
    const picks = new Set<number>();
    while (picks.size < Math.min(7, Math.floor(chars.length / 8))) {
      const i = Math.floor(Math.random() * chars.length);
      if (chars[i] !== ' ') picks.add(i);
    }
    chars.forEach((c, i) => {
      if (picks.has(i)) {
        const sp = h('span', 'np-bad', note);
        sp.textContent = c;
        sp.style.animationDelay = `${(Math.random() * 1.4).toFixed(2)}s`;
        bad.push(sp);
      } else note.append(c);
    });
    const orig = bad.map((b) => b.textContent ?? '');
    const timer = window.setInterval(() => {
      bad.forEach((b, i) => {
        b.textContent = Math.random() < 0.35 ? pool[Math.floor(Math.random() * pool.length)] : orig[i];
      });
    }, 170);
    onStop(() => clearInterval(timer));

    h('div', 'np-cipher', body).textContent = N.cipher;

    h('div', 'np-label', body).textContent = CONFIG.act3.ui.alphabetTitle;
    const strip = h('div', 'np-alpha', body);
    for (let i = 0; i < 26; i++) {
      const cell = h('div', 'np-alpha-cell', strip);
      h('span', 'np-alpha-l', cell).textContent = String.fromCharCode(65 + i);
      h('span', 'np-alpha-n', cell).textContent = String(i + 1);
    }

    return {
      check: (raw) => letters(raw).includes(N.answer),
      stop: () => clearInterval(timer),
    };
  },
});
