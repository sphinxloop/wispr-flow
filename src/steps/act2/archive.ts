import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { sleep } from '../../core/util';
import { enterMonitor, unlock } from '../common';

export const archiveStep: Step = {
  id: 'archive',
  keepExtra: true,
  enter(g) {
    const { monitor, relay } = g.ui;
    enterMonitor(g, 'green', true);
    monitor.applyStage('relay');
    // Debug jump (or an interrupted relay): show file, stamp and globe at once.
    if (!relay.complete) relay.buildInstant();
    monitor.setHint(CONFIG.hints.archive);
    unlock(g);
  },
  async onVoice(_text, normalized, g) {
    const { monitor, relay } = g.ui;
    const A = CONFIG.act2;
    const words = normalized.split(' ');
    g.inputLocked = true;

    if (!CONFIG.answers2.archiveWords.every((w) => words.includes(w))) {
      await g.dialogue.play(A.wrong, g.signal);
      unlock(g);
      return;
    }

    monitor.setHint(null);
    g.sfx.unlock();
    await Promise.all([
      relay.unseal(g.signal),
      monitor.typeLines([A.relayFile.unsealed], { className: 'success' }),
    ]);
    await sleep(A.fx.unsealedPauseMs, g.signal);
    g.goto('act3Intro'); // no fade: the terminal stays
  },
};
