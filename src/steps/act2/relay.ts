import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { sleep } from '../../core/util';
import { enterMonitor } from '../common';

export const relayStep: Step = {
  id: 'relay',
  keepExtra: true,
  async enter(g) {
    const { monitor, relay, effects } = g.ui;
    const A = CONFIG.act2;
    enterMonitor(g, 'green', true);
    monitor.applyStage('relay');
    g.inputLocked = true;

    relay.openFile();
    await relay.typeFile(g.signal);
    await sleep(300, g.signal);
    g.sfx.stamp();
    effects.shake(A.fx.stampShakeMs, 0.4);
    await relay.slamStamp(g.signal);
    await g.dialogue.play(A.file, g.signal);

    relay.openGlobe();
    await Promise.all([g.dialogue.play(A.globe, g.signal), sleep(A.globeDrawMs, g.signal)]);

    relay.showNodes();
    await g.dialogue.play(A.nodes, g.signal);

    relay.complete = true;
    g.goto('archive');
  },
};
