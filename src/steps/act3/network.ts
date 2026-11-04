import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { h, sleep } from '../../core/util';
import { enterAct3, nodeData } from './shared';

const F = CONFIG.act3.finalRelay;

export const act3NetworkStep: Step = {
  id: 'act3Network',
  keepExtra: true,
  async enter(g) {
    const { monitor, relay } = g.ui;
    CONFIG.act3.nodeOrder.forEach((k) => g.state.solved.add(k));
    const globe = enterAct3(g, 'fill');
    relay.nodePanel.close();
    relay.globeHost?.querySelector('.files-menu')?.remove();
    g.inputLocked = true;
    monitor.setHint(null);
    monitor.status.set('mesh', CONFIG.act3.status.meshGlobal, 'ok', CONFIG.act3.ui.meshLabel);
    monitor.appendLine(`${CONFIG.act3.ui.relayNodesLabel}: ${CONFIG.act3.status.awake(3)}`, 'success');

    const [b, l, q] = CONFIG.act3.nodeOrder.map((k) => nodeData(k));
    const pt = (n: typeof b): [number, number] => [n.lat, n.lon];

    g.sfx.chord();
    // Bring the Bangalore-London side into view, then sweep east while the arcs draw.
    await globe.focusOn(25, 38, 900);
    const arcs = globe.drawArcs([[pt(b), pt(l)], [pt(l), pt(q)]], F.arcDrawMs);
    globe.focusOn(-2, 112, F.arcDrawMs + 400);
    await arcs;

    const host = relay.globeHost;
    if (host) {
      const banner = h('div', 'net-banner', host);
      banner.textContent = F.banner;
    }
    const wave = globe.wave(F.waveMs);
    monitor.appendLine(CONFIG.act3.ui.networkLog, 'success');
    await Promise.all([wave, g.dialogue.play(F.success, g.signal)]);
    await sleep(600, g.signal);
    g.goto(g.has('act4Intro') ? 'act4Intro' : 'end');
  },
};
