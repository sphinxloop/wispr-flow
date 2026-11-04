import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { matchesCode } from '../core/normalize';
import { enterMonitor, unlock } from './common';

// Also the authentication step: look at the objects, say the code.
export const evidenceStep: Step = {
  id: 'evidence',
  enter(g) {
    const { monitor, artifacts } = g.ui;
    enterMonitor(g, 'green');
    g.state.wrongAuthCount = 0;
    if (!monitor.contains(CONFIG.screens.authPrompt)) {
      monitor.setLines([...CONFIG.screens.online, CONFIG.screens.authPrompt]);
    }
    artifacts.setIntensity('normal');
    artifacts.show();
    unlock(g);
  },
  async onVoice(text, _norm, g) {
    if (matchesCode(text, CONFIG.answers.authCode)) {
      g.goto('granted');
      return;
    }
    g.inputLocked = true;
    g.ui.artifacts.cancelLine(); // Nova speaks over a close-up line
    g.state.wrongAuthCount++;
    if (g.state.wrongAuthCount === 1) {
      await g.dialogue.play(CONFIG.dialogue.wrong1, g.signal);
    } else {
      g.ui.artifacts.setIntensity('bright');
      await g.dialogue.play(CONFIG.dialogue.wrong2, g.signal);
    }
    unlock(g);
  },
  exit(g) {
    g.ui.artifacts.hide();
  },
};
