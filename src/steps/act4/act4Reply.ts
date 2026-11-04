import { CONFIG } from '../../config';
import type { Step } from '../../core/stateMachine';
import { saveReply } from '../../core/replies';
import { enterMonitor, unlock } from '../common';
import { getTransmission, hideAllPanels, setHint } from '../../ui/transmission';
import { sentWhoosh } from '../../sfx4';

export const act4ReplyStep: Step = {
  id: 'act4Reply',
  keepExtra: true,
  enter(g) {
    const { monitor } = g.ui;
    const tx = getTransmission(g);
    enterMonitor(g, 'green', true);
    setHint(g, CONFIG.hints.reply);
    monitor.core.setState('hidden');

    if (!tx.hasLetter) { // debug jump: show the whole letter at once
      hideAllPanels(g);
      tx.clear();
      tx.openLetter();
      tx.skipRequested = true;
      void tx.typeLetter(CONFIG.act4.letter, 0, g.signal, () => {});
    }
    tx.compactLetter();

    const name = tx.openReply();
    // The name box is the one place the keyboard works. While it has focus the voice box
    // is disabled, otherwise VoiceInput's blur handler would steal focus straight back.
    const voice = g.input.el;
    name.addEventListener('focus', () => { voice.disabled = true; });
    name.addEventListener('blur', () => { voice.disabled = false; g.input.focus(); });
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } });
    unlock(g);
  },
  exit(g) {
    g.input.el.disabled = false;
  },
  async onVoice(text, _normalized, g) {
    const A = CONFIG.act4;
    const { monitor } = g.ui;
    const tx = getTransmission(g);
    const name = tx.nameInput?.value.trim() ?? '';
    g.inputLocked = true;
    tx.showOutgoing(text);
    if (tx.nameInput) tx.nameInput.disabled = true;
    setHint(g, null);

    await saveReply({ name, message: text }); // never throws; failure is silent for the visitor
    monitor.appendLine(A.sentLog, 'success');
    sentWhoosh(g.audio);
    await g.dialogue.play(A.sent, g.signal);
    tx.showContinue(A.continueLabel, () => g.goto('final'));
  },
};
