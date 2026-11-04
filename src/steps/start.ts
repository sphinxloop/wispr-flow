import type { Step } from '../core/stateMachine';

export const startStep: Step = {
  id: 'start',
  enter(g) {
    const { screens, effects } = g.ui;
    effects.clearBlack();
    screens.show('start');
    // goto() runs synchronously inside this click, so the video may autoplay with sound.
    screens.beginBtn.onclick = () => {
      g.audio.ensure();
      g.goto('intro');
    };
  },
  exit(g) {
    g.ui.screens.beginBtn.onclick = null;
  },
};
