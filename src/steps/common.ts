import { CONFIG } from '../config';
import type { Game } from '../core/stateMachine';
import type { LightMode } from '../ui/monitor';

/** Shared setup for every step that lives on the monitor screen (also covers debug jumps). */
export function enterMonitor(g: Game, light: LightMode): void {
  const { screens, effects, monitor } = g.ui;
  g.audio.ensure();
  screens.show('monitor');
  monitor.setLight(light);
  if (g.state.fromBlack) {
    g.state.fromBlack = false;
    effects.fadeFromBlack(CONFIG.timing.introFadeMs);
  } else {
    effects.clearBlack();
  }
  g.input.setActive(true);
}

/** Unlock the voice box and put the cursor back in it. */
export function unlock(g: Game): void {
  g.inputLocked = false;
  g.input.focus();
}
