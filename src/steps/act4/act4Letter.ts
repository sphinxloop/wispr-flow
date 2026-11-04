import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { sleep } from '../../core/util';
import { enterMonitor } from '../common';
import { getTransmission, hideAllPanels, setHint } from '../../ui/transmission';
import { letterTick } from '../../sfx4';

export const act4LetterStep: Step = {
  id: 'act4Letter',
  keepExtra: true, // our panels live in mainExtra; relay.reset() would hide the container
  async enter(g) {
    const { monitor } = g.ui;
    const A = CONFIG.act4;
    const tx = getTransmission(g);
    enterMonitor(g, 'green', true);
    g.inputLocked = true;
    setHint(g, null);
    tx.clear();
    hideAllPanels(g);
    monitor.core.setState('hidden');

    tx.openLetter();
    await tx.typeLetter(A.letter, A.letterCharMs, g.signal, () => letterTick(g.audio));
    await sleep(600, g.signal);
    await g.dialogue.play(A.ended, g.signal);
    g.goto('act4Reply');
  },
};
