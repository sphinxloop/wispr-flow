import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { matchesCode } from '../core/normalize';
import { enterMonitor, unlock } from './common';

// Also the authentication step: a cinematic reveal of the objects, then say the code.
export const evidenceStep: Step = {
  id: 'evidence',
  async enter(g) {
    const { monitor, artifacts } = g.ui;
    enterMonitor(g, 'green');
    monitor.applyStage('online');
    g.state.wrongAuthCount = 0;
    g.inputLocked = true;
    monitor.setHint(null);
    artifacts.setIntensity('normal');
    if (!monitor.contains(CONFIG.screens.online[0])) monitor.setLines(CONFIG.screens.online);

    await artifacts.reveal(g.signal);
    await monitor.typeLines([CONFIG.screens.authPrompt]);
    monitor.setHint(CONFIG.hints.auth);
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
