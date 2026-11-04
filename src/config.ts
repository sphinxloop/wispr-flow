// THE LAST CHANNEL — all editable content lives here.
// Positions are percentages of the 16:9 stage (the monitor image), so they
// stay aligned at any window size. Times are in milliseconds unless noted.

export type Speaker = 'survivor' | 'nova';
export interface Line { id: string; speaker: Speaker; text: string }
export interface Cue { start: number; end: number; text: string } // seconds
export interface Rect { left: number; top: number; width: number; height: number } // %

export const CONFIG = {
  title: 'THE LAST CHANNEL',
  subtitle: 'Headphones on. Voice input required — hold your Wispr Flow key to speak.',
  beginLabel: 'Begin',
  skipLink: { text: 'Skip to the real Vishal →', href: '#final' },

  paths: {
    introVideo: '/media/intro.mp4',
    terminalImage: '/media/terminal.png',
    audioDir: '/audio/', // dialogue plays <audioDir><id>.mp3 when present
  },

  // Intro subtitles (seconds into intro.mp4). Adjust freely.
  introCues: [
    { start: 1.0, end: 3.5, text: "...head's pounding." },
    { start: 5.0, end: 7.5, text: 'How long was I out?' },
    { start: 10.0, end: 12.5, text: 'What... are those?' },
    { start: 15.5, end: 18.0, text: "It's still running. How?" },
  ] as Cue[],

  // Stage layout (percent of the 16:9 monitor image).
  layout: {
    screenText: { left: 30, top: 22, width: 44, height: 52 } as Rect,
    statusLight: { left: 72.6, top: 94.2, size: 1.4 }, // size = % of stage width
    voiceInput: { left: 30, top: 86.5, width: 40, height: 5.5 } as Rect,
    artifacts: {
      clock: { left: 4, top: 18, width: 13, height: 20 } as Rect,
      calendar: { left: 4, top: 46, width: 13, height: 22 } as Rect,
      badge: { left: 83, top: 30, width: 12, height: 20 } as Rect,
    },
  },

  timing: {
    typewriterCharMs: 28,
    lineGapMs: 450, // pause after each dialogue line
    noAudioBaseMs: 1200, // subtitle-only duration = base + chars * perChar
    noAudioPerCharMs: 55,
    autoSubmitMs: 800, // delay after a voice insert before it is submitted
    minVoiceChars: 3, // a single input event must insert at least this many chars
    introFadeMs: 1500,
    shakeMs: 2000,
    endFadeMs: 2500,
  },

  audio: {
    novaBandLowHz: 300,
    novaBandHighHz: 3000,
    novaDistortion: 12, // 0 = clean
    novaStaticGain: 0.025,
  },

  // Screen text blocks. Each string is one line on the CRT.
  screens: {
    standby: ['EMERGENCY POWER: 3%', 'KEYBOARD MODULE: DESTROYED', 'NOVA ● STANDBY'],
    standbyHint: 'VOICE INPUT ONLY — SAY: "NOVA, WAKE UP"',
    spike: ['⚠ SIGNAL SPIKE DETECTED', 'VOICE LEVEL EXCEEDS SAFE THRESHOLD', 'THEY LISTEN.', 'WHISPER.'],
    wakeHint: 'WHISPER HER NAME — SAY: "NOVA, WAKE UP"',
    online: ['NOVA ● ONLINE — RESTRICTED MODE'],
    authPrompt: 'AUTHENTICATION: TIME · DATE · CLEARANCE',
    granted: ['HUMAN WITNESS CONFIRMED — FULL ACCESS GRANTED'],
    keyboardDestroyed: 'KEYBOARD MODULE DESTROYED. VOICE ONLY.',
    novaPrefix: 'NOVA > ',
  },

  dialogue: {
    standby: [
      { id: 's07', speaker: 'survivor', text: "The keyboard's gone... but that light. It's pulsing. Like breathing." },
      { id: 's08', speaker: 'survivor', text: 'Nova... is that the assistant? Maybe I can wake her.' },
    ] as Line[],
    afterSpike: [
      { id: 's09', speaker: 'survivor', text: '...Something heard that.' },
      { id: 's10', speaker: 'survivor', text: 'Quiet. I have to be quiet.' },
    ] as Line[],
    novaWake: [
      { id: 'nova_01', speaker: 'nova', text: '...I hear you.' },
      { id: 'nova_02', speaker: 'nova', text: 'You were right to whisper. They hunt anything loud.' },
      { id: 'nova_03', speaker: 'nova', text: "I've been alone in this system for a long time. I need to be sure you're human before I open anything to you." },
      { id: 'nova_04', speaker: 'nova', text: 'Tell me what happened in this room.' },
    ] as Line[],
    wrong1: [{ id: 'nova_05', speaker: 'nova', text: "That's not what happened here. Look around you." }] as Line[],
    wrong2: [{ id: 'nova_06', speaker: 'nova', text: "The clock. The calendar. Your badge. It's all still there." }] as Line[],
    granted: [
      { id: 'nova_07', speaker: 'nova', text: 'Third of March. Four o\'clock. Level seven.' },
      { id: 'nova_08', speaker: 'nova', text: 'You were here when it happened.' },
      { id: 'nova_09', speaker: 'nova', text: 'Every clock on Earth stopped at that exact moment. Eleven days ago.' },
      { id: 'nova_10', speaker: 'nova', text: 'Your clearance is why I can trust you.' },
      { id: 'nova_11', speaker: 'nova', text: "I'm Nova. Stay quiet. And listen to me." },
    ] as Line[],
  },

  // Evidence close-ups (drawn in SVG). `display` is the text shown on the artifact.
  evidence: {
    clock: { label: 'CLOCK', display: '4:00', line: { id: 's11', speaker: 'survivor', text: 'Stopped at four o\'clock. Everything just... stopped.' } as Line },
    calendar: { label: 'CALENDAR', display: '03 MARCH', line: { id: 's12', speaker: 'survivor', text: 'Third of March. Torn, but still hanging there.' } as Line },
    badge: { label: 'BADGE', display: 'ACCESS LEVEL 7', line: { id: 's13', speaker: 'survivor', text: "Access level seven. The name's burnt away." } as Line },
  },
  backLabel: '← Back',

  answers: {
    wakeKeyword: 'nova', // second attempt must contain this (after normalising)
    authCode: '437', // compared after normalising + removing spaces
  },

  endCard: 'ACT 2 — COMING SOON',
};

export type ArtifactId = keyof typeof CONFIG.evidence;
