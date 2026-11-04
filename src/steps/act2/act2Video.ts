import { CONFIG } from '../../config';
import type { Game, Step } from '../../core/stateMachine';

/** Terminal underneath, ready for when the video fades away. */
function prepare(g: Game) {
  const { screens, monitor, effects, cinematic } = g.ui;
  g.audio.ensure();
  screens.show('monitor');
  monitor.setLight('green');
  monitor.setPower(CONFIG.terminal.powerGranted);
  g.inputLocked = true;
  return { effects, cinematic };
}

export const act2Video1Step: Step = {
  id: 'act2Video1',
  async enter(g) {
    const { effects, cinematic } = prepare(g);
    const A = CONFIG.act2;
    const scene = cinematic.playScene({
      src: CONFIG.paths.act2aVideo,
      startAt: A.videoA.startAt,
      lines: A.videoA.lines,
      signal: g.signal,
    });
    effects.clearBlack(); // the player already covers the screen
    await scene;
    g.goto('act2Video2');
  },
  exit(g) { g.ui.cinematic.hide(); },
};

export const act2Video2Step: Step = {
  id: 'act2Video2',
  async enter(g) {
    const { effects, cinematic } = prepare(g);
    const A = CONFIG.act2;
    const scene = cinematic.playScene({
      src: CONFIG.paths.act2bVideo,
      startAt: A.videoB.startAt,
      lines: A.videoB.lines,
      after: A.videoB.after,
      signal: g.signal,
    });
    effects.clearBlack();
    await scene;
    await cinematic.fadeOut(A.returnFadeMs, g.signal);
    g.goto('relay');
  },
  exit(g) { g.ui.cinematic.hide(); },
};
