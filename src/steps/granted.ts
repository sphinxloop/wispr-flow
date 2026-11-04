import { CONFIG } from '../config';
import type { Step } from '../core/stateMachine';
import { enterMonitor } from './common';

export const grantedStep: Step = {
  id: 'granted',
  async enter(g) {
    const { monitor, effects } = g.ui;
    enterMonitor(g, 'green');
    g.inputLocked = true;
    g.ui.artifacts.hide();
    g.sfx.powerSurge();
    monitor.setPower(CONFIG.terminal.powerGranted);
    monitor.applyStage('granted');
    g.state.fans = g.sfx.fans();
    monitor.brighten(true);
    effects.flash('#fff6d6', 700);
    monitor.clear();
    await monitor.typeLines(CONFIG.screens.granted, { className: 'success' });
    await g.dialogue.play(CONFIG.dialogue.granted, g.signal);
    g.goto('act2Intro'); // the terminal stays on screen; the fans keep running until the videos start
  },
};
