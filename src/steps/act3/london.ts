import { CONFIG } from '../../config';
import { parseNumbers } from '../../core/normalize';
import { h, sleep } from '../../core/util';
import type { StaticHandle } from '../../core/audio';
import type { Handle } from '../../core/audio';
import { makeNodeStep } from './nodeStep';
import type { NodeView } from './nodeStep';

const N = CONFIG.act3.nodes.london;
const NS = 'http://www.w3.org/2000/svg';
const CX = 150;
const CY = 150;

const svgEl = (tag: string, attrs: Record<string, string>, parent?: Element) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};

/** value -> angle in radians along the top semicircle (min = left, max = right). */
const angleOf = (v: number) => Math.PI * (1 - (v - N.dialMin) / (N.dialMax - N.dialMin));
const polar = (r: number, a: number) => [CX + r * Math.cos(a), CY - r * Math.sin(a)];

function buildDial(parent: HTMLElement) {
  const svg = svgEl('svg', { viewBox: '0 0 300 175', class: 'np-dial' }) as SVGSVGElement;
  parent.appendChild(svg);
  const [x0, y0] = polar(128, Math.PI);
  const [x1, y1] = polar(128, 0);
  svgEl('path', { d: `M ${x0} ${y0} A 128 128 0 0 1 ${x1} ${y1}`, class: 'dial-arc' }, svg);
  const TICKS = 50;
  for (let i = 0; i <= TICKS; i++) {
    const v = N.dialMin + ((N.dialMax - N.dialMin) * i) / TICKS;
    const major = i % 5 === 0;
    const a = angleOf(v);
    const [ax, ay] = polar(major ? 106 : 116, a);
    const [bx, by] = polar(128, a);
    svgEl('line', { x1: String(ax), y1: String(ay), x2: String(bx), y2: String(by), class: major ? 'dial-tick major' : 'dial-tick' }, svg);
    if (major) {
      const [tx, ty] = polar(90, a);
      const t = svgEl('text', { x: String(tx), y: String(ty + 4), class: 'dial-num', 'text-anchor': 'middle' }, svg);
      t.textContent = String(Math.round(v));
    }
  }
  const needle = svgEl('g', { class: 'dial-needle' }, svg) as SVGGElement;
  svgEl('line', { x1: String(CX), y1: String(CY), x2: String(CX), y2: String(CY - 112), class: 'dial-needle-line' }, needle);
  svgEl('circle', { cx: String(CX), cy: String(CY), r: '7', class: 'dial-hub' }, svg);
  const set = (v: number) => {
    const c = Math.max(N.dialMin, Math.min(N.dialMax, v));
    needle.style.transform = `rotate(${-90 + 180 * ((c - N.dialMin) / (N.dialMax - N.dialMin))}deg)`;
  };
  set(N.dialMin);
  return set;
}

export const act3LondonStep = makeNodeStep({
  stepId: 'act3London',
  key: 'london',
  hint: CONFIG.hints.london,
  enter: N.enter,
  wrongFirst: N.wrongFirst,
  success: N.success,
  build(g, body, onStop): NodeView {
    body.classList.add('np-tune');
    h('div', 'np-label', body).textContent = CONFIG.act3.ui.readoutLabel;
    const readout = h('div', 'np-readout empty', body);
    readout.textContent = N.readoutEmpty;
    const setNeedle = buildDial(body);
    h('p', 'np-note np-tune-note', body).textContent = N.note;

    let stat: StaticHandle | null = null;
    let tone: Handle | null = null;
    const stopAudio = () => { stat?.stop(); tone?.stop(); stat = tone = null; };
    onStop(stopAudio);
    g.ui.relay.onReset(stopAudio);

    return {
      ready() { stat = g.sfx.radioStatic(N.staticGain); },
      check(raw) {
        const nums = parseNumbers(raw);
        if (!nums.length) return false;
        // judge the number closest to the target (so a stray digit doesn't spoil a right answer)
        const n = nums.reduce((a, b) => (Math.abs(b - N.target) < Math.abs(a - N.target) ? b : a));
        readout.textContent = n.toFixed(2);
        readout.classList.remove('empty');
        setNeedle(n);
        const level = Math.max(0.05, Math.min(1, Math.abs(n - N.target) / N.staticFalloff));
        stat?.setLevel(level);
        return nums.some((x) => x >= N.min && x <= N.max);
      },
      async solved() {
        readout.classList.add('locked');
        stat?.fadeOut(1400);
        tone = g.sfx.steadyTone(N.toneHz, 1600);
        await sleep(1500, g.signal);
      },
      stop: stopAudio,
    };
  },
});
