import { CONFIG } from '../../config';
import type { Line } from '../../config';
import type { Game, NodeKey, Step } from '../../core/stateMachine';
import { enterAct3, nextAfterNode, nodeData, updateMesh } from './shared';
import { unlock } from '../common';

/** What a node's puzzle panel provides. */
export interface NodeView {
  /** Called once the enter dialogue is over (start loops, timers). */
  ready?(): void;
  /** Dialogue is about to play (pause loops). */
  pause?(): void;
  /** Dialogue finished (resume loops). */
  resume?(): void;
  /** Judge a spoken answer; may animate the panel. */
  check(raw: string, normalized: string): boolean;
  /** Correct answer: play the success moment, resolves when done. */
  solved?(): Promise<void>;
  /** Tear down timers/audio. */
  stop(): void;
}

export interface NodeSpec {
  stepId: string;
  key: NodeKey;
  hint: string;
  /** Start things that should run during the enter dialogue (e.g. loud static). */
  build(g: Game, body: HTMLElement, onStop: (fn: () => void) => void): NodeView;
  enter: Line[];
  wrongFirst: Line[];
  success: Line[];
}

/** Shared flow for the three node puzzles: enter dialogue, answer check, wrong counter, success, personnel file. */
export function makeNodeStep(spec: NodeSpec): Step {
  let view: NodeView | null = null;
  return {
    id: spec.stepId,
    keepExtra: true,
    async enter(g) {
      const { monitor, relay } = g.ui;
      const info = nodeData(spec.key);
      const globe = enterAct3(g, 'puzzle');
      globe.focusOn(info.lat, info.lon, CONFIG.act3.globe.focusMs);
      g.inputLocked = true;
      monitor.setHint(null);
      const body = relay.nodePanel.open(info.title, info.name, () => g.goto('act3Intro'));
      view = spec.build(g, body, (fn) => relay.nodePanel.onClose(fn));
      view.ready?.();
      await g.dialogue.play(spec.enter, g.signal);
      view.resume?.();
      monitor.setHint(spec.hint);
      unlock(g);
    },
    async onVoice(raw, normalized, g) {
      const { monitor, relay } = g.ui;
      if (!view) return;
      const ok = view.check(raw, normalized);
      g.inputLocked = true;
      view.pause?.();
      if (!ok) {
        const n = ++g.state.nodeWrong[spec.key];
        await g.dialogue.play(n === 1 ? spec.wrongFirst : CONFIG.act3.tryAgain, g.signal);
        view.resume?.();
        unlock(g);
        return;
      }
      // success
      monitor.setHint(null);
      if (relay.nodePanel.backBtn) relay.nodePanel.backBtn.hidden = true;
      await view.solved?.();
      await g.dialogue.play(spec.success, g.signal);
      g.state.solved.add(spec.key);
      relay.liveGlobe?.setNodeState(nodeData(spec.key).name, 'solved');
      updateMesh(g);
      const sig = g.signal;
      await relay.personnel.open(spec.key);
      if (sig.aborted) return;
      g.goto(nextAfterNode(g));
    },
    exit(g) {
      view?.stop();
      view = null;
      g.ui.relay.nodePanel.close();
      g.ui.relay.personnel.close();
    },
  };
}
