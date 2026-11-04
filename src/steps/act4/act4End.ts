import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { h } from '../../core/util';
import { enterMonitor } from '../common';
import { getTransmission, hideAllPanels, setHint } from '../../ui/transmission';

let endCard: HTMLElement | null = null;

/** Blank black screen; the survivor's last line types out with its audio, like a film ending. */
async function movieEnding(signal: AbortSignal): Promise<void> {
  const A = CONFIG.act4;
  const E = A.ending;
  endCard?.remove();
  endCard = h('div', 'movie-ending', document.body);
  const text = h('div', 'movie-ending-text', endCard);
  await new Promise((r) => setTimeout(r, E.fadeInMs)); // black fades in
  await new Promise((r) => setTimeout(r, E.blankMs)); // a beat of nothing
  const line = A.outro[0].text;
  const typing = (async () => {
    const t0 = performance.now();
    await new Promise<void>((done) => {
      const tick = () => {
        if (signal.aborted) return done();
        const n = Math.min(line.length, Math.floor((performance.now() - t0) / E.charMs));
        text.textContent = line.slice(0, n);
        if (n >= line.length) return done();
        requestAnimationFrame(tick);
      };
      tick();
    });
  })();
  await Promise.all([gPlay(signal), typing]);
  text.classList.add('done');
  await new Promise((r) => setTimeout(r, E.holdMs));
}
let gPlay: (signal: AbortSignal) => Promise<void> = async () => {};

export const act4EndStep: Step = {
  id: 'act4End',
  keepExtra: true, // the finished transmission stays on screen
  exit() { /* the ending card is removed after the final screen fades in */ },
  async enter(g) {
    const { monitor } = g.ui;
    const A = CONFIG.act4;
    const tx = getTransmission(g);
    enterMonitor(g, 'green', true);
    g.inputLocked = true;
    setHint(g, null);
    monitor.core.setState('hidden');
    if (!tx.hasPanel) { // debug jump: rebuild the finished panel
      hideAllPanels(g);
      tx.clear();
      monitor.applyStage('network');
      monitor.setLight('green');
      tx.open();
    }
    tx.finish();

    await g.dialogue.play(A.ended, g.signal);
    gPlay = (signal) => g.dialogue.play(A.outro, signal).catch(() => {});

    const cont = tx.addButton(A.continueLabel, () => {
      void (async () => {
        cont.remove();
        await movieEnding(g.signal);
        g.goto('final'); // the final overlay fades in above the ending card
        window.setTimeout(() => endCard?.remove(), 1500);
      })().catch(() => { endCard?.remove(); });
    }, 'tx-btn primary');
    cont.focus({ preventScroll: true });
  },
};
