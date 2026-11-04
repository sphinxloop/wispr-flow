import { CONFIG } from '../../config';
import type { NodeKey, Step } from '../../core/stateMachine';
import { enterAct3, nodeData, STEP_OF } from './shared';

export const act3IntroStep: Step = {
  id: 'act3Intro',
  keepExtra: true,
  async enter(g) {
    const { monitor } = g.ui;
    const A = CONFIG.act3;
    const globe = enterAct3(g, 'fill');
    g.ui.relay.nodePanel.close();
    globe.resumeSpin();
    g.inputLocked = true;
    monitor.setHint(null);

    if (g.state.solved.size >= A.nodeOrder.length) {
      g.goto('act3Final');
      return;
    }
    if (!g.state.act3IntroDone && g.state.solved.size === 0) {
      g.state.act3IntroDone = true;
      await g.dialogue.play(A.intro, g.signal);
    }
    g.state.act3IntroDone = true;

    // Unsolved nodes become clickable.
    const byName = new Map<string, NodeKey>();
    for (const k of A.nodeOrder) {
      byName.set(nodeData(k).name, k);
      if (!g.state.solved.has(k)) globe.setNodeState(nodeData(k).name, 'clickable');
    }
    monitor.setHint(CONFIG.hints.chooseNode);
    g.inputLocked = false;
    let busy = false;
    const sig = g.signal;
    globe.onNodeClick(async (name) => {
      const key = byName.get(name);
      if (!key || busy || g.state.solved.has(key)) return;
      busy = true;
      monitor.setHint(null);
      for (const k of A.nodeOrder) if (!g.state.solved.has(k)) globe.setNodeState(nodeData(k).name, 'idle');
      globe.setNodeState(name, 'clickable');
      const info = nodeData(key);
      await globe.focusOn(info.lat, info.lon, A.globe.focusMs);
      if (sig.aborted) return;
      g.goto(STEP_OF[key]);
    });
  },
  exit(g) {
    g.ui.relay.liveGlobe?.onNodeClick(null);
  },
};
