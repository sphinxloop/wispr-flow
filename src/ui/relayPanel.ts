import { CONFIG } from '../config';
import { h, sleep } from '../core/util';
import { Globe } from './globe';
import { NodePanel } from './nodePanel';
import { PersonnelFile } from './personnelFile';
import type { Monitor } from './monitor';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Act 2 extras in the terminal's main area: the sealed file card (with stamp) and the globe. */
export class RelayPanel {
  /** True once file, stamp and globe are fully on screen (so `archive` can skip the rebuild). */
  complete = false;
  private wrap: HTMLElement | null = null;
  private fileCard: HTMLElement | null = null;
  private stampEl: HTMLElement | null = null;
  private statusEl: HTMLElement | null = null;
  private globeCard: HTMLElement | null = null;
  private globe: Globe | null = null;
  private cleanups: Array<() => void> = [];
  readonly personnel: PersonnelFile;
  readonly nodePanel: NodePanel;

  constructor(private monitor: Monitor) {
    this.personnel = new PersonnelFile(monitor.root);
    this.nodePanel = new NodePanel(() => this.wrap);
  }

  /** The live globe, if one is on screen. */
  get liveGlobe(): Globe | null { return this.globe; }
  /** The card holding the globe canvas (for overlays such as the FILES button). */
  get globeHost(): HTMLElement | null { return this.globeCard; }

  /** Run `fn` when everything is hidden (Act 3 audio, timers). */
  onReset(fn: () => void) { this.cleanups.push(fn); }

  /** Clean main area: sealed file, globe, Act 3 panels and overlays gone; globe loop and Act 3 audio stopped. */
  hideAll() { this.reset(); }

  /**
   * Act 3 scene: make sure the globe is up (the sealed file card slides away) and pick a layout.
   * 'fill' = globe fills the area; 'puzzle' = globe shrinks to one side for a node panel.
   */
  actScene(layout: 'fill' | 'puzzle'): Globe {
    const extra = this.monitor.mainExtra;
    extra.classList.add('on');
    if (!this.wrap) this.wrap = h('div', 'relay', extra);
    this.wrap.classList.add('act3');
    if (this.fileCard) {
      const f = this.fileCard;
      f.classList.add('leaving');
      window.setTimeout(() => f.remove(), 800);
      this.fileCard = this.stampEl = this.statusEl = null;
    }
    if (!this.globe) {
      this.globeCard = h('div', 'relay-card relay-globe', this.wrap);
      const canvas = h('canvas', 'globe-canvas', this.globeCard);
      const A = CONFIG.act3;
      this.globe = new Globe(canvas, A.nodeOrder.map((k) => ({ name: A.nodes[k].name, lat: A.nodes[k].lat, lon: A.nodes[k].lon })));
      this.globe.startDraw(true);
      this.globe.showNodes(true);
    }
    this.wrap.classList.toggle('fill', layout === 'fill');
    this.wrap.classList.toggle('puzzle', layout === 'puzzle');
    this.globe.setFill(layout === 'fill');
    this.complete = true;
    return this.globe;
  }

  /** Remove everything and stop the globe loop. */
  reset() {
    this.cleanups.splice(0).forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    this.personnel.close();
    this.nodePanel.close();
    this.globe?.stop();
    this.globe = null;
    this.wrap?.remove();
    this.wrap = this.fileCard = this.stampEl = this.statusEl = this.globeCard = null;
    this.monitor.mainExtra.classList.remove('on');
    this.complete = false;
  }

  /** Create the (empty) file card. */
  openFile() {
    this.reset();
    const extra = this.monitor.mainExtra;
    extra.classList.add('on');
    this.wrap = h('div', 'relay', extra);
    this.fileCard = h('div', 'relay-card relay-file enter', this.wrap);
    return this.fileCard;
  }

  private statusIndex() { return CONFIG.act2.relayFile.lines.length - 1; }

  /** Type the file lines one by one. */
  async typeFile(signal: AbortSignal) {
    const card = this.fileCard!;
    const lines = CONFIG.act2.relayFile.lines;
    for (let i = 0; i < lines.length; i++) {
      const el = h('div', 'rf-line' + (i === 0 ? ' rf-title' : ''), card);
      if (i === this.statusIndex()) this.statusEl = el;
      for (let c = 1; c <= lines[i].length; c++) {
        el.textContent = lines[i].slice(0, c);
        await sleep(CONFIG.timing.typewriterCharMs, signal);
      }
      await sleep(CONFIG.timing.typewriterCharMs * 4, signal);
    }
  }

  private fillFile() {
    const card = this.fileCard!;
    const lines = CONFIG.act2.relayFile.lines;
    lines.forEach((t, i) => {
      const el = h('div', 'rf-line' + (i === 0 ? ' rf-title' : ''), card);
      el.textContent = t;
      if (i === this.statusIndex()) this.statusEl = el;
    });
  }

  private makeStamp() {
    this.stampEl = h('div', 'rf-stamp', this.fileCard!);
    this.stampEl.textContent = CONFIG.act2.relayFile.stamp;
    return this.stampEl;
  }

  /** Slam the SEALED stamp on (scale 2.5 -> 1, fade in, slight rotation). */
  async slamStamp(signal: AbortSignal) {
    const el = this.makeStamp();
    el.style.opacity = '0';
    const anim = el.animate(
      [
        { transform: 'rotate(-4deg) scale(2.5)', opacity: 0 },
        { transform: 'rotate(-12deg) scale(1)', opacity: 1 },
      ],
      { duration: CONFIG.act2.fx.stampMs, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' },
    );
    await sleep(CONFIG.act2.fx.stampMs, signal);
    el.style.opacity = '1';
    anim.cancel();
  }

  /** Create the globe card; it starts drawing itself immediately. */
  openGlobe(instant = false) {
    this.globeCard = h('div', 'relay-card relay-globe enter', this.wrap!);
    const canvas = h('canvas', 'globe-canvas', this.globeCard);
    this.globe = new Globe(canvas, CONFIG.act2.relayNodes);
    this.globe.startDraw(instant);
  }

  showNodes(instant = false) { this.globe?.showNodes(instant); }

  /** Everything on screen at once, no animation (debug jump straight to `archive`). */
  buildInstant() {
    this.openFile();
    this.fillFile();
    this.makeStamp();
    this.fileCard!.classList.remove('enter');
    this.openGlobe(true);
    this.globeCard!.classList.remove('enter');
    this.showNodes(true);
    this.complete = true;
  }

  /** Crack the stamp in two, drop the halves, and switch the status line. */
  async unseal(signal: AbortSignal) {
    this.complete = false;
    const stamp = this.stampEl;
    const card = this.fileCard;
    if (!stamp || !card) return;
    const ms = CONFIG.act2.fx.crackMs;
    const drawMs = ms * 0.3;

    // Jagged crack: x offsets (percent) at 7 heights, shared by the polyline and both clip paths.
    const ys = [0, 17, 34, 50, 67, 84, 100];
    const xs = ys.map((_, i) => (i === 0 || i === ys.length - 1 ? 50 + (Math.random() - 0.5) * 10 : 50 + (Math.random() - 0.5) * 34));
    const pts = xs.map((x, i) => `${x},${ys[i]}`);

    const box = h('div', 'rf-stamp-box', card);
    box.style.right = box.style.bottom = 'auto';
    box.style.padding = '0';
    box.style.left = stamp.offsetLeft + 'px';
    box.style.top = stamp.offsetTop + 'px';
    box.style.width = stamp.offsetWidth + 'px';
    box.style.height = stamp.offsetHeight + 'px';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'rf-crack');
    const line = document.createElementNS(SVG_NS, 'polyline');
    line.setAttribute('points', pts.join(' '));
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(line);
    const len = 140;
    line.style.strokeDasharray = String(len);
    line.style.strokeDashoffset = String(len);
    box.appendChild(svg);
    line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: drawMs, fill: 'forwards', easing: 'ease-in' });
    await sleep(drawMs, signal);

    // Split into two halves along the crack and let them fall away.
    const halfL = stamp.cloneNode(true) as HTMLElement;
    const halfR = stamp.cloneNode(true) as HTMLElement;
    // Each polygon: down the crack, then back along its own outer side.
    const down = xs.map((x, i) => `${x}% ${ys[i]}%`);
    halfL.style.clipPath = `polygon(0% 0%, ${down.join(', ')}, 0% 100%)`;
    halfR.style.clipPath = `polygon(100% 0%, ${down.join(', ')}, 100% 100%)`;
    for (const half of [halfL, halfR]) {
      half.style.opacity = '1';
      half.style.transform = 'rotate(-12deg)';
      card.appendChild(half);
    }
    stamp.remove();
    this.stampEl = null;
    const fall = ms - drawMs;
    const opts: KeyframeAnimationOptions = { duration: fall, easing: 'ease-in', fill: 'forwards' };
    halfL.animate(
      [
        { transform: 'rotate(-12deg) translate(0, 0)', opacity: 1 },
        { transform: 'rotate(-34deg) translate(-40px, 220px)', opacity: 0 },
      ],
      opts,
    );
    halfR.animate(
      [
        { transform: 'rotate(-12deg) translate(0, 0)', opacity: 1 },
        { transform: 'rotate(14deg) translate(40px, 240px)', opacity: 0 },
      ],
      opts,
    );
    if (this.statusEl) {
      this.statusEl.textContent = CONFIG.act2.relayFile.unsealed;
      this.statusEl.classList.add('rf-unsealed');
    }
    await sleep(fall, signal);
    halfL.remove();
    halfR.remove();
    box.remove();
  }
}
