import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { parseNumbers } from '../../core/normalize';
import { h } from '../../core/util';
import { unlock } from '../common';
import { enterAct3, nodeData, syncFrequencies } from './shared';

const F = CONFIG.act3.finalRelay;

/** Order-sensitive match: each target found after the previous one. */
function matchInOrder(nums: number[]): boolean {
  let from = 0;
  for (const t of F.answer) {
    const i = nums.findIndex((n, idx) => idx >= from && Math.abs(n - t) <= F.tolerance);
    if (i < 0) return false;
    from = i + 1;
  }
  return true;
}
const allPresent = (nums: number[]) => F.answer.every((t) => nums.some((n) => Math.abs(n - t) <= F.tolerance));

export const act3FinalStep: Step = {
  id: 'act3Final',
  keepExtra: true,
  async enter(g) {
    const { monitor, relay } = g.ui;
    // Jumping straight here: all three nodes count as solved.
    CONFIG.act3.nodeOrder.forEach((k) => g.state.solved.add(k));
    g.state.act3IntroDone = true;
    const globe = enterAct3(g, 'fill');
    relay.nodePanel.close();
    syncFrequencies(g, true);
    globe.resumeSpin();
    monitor.setHint(null);
    g.inputLocked = true;

    // FILES button + mini menu (instant text).
    const host = relay.globeHost;
    if (host) {
      const wrap = h('div', 'files-menu', host);
      wrap.dataset.nofocus = '1';
      const btn = h('button', 'files-btn', wrap);
      btn.textContent = CONFIG.act3.filesLabel;
      btn.dataset.nofocus = '1';
      const list = h('div', 'files-list', wrap);
      list.hidden = true;
      btn.addEventListener('click', () => { list.hidden = !list.hidden; });
      for (const k of CONFIG.act3.nodeOrder) {
        const item = h('button', 'files-item', list);
        item.textContent = nodeData(k).name;
        item.dataset.nofocus = '1';
        item.addEventListener('click', async () => {
          list.hidden = true;
          const wasLocked = g.inputLocked;
          g.inputLocked = true;
          const sig = g.signal;
          await relay.personnel.open(k, { instant: true });
          if (sig.aborted) return;
          g.inputLocked = wasLocked;
          if (!wasLocked) g.input.focus();
        });
      }
    }

    await g.dialogue.play(F.intro, g.signal);
    monitor.setHint(CONFIG.hints.finalRelay);
    unlock(g);
  },
  async onVoice(raw, _norm, g) {
    const nums = parseNumbers(raw);
    if (matchInOrder(nums)) {
      g.goto('act3Network');
      return;
    }
    g.inputLocked = true;
    await g.dialogue.play(allPresent(nums) ? F.wrongOrder : CONFIG.act3.tryAgain, g.signal);
    unlock(g);
  },
  exit(g) {
    g.ui.relay.personnel.close();
  },
};
