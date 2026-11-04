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
    // Debug jump (or an interrupted relay): show file, stamp and globe at once.
    if (!relay.complete) relay.buildInstant();
    if (!monitor.contains(CONFIG.act2.prompt)) monitor.appendLine(CONFIG.act2.prompt, 'faint');
    unlock(g);
  },
  async onVoice(_text, normalized, g) {
    const { monitor, relay, effects } = g.ui;
    const A = CONFIG.act2;
    const words = normalized.split(' ');
    g.inputLocked = true;

    if (!CONFIG.answers2.archiveWords.every((w) => words.includes(w))) {
      // Nova, text only: no audio lookup, no dialogue.play.
      await monitor.typeLines([CONFIG.screens.novaPrefix + A.wrong]);
      unlock(g);
      return;
    }

    g.sfx.unlock();
    await Promise.all([
      relay.unseal(g.signal),
      monitor.typeLines([A.relayFile.unsealed], { className: 'success' }),
    ]);
    await sleep(A.fx.unsealedPauseMs, g.signal);
    await effects.fadeToBlack(CONFIG.timing.endFadeMs);
    g.goto('end');
  },
};
