import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { sleep } from '../core/util';
import { enterMonitor } from './common';

// First wake attempt: always rejected. Something outside heard it.
export const spikeStep: Step = {
  id: 'spike',
  async enter(g) {
    const { monitor, effects } = g.ui;
    enterMonitor(g, 'amber-pulse');
    g.inputLocked = true;
    g.sfx.screech();
    await sleep(400 + 500, g.signal); // squeal, then a beat of silence

    monitor.flashRed(true);
    monitor.clear();
    monitor.setLight('red');
    g.state.rumble = g.sfx.rumble(120000);
    effects.shake(CONFIG.timing.shakeMs);
    effects.dust(4000);
    await monitor.typeLines(CONFIG.screens.spike, { className: 'alert', charMs: 12 });

    await g.dialogue.play(CONFIG.dialogue.afterSpike, g.signal);

    monitor.flashRed(false);
    monitor.setLight('amber-pulse');
    monitor.clear();
    await monitor.typeLines([CONFIG.screens.wakeHint], { className: 'faint' });
    g.goto('wake');
  },
};
