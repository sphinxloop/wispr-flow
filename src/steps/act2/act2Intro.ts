import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { sleep } from '../../core/util';
import { enterMonitor } from '../common';

export const act2IntroStep: Step = {
  id: 'act2Intro',
  keepFans: true, // fans were started by `granted`; the video steps stop them
  async enter(g) {
    const { monitor, effects, cinematic } = g.ui;
    enterMonitor(g, 'green', true);
    g.inputLocked = true;
    monitor.applyStage('act2');
    cinematic.preload([CONFIG.paths.act2Video]);

    await monitor.typeLines(CONFIG.act2.loading, { className: 'success' });
    await g.dialogue.play(CONFIG.act2.today, g.signal);

    // Glitch transition: RGB split + jitter + tear, a burst of glitch sfx, then a cut to black.
    const ms = CONFIG.act2.glitchTransitionMs;
    const every = CONFIG.act2.fx.glitchBurstEveryMs;
    const sig = g.signal;
    const fx = effects.glitchOut(ms);
    for (let t = 0; t < ms; t += every) setTimeout(() => { if (!sig.aborted) g.sfx.glitch(); }, t);
    await fx;
    effects.cutToBlack();
    g.goto('act2Video');
  },
};
