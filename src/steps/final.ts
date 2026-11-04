import type { Step } from '../core/stateMachine';
import { getFinalScreen } from '../ui/finalScreen';

export const finalStep: Step = {
  id: 'final',
  enter(g) {
    // The state machine already aborted the previous step and stopped rumble/fans.
    document.querySelectorAll('video').forEach((v) => { try { v.pause(); } catch { /* ignore */ } });
    g.state.rumble?.stop();
    g.state.rumble = null;
    g.state.fans?.stop();
    g.state.fans = null;
    g.inputLocked = true;
    g.input.setActive(false);
    (document.activeElement as HTMLElement | null)?.blur();
    getFinalScreen().show(); // the overlay covers the terminal
  },
  exit() {
    getFinalScreen().hide();
  },
};
