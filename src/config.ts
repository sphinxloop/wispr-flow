// THE LAST CHANNEL — all editable content lives here.
// Times are in milliseconds unless noted.

export type Speaker = 'survivor' | 'nova';
export interface Line { id: string; speaker: Speaker; text: string }
export interface Cue { start: number; end: number; text: string } // seconds
export type CoreState = 'dormant' | 'alert' | 'online' | 'speaking' | 'surge' | 'hidden';
export type Tone = 'dim' | 'ok' | 'warn' | 'bad' | 'alert'; // alert = red + blinking
export interface StatusRow { key: string; label: string; value: string; tone: Tone; bar?: boolean }
export interface Stage { core: CoreState; status?: Record<string, [value: string, tone?: Tone, label?: string]> }

export const CONFIG = {
  title: 'THE LAST CHANNEL',
  // Master switch for ALL subtitles (intro cues + dialogue). Off for now.
  subtitlesEnabled: false,
  subtitle: 'Headphones on. Voice input required — hold your Wispr Flow key to speak.',
  beginLabel: 'Begin',
  skipLink: { text: 'Skip to the real Vishal →', href: '#final' },

  paths: {
    introVideo: '/media/intro.mp4',
    act2aVideo: '/media/act2a.mp4', // "The Silence"
    act2bVideo: '/media/act2b.mp4', // "The Last Channel"
    audioDir: '/audio/', // dialogue plays <audioDir><id>.mp3 when present
  },

  // Intro subtitles (seconds into intro.mp4). Adjust freely.
  introCues: [
    { start: 1.0, end: 3.5, text: "...head's pounding." },
    { start: 5.0, end: 7.5, text: 'How long was I out?' },
    { start: 10.0, end: 12.5, text: 'What... are those?' },
    { start: 15.5, end: 18.0, text: "It's still running. How?" },
  ] as Cue[],

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

  // Full-screen terminal UI.
  terminal: {
    header: 'NOVA EMERGENCY TERMINAL — MESH NODE 07',
    power: 'POWER 3%',
    powerGranted: 'POWER 41%', // shown after the power surge
    evidenceTitle: 'RECOVERED EVIDENCE',
    promptLabel: 'VOICE ▸',
    promptHint: 'Hold your Wispr Flow key to speak',
    promptPlaceholder: '_',
    maxLogLines: 60,
    glitchLineEveryMs: [4000, 11000] as [number, number], // random interval for a passing glitch line

    headerGlyph: '◈',
    logTitle: 'SYSTEM LOG',
    statusTitle: 'SYSTEM STATUS',
    clockStart: '16:07:31', // the fake clock (hh:mm:ss) starts here and counts real seconds
    dateShort: '14.03.2041',
    promptTransmitting: 'NOVA TRANSMITTING…',
    lightLabels: { 'amber-pulse': 'STANDBY', green: 'ONLINE', red: 'SIGNAL SPIKE', off: 'OFFLINE' } as Record<string, string>,

    // Typed into the log the first time the monitor appears (before the standby lines).
    boot: [
      'BIOS v4.1 — MESH NODE 07',
      'CHECKING MEMORY ........ 61% CORRUPTED',
      'GRID CONNECTION ........ NONE',
      'BACKUP CELL ............ 3%',
      'INPUT DEVICES .......... 0 FOUND',
      'LOADING NOVA KERNEL ....  [DORMANT]',
    ],
    bootCharMs: 8,

    // The Nova core visual (centrepiece).
    core: {
      name: 'NOVA',
      words: { dormant: 'STANDBY', alert: 'SIGNAL SPIKE', online: 'ONLINE', speaking: 'TRANSMITTING', surge: 'FULL ACCESS', hidden: '' } as Record<CoreState, string>,
      surgeMs: 3600, // how long the surge lasts before the core settles to "online"
      glitchMs: 700, // glitch burst when the alert starts
    },

    // SYSTEM STATUS rows (key -> label / value / tone). `bar` draws a segmented bar from the number in the value.
    statusSegments: 10,
    statusRows: [
      { key: 'nova', label: 'NOVA', value: 'STANDBY', tone: 'warn' },
      { key: 'power', label: 'POWER', value: '3%', tone: 'warn', bar: true },
      { key: 'mesh', label: 'MESH LINK', value: '1/∞', tone: 'dim' },
      { key: 'keyboard', label: 'KEYBOARD', value: 'DESTROYED', tone: 'bad' },
      { key: 'voice', label: 'VOICE CHANNEL', value: 'OPEN', tone: 'ok' },
      { key: 'threat', label: 'THREAT', value: 'LOW', tone: 'dim' },
      { key: 'date', label: 'DATE', value: '14 MAR 2041', tone: 'warn' },
    ] as StatusRow[],

    // Core state + status values per key moment (applied on top of the rows above).
    stages: {
      standby: { core: 'dormant' },
      spike: { core: 'alert', status: { threat: ['HIGH', 'alert'] } },
      listening: { core: 'dormant', status: { threat: ['LISTENING', 'warn'] } },
      online: { core: 'online', status: { nova: ['ONLINE', 'ok'], threat: ['LISTENING', 'warn'] } },
      granted: { core: 'surge', status: { nova: ['ONLINE', 'ok'], power: ['41%', 'ok'], threat: ['LISTENING', 'warn'] } },
      act2: { core: 'online', status: { nova: ['ONLINE', 'ok'], power: ['41%', 'ok'], threat: ['LISTENING', 'warn'] } },
      relay: {
        core: 'hidden',
        status: { nova: ['ONLINE', 'ok'], power: ['41%', 'ok'], mesh: ['0/3 LOCATED', 'warn', 'RELAY NODES'], threat: ['LISTENING', 'warn'] },
      },
    } as Record<string, Stage>,
  },

  act2: {
    loading: ['ACCESS GRANTED — LOADING INCIDENT RECORD...'],
    today: [{ id: 'nova_12', speaker: 'nova', text: 'Today is the fourteenth of March, 2041.' }] as Line[],
    glitchTransitionMs: 900,
    duckLevel: 0.6, // video volume while Nova speaks over it
    duckFadeMs: 300,
    videoA: {
      // startAt = seconds into the video when the lines start (played back-to-back).
      startAt: 1.0,
      lines: [
        { id: 'nova_13', speaker: 'nova', text: 'They came with one signal. We call it the Silence. It burned every power grid and every keyboard on the planet.' },
      ] as Line[],
    },
    videoB: {
      startAt: 0.5,
      lines: [
        { id: 'nova_14', speaker: 'nova', text: "Voice is the only interface that survived. Wispr Flow runs on what's left of the emergency mesh." },
        { id: 'nova_15', speaker: 'nova', text: "It's the last channel humanity has. And it can't reach far enough." },
      ] as Line[],
      // Played on the held last frame after the Nova lines.
      after: [{ id: 's14', speaker: 'survivor', text: 'So everyone out there... is just alone?' }] as Line[],
    },
    returnFadeMs: 1200,
    videoFadeMs: 700, // fade from black at the start of each video scene
    fx: {
      stampMs: 250, // SEALED stamp slam
      stampShakeMs: 300,
      crackMs: 900, // stamp crack + fall
      glitchBurstEveryMs: 220, // sfx.glitch() repeats during the act2Intro glitch
      unsealedPauseMs: 1500, // pause after ARCHIVE UNSEALED before fading out
      nodeFadeMs: 800,
    },
    globeStyle: { tiltDeg: 18, latStepDeg: 20, lonStepDeg: 20, startLonDeg: 40 },

    relayFile: {
      lines: ['PROJECT RELAY', 'CLASSIFICATION: SEALED', 'AUTHOR: VISHAL K.', 'STATUS: ████ ██████'],
      stamp: 'SEALED',
      unsealed: 'ARCHIVE UNSEALED',
    },
    file: [{ id: 'nova_16', speaker: 'nova', text: "But there's one file in my archive I was never allowed to open. Project Relay. Author: Vishal K." }] as Line[],
    globe: [{ id: 'nova_17', speaker: 'nova', text: 'He was building a way to connect the whole planet without a single power grid. Inspired by Tesla.' }] as Line[],
    nodes: [
      { id: 'nova_18', speaker: 'nova', text: 'He hid three relay nodes across the world. If we wake them, people can talk to each other again.' },
      { id: 's15', speaker: 'survivor', text: "Then let's find them." },
      { id: 'nova_19', speaker: 'nova', text: 'Your clearance can open it now. Say: open the archive.' },
    ] as Line[],
    prompt: 'VOICE ▸ SAY: "OPEN THE ARCHIVE"',
    wrong: 'Say it clearly. Open the archive.', // Nova, text only (no audio)
    globeRotateSecs: 40, // one full turn
    globeDrawMs: 3000,
    relayNodes: [
      { name: 'BANGALORE', lat: 12.97, lon: 77.59 },
      { name: 'LONDON', lat: 51.51, lon: -0.13 },
      { name: 'QUEENSLAND', lat: -20.92, lon: 142.7 },
    ],
  },

  answers2: {
    archiveWords: ['open', 'archive'], // all must appear (after normalising)
  },

  endCard: 'ACT 3 — COMING SOON',
};

export type ArtifactId = keyof typeof CONFIG.evidence;
