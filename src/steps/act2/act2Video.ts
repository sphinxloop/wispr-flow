import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';

/** The full Act 2 cinematic (one video). Terminal waits underneath for when it fades away. */
export const act2VideoStep: Step = {
  id: 'act2Video',
  async enter(g) {
    const { screens, monitor, effects, cinematic } = g.ui;
    g.audio.ensure();
    screens.show('monitor');
    monitor.setLight('green');
    monitor.setPower(CONFIG.terminal.powerGranted);
    monitor.applyStage('act2');
    g.inputLocked = true;
    const A = CONFIG.act2;
    // Narration lines are only used when the voice is NOT baked into the video.
    const scene = cinematic.playScene({
      src: CONFIG.paths.act2Video,
      startAt: A.videoA.startAt,
      lines: [...A.videoA.lines, ...A.videoB.lines],
      after: A.videoB.after,
      cues: CONFIG.act2Cues,
      signal: g.signal,
    });
    effects.clearBlack(); // the player already covers the screen
    await scene;
    await cinematic.fadeOut(A.returnFadeMs, g.signal);
    g.goto('relay');
  },
  exit(g) { g.ui.cinematic.hide(); },
};
