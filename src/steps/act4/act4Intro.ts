import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { sleep } from '../../core/util';
import { enterMonitor } from '../common';
import { getTransmission, hideAllPanels, setHint } from '../../ui/transmission';
import { alarmBeep } from '../../sfx4';

export const act4IntroStep: Step = {
  id: 'act4Intro',
  async enter(g) {
    const { monitor } = g.ui;
    const A = CONFIG.act4;
    const tx = getTransmission(g);
    enterMonitor(g, 'green', true);
    tx.clear();
    hideAllPanels(g);
    g.inputLocked = true;
    setHint(g, null);
    monitor.applyStage('network');
    // near-silence: a faint breathing core keeps the screen alive
    monitor.core.setState('dormant');

    try {
      await sleep(A.silenceMs, g.signal);
      monitor.core.setState('online');
      await g.dialogue.play(A.coming, g.signal);

      tx.banner(A.banner);
      monitor.setLight('red');
      monitor.core.setState('alert');
      alarmBeep(g.audio);
      const back = sleep(A.bannerMs, g.signal).then(() => {
        monitor.setLight('green');
        monitor.core.setState('online');
      });
      await g.dialogue.play(A.incoming, g.signal);
      await back;
    } finally {
      if (g.signal.aborted) tx.hideBanner();
    }
    tx.hideBanner();
    g.goto('act4Transmission');
  },
};
