import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { enterMonitor, unlock } from './common';

export const standbyStep: Step = {
  id: 'standby',
  async enter(g) {
    const { monitor } = g.ui;
    enterMonitor(g, 'amber-pulse');
    g.inputLocked = true;
    monitor.applyStage('standby');
    monitor.clear();
    if (!g.state.booted) {
      g.state.booted = true;
      await monitor.typeLines(CONFIG.terminal.boot, { className: 'faint', charMs: CONFIG.terminal.bootCharMs });
    }
    await monitor.typeLines(CONFIG.screens.standby);
    await g.dialogue.play(CONFIG.dialogue.standby, g.signal);
    await monitor.typeLines([CONFIG.screens.standbyHint], { className: 'faint' });
    unlock(g);
  },
  onVoice(_text, _norm, g) {
    g.goto('spike');
  },
};
