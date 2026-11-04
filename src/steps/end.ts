import type { Step } from '../core/stateMachine';

export const endStep: Step = {
  id: 'end',
  enter(g) {
    // goto() already fades out the fans.
    g.ui.screens.show('end');
    g.ui.effects.clearBlack();
  },
};
