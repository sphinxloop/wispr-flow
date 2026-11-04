import './style.css';
import { CONFIG } from './config';
import { Game } from './core/stateMachine';
import { AudioEngine, Sfx } from './core/audio';
import { Dialogue } from './core/dialogue';
import { VoiceInput } from './core/voiceInput';
import { isAbort } from './core/util';
import { Screens } from './ui/screens';
import { Monitor } from './ui/monitor';
import { Effects } from './ui/effects';
import { Artifacts } from './ui/artifacts';
import { Subtitles } from './ui/subtitles';
import { Cinematic } from './ui/cinematic';
import { RelayPanel } from './ui/relayPanel';
import { Debug } from './ui/debug';
import { startStep } from './steps/start';
import { introStep } from './steps/intro';
import { standbyStep } from './steps/standby';
import { spikeStep } from './steps/spike';
import { wakeStep } from './steps/wake';
import { evidenceStep } from './steps/evidence';
import { grantedStep } from './steps/granted';
import { act2IntroStep } from './steps/act2/act2Intro';
import { act2Video1Step, act2Video2Step } from './steps/act2/act2Video';
import { relayStep } from './steps/act2/relay';
import { archiveStep } from './steps/act2/archive';
import { endStep } from './steps/end';

// Aborted waits reject with AbortError by design; never surface them.
window.addEventListener('unhandledrejection', (e) => { if (isAbort(e.reason)) e.preventDefault(); });

const app = document.getElementById('app') as HTMLElement;
const game = new Game();
const signal = () => game.signal;

const audio = new AudioEngine();
const sfx = new Sfx(audio);
const screens = new Screens(app);
audio.addVideo(screens.video);

const monitor = new Monitor(screens.monitorScreen, signal);
const effects = new Effects(monitor.root, app, signal);
const artifacts = new Artifacts(monitor.evidencePanel, monitor.evidenceList, app);
const subtitles = new Subtitles(app);
const input = new VoiceInput(monitor.promptRow, monitor.warnEl, sfx, () => game.inputLocked);
const dialogue = new Dialogue(audio, subtitles, monitor);
const cinematic = new Cinematic(app, audio, dialogue);
const relay = new RelayPanel(monitor);

game.ui = { screens, monitor, effects, artifacts, subtitles, cinematic, relay };
game.audio = audio;
game.sfx = sfx;
game.dialogue = dialogue;
game.input = input;

input.onSubmit = (raw, normalized) => game.voice(raw, normalized);
artifacts.setHooks({
  play: (line, sig) => dialogue.play([line], sig),
  onSeen: (id) => game.state.artifactsSeen.add(id),
  onClose: () => input.focus(),
});

// Global HUD: mute + skip link on every screen.
const hud = document.createElement('div');
hud.className = 'hud';
const mute = document.createElement('button');
mute.className = 'mute-btn';
mute.dataset.nofocus = '1';
mute.setAttribute('aria-label', 'Toggle sound');
const paintMute = () => {
  mute.textContent = audio.muted ? 'SOUND OFF' : 'SOUND ON';
  mute.setAttribute('aria-pressed', String(audio.muted));
};
paintMute();
mute.addEventListener('click', () => { audio.toggleMute(); paintMute(); });
const skip = document.createElement('a');
skip.className = 'skip-link';
skip.dataset.nofocus = '1';
skip.textContent = CONFIG.skipLink.text;
skip.href = CONFIG.skipLink.href; // #final: placeholder, the link just navigates
hud.append(mute, skip);
app.appendChild(hud);

new Debug(game, monitor.root, app);

[
  startStep, introStep, standbyStep, spikeStep, wakeStep, evidenceStep, grantedStep,
  act2IntroStep, act2Video1Step, act2Video2Step, relayStep, archiveStep, endStep,
].forEach((s) => game.register(s));
game.goto('start');
