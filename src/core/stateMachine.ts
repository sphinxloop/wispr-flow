import type { ArtifactId } from '../config';
import type { AudioEngine, Handle, Sfx } from './audio';
import type { Dialogue } from './dialogue';
import type { VoiceInput } from './voiceInput';
import type { Screens } from '../ui/screens';
import type { Monitor } from '../ui/monitor';
import type { Effects } from '../ui/effects';
import type { Artifacts } from '../ui/artifacts';
import type { Subtitles } from '../ui/subtitles';
import { isAbort } from './util';

export interface UI {
  screens: Screens;
  stage: HTMLElement;
  monitor: Monitor;
  effects: Effects;
  artifacts: Artifacts;
  subtitles: Subtitles;
}

/** Shared mutable game state. Later acts add fields here. */
export interface GameState {
  wrongAuthCount: number;
  artifactsSeen: Set<ArtifactId>;
  rumble: Handle | null;
  fans: Handle | null;
  fromBlack: boolean; // the monitor should fade in from black
}

const newState = (): GameState => ({
  wrongAuthCount: 0,
  artifactsSeen: new Set(),
  rumble: null,
  fans: null,
  fromBlack: false,
});

export interface Step {
  id: string;
  /** Called synchronously by goto(). Async work must use g.signal (abort-aware helpers). */
  enter(g: Game): void | Promise<void>;
  exit?(g: Game): void;
  onVoice?(text: string, normalized: string, g: Game): void | Promise<void>;
  /** Keep the rumble loop running when entering this step. */
  keepAmbient?: boolean;
}

export interface StepContext { game: Game }

export class Game {
  ui!: UI;
  dialogue!: Dialogue;
  audio!: AudioEngine;
  sfx!: Sfx;
  input!: VoiceInput;
  state: GameState = newState();
  inputLocked = false;
  current = '';

  private steps = new Map<string, Step>();
  private ctl = new AbortController();
  private listeners: Array<(id: string) => void> = [];

  /** Aborted whenever the step changes: every pending timer/dialogue/typing stops. */
  get signal(): AbortSignal { return this.ctl.signal; }
  /** Step ids in registration order. */
  get stepIds(): string[] { return [...this.steps.keys()]; }

  register(step: Step): void { this.steps.set(step.id, step); }
  onChange(fn: (id: string) => void): void { this.listeners.push(fn); }

  goto(id: string): void {
    const step = this.steps.get(id);
    if (!step) {
      console.warn(`Unknown step: ${id}`);
      return;
    }
    const prev = this.steps.get(this.current);
    this.ctl.abort(); // cancel everything the previous step had in flight
    try { prev?.exit?.(this); } catch (e) { console.error(e); }
    this.ctl = new AbortController();

    if (id === 'start') this.state = newState();
    if (!step.keepAmbient) {
      this.state.rumble?.stop();
      this.state.rumble = null;
    }
    this.state.fans?.fadeOut(1200);
    this.state.fans = null;

    this.current = id;
    this.inputLocked = false;
    this.input.reset();
    this.input.setActive(false);
    this.ui.artifacts.hide();
    this.ui.subtitles.hide();
    this.ui.monitor.resetMode();
    this.listeners.forEach((f) => f(id));
    this.run(() => step.enter(this));
  }

  /** Called by the voice input when a phrase is submitted. */
  voice(raw: string, normalized: string): void {
    if (this.inputLocked) return;
    const step = this.steps.get(this.current);
    if (step?.onVoice) this.run(() => step.onVoice!(raw, normalized, this));
  }

  private run(fn: () => void | Promise<void>): void {
    try {
      Promise.resolve(fn()).catch((e) => { if (!isAbort(e)) console.error(e); });
    } catch (e) {
      if (!isAbort(e)) console.error(e);
    }
  }
}
