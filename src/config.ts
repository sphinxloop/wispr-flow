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
  // The Act 2 videos already contain Nova's voice: skip nova_13–15 and s14 there,
  // play the videos at full volume and continue when each ends.
  videoVoiceBaked: true,
  audioLogLabel: '◉ AUDIO LOG', // pulses in the log while a line with no audio file is "playing"
  audioLogSpeakers: { nova: 'NOVA', survivor: 'SURVIVOR' } as Record<Speaker, string>, // appended to the label
  subtitle: 'Headphones on. Voice input required — hold your Wispr Flow key to speak.',
  beginLabel: 'Begin',
  skipLink: { text: 'Skip to the real Vishal →', href: '#final' },

  paths: {
    introVideo: '/media/intro.mp4',
    act2Video: '/media/act2.mp4', // full Act 2 cinematic ("The Silence" + "The Last Channel")
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
    noAudioBaseMs: 0, // no-audio duration = max(noAudioMinMs, base + chars * perChar)
    noAudioPerCharMs: 55,
    noAudioMinMs: 1200,
    maxIdleMs: 1500, // never leave longer than this with nothing animating or typing
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
    novaStaticGain: 0, // faint radio hiss under Nova's voice; 0 = off
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
    wrong: [{ id: 'nova_20', speaker: 'nova', text: 'Say it clearly. Open the archive.' }] as Line[],
    globeRotateSecs: 40, // one full turn
    globeDrawMs: 3000,
    relayNodes: [
      { name: 'BANGALORE', lat: 12.97, lon: 77.59 },
      { name: 'LONDON', lat: 51.51, lon: -0.13 },
      { name: 'QUEENSLAND', lat: -27.47, lon: 153.03 },
    ],
  },

  answers2: {
    archiveWords: ['open', 'archive'], // all must appear (after normalising)
  },

  endCard: 'ACT 3 — COMING SOON', // legacy, unused once Act 3 is wired

  // Hint line shown above the prompt bar on every voice-input step. Always mentions Wispr Flow.
  hints: {
    wake: 'Hold your Wispr Flow key and say: NOVA, WAKE UP',
    whisper: 'Hold your Wispr Flow key and WHISPER: NOVA, WAKE UP',
    auth: 'Use Wispr Flow to speak the access code: TIME · DATE · CLEARANCE',
    archive: 'Hold your Wispr Flow key and say: OPEN THE ARCHIVE',
    chooseNode: 'Click a relay node on the globe to wake it',
    bangalore: 'Count back one letter, then say the word with Wispr Flow',
    london: 'Say the frequency with Wispr Flow',
    queensland: 'Read the highlighted letters and say the call sign with Wispr Flow',
    finalRelay: 'Say all three frequencies, oldest node first, with Wispr Flow',
    reply: 'Speak your reply to Vishal with Wispr Flow',
  },
  // Large centred hint overlay (also keeps the small hint above the prompt bar).
  hintOverlay: {
    enabled: true,
    fadeMs: 350,
    autoHideMs: 4500, // fades by itself after this long (0 = stay until voice input); the small hint by the prompt stays
    icon: '🎙', // shown beside a small key-cap glyph
    keyLabel: 'WISPR FLOW',
  },

  // Evidence reveal after nova_04: blink → close-up + line, for each artifact, then fly into the tiles.
  evidenceReveal: {
    order: ['clock', 'calendar', 'badge'] as ('clock' | 'calendar' | 'badge')[],
    blinkMs: 600, // eyelid close + open
    holdNoAudioMs: 2500, // how long each close-up stays when its voice file is missing
    holdAfterLineMs: 400, // extra pause after the line finishes
    flyMs: 500, // each close-up shrinking into its tile
    flyStaggerMs: 500, // one at a time: each starts as the previous lands
  },

  // ===================== ACT 3: THE RELAY =====================
  act3: {
    status: {
      awake: (n: number) => `${n}/3 AWAKE`, // RELAY NODES row
      meshGlobal: 'GLOBAL',
    },
    intro: [
      { id: 'nova_21', speaker: 'nova', text: 'The archive is open. Three nodes. Bangalore. London. Queensland.' },
      { id: 'nova_22', speaker: 'nova', text: 'Choose one. Wake it with your voice.' },
    ] as Line[],
    tryAgain: [{ id: 'nova_32', speaker: 'nova', text: "That's not it. Try again." }] as Line[],
    globe: {
      rotateDegPerSec: 6, // idle spin
      focusMs: 1400, // rotate-to-node animation
      tiltDeg: -15,
      ocean: '#020604',
      line: 'rgba(170, 255, 140, 0.55)',
      graticule: 'rgba(170, 255, 140, 0.12)',
      nodeColor: '#ffb347',
      nodeSolvedColor: '#9dff7a',
    },
    nodes: {
      bangalore: {
        name: 'BANGALORE', lat: 12.97, lon: 77.59, title: 'NODE 01 — DECRYPT',
        enter: [{ id: 'nova_23', speaker: 'nova', text: 'Bangalore. His first node. The note is corrupted.' }] as Line[],
        noteLabel: 'CORRUPTED FIELD NOTE',
        note: 'THE WORD THAT HOLDS THEM TOGETHER:',
        cipher: 'SFMBZ', // each letter shifted forward by ONE
        shift: 1,
        answer: 'relay',
        wrongFirst: [{ id: 'nova_24', speaker: 'nova', text: 'Vishal shifted his letters forward. Count back.' }] as Line[],
        success: [{ id: 'nova_25', speaker: 'nova', text: 'Decrypted. Relay. Node one is awake.' }] as Line[],
      },
      london: {
        name: 'LONDON', lat: 51.51, lon: -0.13, title: 'NODE 02 — TUNE',
        enter: [{ id: 'nova_26', speaker: 'nova', text: 'London. The node is buried in static. It needs a frequency.' }] as Line[],
        cityLabel: 'LONDON · 51.5° N',
        note: 'EVERY NODE LISTENS TO WHERE IT STANDS.',
        readoutEmpty: '---.--',
        min: 51.0, max: 51.6, // accepted range
        dialMin: 0, dialMax: 100, // dial scale shown
        staticGain: 0.22, // loud static at full distance
        staticFalloff: 25, // static quietens as |said - 51.3| shrinks (units)
        target: 51.3,
        toneHz: 432,
        wrongFirst: [{ id: 'nova_27', speaker: 'nova', text: 'Every node listens to where it stands. London stands at fifty-one point five, north.' }] as Line[],
        success: [{ id: 'nova_28', speaker: 'nova', text: 'Signal clean. Node two is awake.' }] as Line[],
      },
      queensland: {
        name: 'QUEENSLAND', lat: -27.47, lon: 153.03, title: 'NODE 03 — HANDSHAKE',
        enter: [{ id: 'nova_29', speaker: 'nova', text: "Queensland. It's still calling out. Listen." }] as Line[],
        morse: '-. --- ...- .-',
        unitMs: 110, // dot length; dash = 3 units, gaps per standard Morse
        loopGapMs: 1800,
        toneHz: 640,
        replayLabel: 'REPLAY',
        slotsLabel: 'CALL SIGN',
        answer: 'nova',
        wrongFirst: [{ id: 'nova_30', speaker: 'nova', text: 'Use the card. Short and long. Dots and dashes.' }] as Line[],
        success: [{ id: 'nova_31', speaker: 'nova', text: "...Nova. He named me. I didn't know." }] as Line[],
      },
    },
    nodeOrder: ['bangalore', 'london', 'queensland'] as const,

    // Small UI labels for the Act 3 panels.
    ui: {
      back: '← BACK TO GLOBE',
      relayNodesLabel: 'RELAY NODES',
      meshLabel: 'MESH LINK',
      alphabetTitle: 'ALPHABET INDEX',
      morseTitle: 'MORSE REFERENCE',
      readoutLabel: 'FREQUENCY',
      signalLabel: 'INCOMING SIGNAL',
      glitchChars: '▒░#%@&?/',
      networkLog: 'ALL RELAY NODES AWAKE — MESH LINK: GLOBAL',
      frequenciesTitle: 'RECOVERED FREQUENCIES',
    },
    // A row is added to RECOVERED FREQUENCIES as each node is solved. Shown in this (shuffled) order.
    frequencies: {
      displayOrder: ['london', 'queensland', 'bangalore'] as const,
      rows: {
        bangalore: 'BANGALORE · PLANTED 2020 · 12.97',
        london: 'LONDON · PLANTED 2022 · 51.5',
        queensland: 'QUEENSLAND · PLANTED 2024 · 27.47',
      },
    },

    personnelTitle: 'RECOVERED PERSONNEL FILE',
    closeLabel: 'CLOSE',
    filesLabel: 'FILES',
    personnel: {
      bangalore: {
        header: 'VISHAL K. — BANGALORE — PLANTED 2020 — COORDINATES 12.97° N',
        entries: [
          'Tech & Operations Lead, Rams Interiors (2020–2022): digitised operations, project tracking, vendor coordination and reporting.',
          'Growth & Revenue Operations Lead, Keshav Interiors (2025): contributed to 120% year-on-year revenue growth; moved sales and operations to digital-first workflows.',
          'Founder & Product Lead, Rivl (2025–2026): built a revenue intelligence platform unifying competitive and deal intelligence — AI pipelines for competitor discovery, web ingestion, LLM analysis and win/loss. Concept to launch in 9 months.',
          "What didn't work: [PLACEHOLDER]",
          'What I learned: [PLACEHOLDER]',
        ],
      },
      london: {
        header: 'VISHAL K. — LONDON — PLANTED 2022 — COORDINATES 51.5° N',
        entries: [
          'MS Engineering Management, Kingston University London (2022–2023). Ran founder meetups connecting students with the London startup ecosystem.',
          "Commercial Analyst, Sainsbury's / Argos (2023–2025): commercial planning for a ~£700M category in an 18-person team; coordinated operations across Europe, China and India; automated recurring analysis and reporting, later adopted across multiple categories.",
        ],
      },
      queensland: {
        header: 'VISHAL K. — QUEENSLAND (REMOTE) — PLANTED 2024 — COORDINATES 27.47° S',
        entries: [
          'Product Management Associate, Green KPI (2024): early-stage project-management software for sustainability-focused industries; turned customer and business requirements into product workflows.',
        ],
      },
    },
    personnelCharMs: 6,

    finalRelay: {
      intro: [
        { id: 'nova_33', speaker: 'nova', text: 'Three nodes. One network.' },
        { id: 'nova_34', speaker: 'nova', text: 'Speak their frequencies, in the order Vishal planted them.' },
      ] as Line[],
      answer: [12.97, 51.5, 27.47], // order matters; sign/"south" ignored
      tolerance: 0.5,
      wrongOrder: [{ id: 'nova_35', speaker: 'nova', text: 'Wrong order. Check when he planted them.' }] as Line[],
      success: [{ id: 'nova_36', speaker: 'nova', text: '...Network live.' }] as Line[],
      banner: 'NETWORK LIVE',
      arcDrawMs: 2200,
      waveMs: 2500,
    },
  },

  // ===================== ACT 4: TRANSMISSION =====================
  act4: {
    silenceMs: 2000,
    coming: [{ id: 'nova_37', speaker: 'nova', text: "...Wait. Something's coming through." }] as Line[],
    banner: '⚠ INCOMING TRANSMISSION — ORIGIN: VISHAL K. — STATUS: ALIVE',
    incoming: [{ id: 'nova_38', speaker: 'nova', text: 'Incoming transmission. Origin: Vishal K. Status... alive.' }] as Line[],
    letterTitle: 'RECOVERED TRANSMISSION',
    letter: '[PLACEHOLDER — I\'ll paste my message]',
    letterCharMs: 28,
    skipTypingLabel: 'Skip typing',
    ended: [{ id: 'nova_39', speaker: 'nova', text: 'Transmission ended. The channel is still open. Do you want to reply?' }] as Line[],
    nameLabel: 'Your name (optional — you can type this one)',
    namePlaceholder: 'Name',
    sent: [
      { id: 'nova_40', speaker: 'nova', text: "Message sent across the network. They'll hear you." },
      { id: 's16', speaker: 'survivor', text: "...We're not alone anymore." },
    ] as Line[],
    sentLog: 'REPLY TRANSMITTED ✓',
    continueLabel: 'Continue →',
    supabaseTable: 'replies',
  },

  // ===================== FINAL SCREEN (#final) =====================
  final: {
    hash: '#final',
    headline: 'The nodes were fiction. The work is real.',
    subline: "I'm Vishal Kumar. I build AI systems and growth engines. Bengaluru.",
    aboutTitle: 'About me',
    about: '[PLACEHOLDER]',
    experienceTitle: 'Experience',
    experience: [
      { when: '2020–2022', where: 'Bangalore', role: 'Tech & Operations Lead', org: 'Rams Interiors', text: 'Digitised operations, project tracking, vendor coordination and reporting.' },
      { when: '2022–2023', where: 'London', role: 'MS Engineering Management', org: 'Kingston University London', text: 'Ran founder meetups connecting students with the London startup ecosystem.' },
      { when: '2023–2025', where: 'London', role: 'Commercial Analyst', org: "Sainsbury's / Argos", text: 'Commercial planning for a ~£700M category in an 18-person team; coordinated operations across Europe, China and India; automated recurring analysis and reporting, later adopted across multiple categories.' },
      { when: '2024', where: 'Queensland (remote)', role: 'Product Management Associate', org: 'Green KPI', text: 'Early-stage project-management software for sustainability-focused industries; turned customer and business requirements into product workflows.' },
      { when: '2025', where: 'Bangalore', role: 'Growth & Revenue Operations Lead', org: 'Keshav Interiors', text: 'Contributed to 120% year-on-year revenue growth; moved sales and operations to digital-first workflows.' },
      { when: '2025–2026', where: 'Bangalore', role: 'Founder & Product Lead', org: 'Rivl', text: 'Built a revenue intelligence platform unifying competitive and deal intelligence — AI pipelines for competitor discovery, web ingestion, LLM analysis and win/loss. Concept to launch in 9 months.' },
    ],
    projectsTitle: 'Projects',
    projects: [
      { name: 'Rivl', text: 'AI revenue intelligence platform (competitive + deal intelligence).', link: '#' },
      { name: 'Enrich', text: 'Free, bring-your-own-key AI lead-enrichment tool.', link: '#' },
      { name: 'COBOL Radar', text: 'AI top-of-funnel GTM intelligence with multi-stage research, signal validation and lead scoring.', link: '#' },
      { name: 'DI Engine', text: 'Document intelligence engine that learns client-specific schemas and formats from past documents.', link: '#' },
    ],
    projectLinkLabel: 'View →',
    wisprTitle: "How I'd grow Wispr in India",
    wispr: [
      { title: '[PLACEHOLDER]', text: '[PLACEHOLDER]' },
      { title: '[PLACEHOLDER]', text: '[PLACEHOLDER]' },
      { title: '[PLACEHOLDER]', text: '[PLACEHOLDER]' },
    ],
    buttons: [
      { label: 'Resume', href: '#' },
      { label: 'LinkedIn', href: '#' },
      { label: 'Email', href: '#' },
    ],
    footer: 'Built by voice with Wispr Flow.',
    playAgain: '↺ Play again',
  },
};

export type ArtifactId = keyof typeof CONFIG.evidence;
