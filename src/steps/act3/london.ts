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
const T = N.tuner;
const angleOf = (v: number) => Math.PI * (1 - (v - T.min) / (T.max - T.min));
const clamp = (v: number) => Math.max(T.min, Math.min(T.max, v));
const snap = (v: number) => clamp(Math.round(v / T.step) * T.step);
const polar = (r: number, a: number) => [CX + r * Math.cos(a), CY - r * Math.sin(a)];

function buildDial(parent: HTMLElement) {
  const svg = svgEl('svg', { viewBox: '-10 -10 320 195', class: 'np-dial' }) as SVGSVGElement;
  parent.appendChild(svg);
  // generous touch/mouse target covering the whole half-disc
  svgEl('path', { d: `M ${CX - 145} ${CY + 20} L ${CX - 145} ${CY} A 145 145 0 0 1 ${CX + 145} ${CY} L ${CX + 145} ${CY + 20} Z`, class: 'dial-hit' }, svg);
  const [x0, y0] = polar(128, Math.PI);
  const [x1, y1] = polar(128, 0);
  svgEl('path', { d: `M ${x0} ${y0} A 128 128 0 0 1 ${x1} ${y1}`, class: 'dial-arc' }, svg);
  const TICKS = 50;
  for (let i = 0; i <= TICKS; i++) {
    const v = T.min + ((T.max - T.min) * i) / TICKS;
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
    needle.style.transform = `rotate(${-90 + 180 * ((clamp(v) - T.min) / (T.max - T.min))}deg)`;
  };
  set(T.start);
  return { svg, needle, set };
}

/** Pointer position -> dial value (angle of the pointer around the hub). */
function valueAt(svg: SVGSVGElement, clientX: number, clientY: number): number {
  const m = svg.getScreenCTM();
  if (!m) return T.start;
  const pt = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  let a = Math.atan2(CY - pt.y, pt.x - CX);
  if (a < 0) a = pt.x >= CX ? 0 : Math.PI; // below the hub: pin to the nearer end
  return snap(T.min + (1 - a / Math.PI) * (T.max - T.min));
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
    h('div', 'np-city', body).textContent = N.cityLabel;
    h('p', 'np-note np-tune-note', body).textContent = N.note;
    h('div', 'np-label', body).textContent = CONFIG.act3.ui.readoutLabel;
    const tuner = h('div', 'np-tuner', body);
    tuner.dataset.nofocus = '1'; // dragging must not hand focus (and the mobile keyboard) to the voice box
    tuner.addEventListener('mousedown', (e) => e.preventDefault()); // keep the voice box focused on desktop
    const top = h('div', 'np-tune-top', tuner);
    const btnL = h('button', 'np-tune-btn', top);
    const readout = h('div', 'np-readout', top);
    const btnR = h('button', 'np-tune-btn', top);
    btnL.textContent = '◀';
    btnR.textContent = '▶';
    btnL.setAttribute('aria-label', 'Tune down');
    btnR.setAttribute('aria-label', 'Tune up');
    const lockedEl = h('div', 'np-locked', tuner);
    lockedEl.textContent = N.tuner.lockedLabel;
    const { svg, needle, set: setNeedle } = buildDial(tuner);

    let stat: StaticHandle | null = null;
    let tone: Handle | null = null;
    let value = T.start;
    let locked = false;
    let finished = false;
    let lockTimer = 0;
    const inBand = (v: number) => v >= N.min && v <= N.max;

    const setLocked = (on: boolean) => {
      if (on === locked) return;
      locked = on;
      readout.classList.toggle('locked', on);
      lockedEl.classList.toggle('on', on);
      if (on) {
        stat?.setLevel(0.02);
        tone?.stop();
        tone = g.sfx.steadyTone(N.toneHz, 900, 0.04);
      } else {
        tone?.fadeOut(300);
        tone = null;
        stat?.setLevel(staticLevel(value));
      }
    };
    const staticLevel = (v: number) => Math.max(0.05, Math.min(1, Math.abs(v - N.target) / N.staticFalloff));

    /** Move the dial to `v`; the readout, static and lock follow it live. */
    const apply = (v: number, smooth = false) => {
      value = clamp(v);
      readout.textContent = value.toFixed(2);
      needle.classList.toggle('smooth', smooth);
      setNeedle(value);
      if (!locked) stat?.setLevel(staticLevel(value));
      clearTimeout(lockTimer);
      if (inBand(value)) {
        if (!locked) lockTimer = window.setTimeout(() => setLocked(true), N.tuner.lockHoldMs);
      } else setLocked(false);
    };
    apply(T.start);

    // drag the dial or needle
    let dragging = false;
    svg.addEventListener('pointerdown', (e) => {
      if (finished) return;
      dragging = true;
      try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      apply(valueAt(svg, e.clientX, e.clientY));
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => { if (dragging && !finished) apply(valueAt(svg, e.clientX, e.clientY)); });
    const endDrag = () => { dragging = false; };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('wheel', (e) => {
      if (finished) return;
      e.preventDefault();
      apply(snap(value + (e.deltaY < 0 ? 1 : -1) * (e.shiftKey ? T.bigStep : T.step)));
    }, { passive: false });

    // ◀ ▶: tap = step, shift-click or long-press = bigStep (long-press repeats)
    const wire = (btn: HTMLButtonElement, dir: number) => {
      btn.dataset.nofocus = '1';
      let hold = 0;
      let rep = 0;
      let used = false;
      const clear = () => { clearTimeout(hold); clearInterval(rep); };
      const nudge = (big: boolean) => { if (!finished) apply(snap(value + dir * (big ? T.bigStep : T.step))); };
      btn.addEventListener('pointerdown', (e) => {
        used = true;
        clear();
        if (e.shiftKey) { nudge(true); used = true; return; }
        hold = window.setTimeout(() => {
          used = true;
          nudge(true);
          rep = window.setInterval(() => nudge(true), 160);
          hold = 0;
        }, 450);
        used = false;
      });
      const release = () => {
        const pending = hold !== 0;
        clear();
        if (pending && !used) { used = true; nudge(false); }
        hold = 0;
      };
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointerleave', () => { clear(); hold = 0; });
      btn.addEventListener('pointercancel', () => { clear(); hold = 0; });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
      btn.addEventListener('click', (e) => { if (e.detail === 0) nudge(e.shiftKey); }); // keyboard activation
    };
    wire(btnL, -1);
    wire(btnR, 1);

    const stopAudio = () => {
      clearTimeout(lockTimer);
      stat?.stop();
      tone?.stop();
      stat = tone = null;
    };
    onStop(stopAudio);
    g.ui.relay.onReset(stopAudio);

    return {
      ready() { stat = g.sfx.radioStatic(N.staticGain); stat.setLevel(staticLevel(value)); },
      check(raw) {
        const nums = parseNumbers(raw);
        if (!nums.length) return false;
        // judge the number closest to the target (so a stray digit doesn't spoil a right answer)
        const n = nums.reduce((a, b) => (Math.abs(b - N.target) < Math.abs(a - N.target) ? b : a));
        apply(n, true);
        return nums.some((x) => x >= N.min && x <= N.max);
      },
      async solved() {
        finished = true;
        clearTimeout(lockTimer);
        setLocked(true);
        stat?.fadeOut(1400);
        await sleep(1500, g.signal);
      },
      stop: stopAudio,
    };
  },
});
