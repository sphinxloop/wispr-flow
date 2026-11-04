import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { h } from '../../core/util';
import { enterMonitor } from '../common';
import { getTransmission, hideAllPanels, setHint } from '../../ui/transmission';

export const act4EndStep: Step = {
  id: 'act4End',
  keepExtra: true, // the finished transmission stays on screen
  async enter(g) {
    const { monitor, effects } = g.ui;
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

    const box = tx.actions!;
    const reply = h('a', 'tx-btn', box);
    reply.textContent = A.replyLabel;
    reply.href = A.replyHref;
    reply.target = '_blank';
    reply.rel = 'noopener';
    const cont = tx.addButton(A.continueLabel, () => {
      void (async () => {
        reply.remove();
        cont.remove();
        await g.dialogue.play(A.outro, g.signal);
        await effects.fadeToBlack(A.toFinalFadeMs);
        g.goto('final'); // the final overlay (above the black layer) fades in over it
        window.setTimeout(() => effects.clearBlack(), 1500);
      })().catch(() => {});
    }, 'tx-btn primary');
    cont.focus({ preventScroll: true });
  },
};
