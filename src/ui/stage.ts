import { CONFIG } from '../config';
import { h } from '../core/util';

/** 16:9 stage that "contains" itself in the viewport (sizing is pure CSS, see .stage). */
export function createStage(parent: HTMLElement): HTMLElement {
  const stage = h('div', 'stage', parent);
  stage.style.backgroundImage = `url(${CONFIG.paths.terminalImage})`;
  return stage;
}
