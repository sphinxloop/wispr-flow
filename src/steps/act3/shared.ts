import { CONFIG } from '../../config';
import type { Game, NodeKey } from '../../core/stateMachine';
import type { Globe } from '../../ui/globe';
import { enterMonitor } from '../common';

export const nodeData = (key: NodeKey) => CONFIG.act3.nodes[key];
export const STEP_OF: Record<NodeKey, string> = {
  bangalore: 'act3Bangalore',
  london: 'act3London',
  queensland: 'act3Queensland',
};

/** RELAY NODES status row. */
export function updateMesh(g: Game) {
  const n = g.state.solved.size;
  g.ui.monitor.status.set('mesh', CONFIG.act3.status.awake(n), n >= 3 ? 'ok' : 'warn', CONFIG.act3.ui.relayNodesLabel);
}

/** Solved nodes glow green; the rest are plain. */
export function refreshNodes(g: Game, globe: Globe) {
  for (const k of CONFIG.act3.nodeOrder) globe.setNodeState(nodeData(k).name, g.state.solved.has(k) ? 'solved' : 'idle');
}

/** Shared setup for every Act 3 step (also covers debug jumps): terminal, status, globe, node states. */
export function enterAct3(g: Game, layout: 'fill' | 'puzzle'): Globe {
  enterMonitor(g, 'green', true);
  g.ui.monitor.applyStage('relay');
  updateMesh(g);
  const globe = g.ui.relay.actScene(layout);
  globe.onNodeClick(null);
  refreshNodes(g, globe);
  return globe;
}

/** Where to go after a node's file is closed. */
export const nextAfterNode = (g: Game) => (g.state.solved.size >= CONFIG.act3.nodeOrder.length ? 'act3Final' : 'act3Intro');
