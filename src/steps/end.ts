import type { Step } from '../core/stateMachine';

export const endStep: Step = {
  id: 'end',
  enter(g) {
    // goto() already fades out the fans.
    g.ui.cinematic.hide();
    g.ui.screens.show('end'); // hides the terminal; goto() already removed the file panel and globe
    g.ui.effects.clearBlack();
  },
};
