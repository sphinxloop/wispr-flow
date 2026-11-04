import { CONFIG } from '../../config';
import type { Game, NodeKey } from '../../core/stateMachine';
import type { Globe } from '../../ui/globe';
import { enterMonitor } from '../common';
import { h } from '../../core/util';

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
  syncFrequencies(g);
  return globe;
}

/** Where to go after a node's file is closed. */
export const nextAfterNode = (g: Game) => (g.state.solved.size >= CONFIG.act3.nodeOrder.length ? 'act3Final' : 'act3Intro');

/** Nodes solved just now: their FREQUENCIES row gets a highlight when it first appears. */
const fresh = new Set<NodeKey>();
export const markFresh = (key: NodeKey) => fresh.add(key);

/** RECOVERED FREQUENCIES panel over the globe: one row per solved node, in the configured (shuffled) order. */
export function syncFrequencies(g: Game, emphasize = false) {
  const host = g.ui.relay.globeHost;
  if (!host) return;
  const F = CONFIG.act3.frequencies;
  let panel = host.querySelector<HTMLElement>('.freq-panel');
  if (!panel) {
    panel = h('div', 'freq-panel', host);
    h('div', 'freq-title', panel).textContent = CONFIG.act3.ui.frequenciesTitle;
    h('div', 'freq-rows', panel);
  }
  panel.classList.toggle('emph', emphasize);
  const rows = panel.querySelector<HTMLElement>('.freq-rows')!;
  for (const k of F.displayOrder) {
    if (!g.state.solved.has(k)) continue;
    let row = rows.querySelector<HTMLElement>(`[data-k="${k}"]`);
    if (!row) {
      row = h('div', 'freq-row', rows);
      row.dataset.k = k;
      row.textContent = F.rows[k];
      if (fresh.has(k)) row.classList.add('fresh');
    }
    rows.appendChild(row);
  }
  fresh.clear();
}
