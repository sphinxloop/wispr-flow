import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { enterMonitor, unlock } from './common';

// Second attempt: whisper her name.
export const wakeStep: Step = {
  id: 'wake',
  keepAmbient: true,
  async enter(g) {
    const { monitor } = g.ui;
    enterMonitor(g, 'amber-pulse');
    monitor.applyStage('listening');
    monitor.setHint(CONFIG.hints.whisper);
    unlock(g);
  },
  async onVoice(_text, normalized, g) {
    const { monitor } = g.ui;
    if (!normalized.includes(CONFIG.answers.wakeKeyword)) {
      g.sfx.glitch(); // not her name: the hint stays on screen
      return;
    }
    g.inputLocked = true;
    monitor.setHint(null);
    if (g.state.rumble) {
      g.state.rumble.fadeOut(2000);
      g.state.rumble = null;
    }
    g.sfx.risingTone();
    monitor.setLight('green');
    monitor.applyStage('online');
    monitor.clear();
    await monitor.typeLines(CONFIG.screens.online, { className: 'success' });
    await g.dialogue.play(CONFIG.dialogue.novaWake, g.signal);
    await monitor.typeLines([CONFIG.screens.authPrompt]);
    g.goto('evidence');
  },
};
