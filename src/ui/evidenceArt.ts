// Hand-drawn SVG close-ups of the three evidence objects. Muted, grimy, damaged.
import { CONFIG } from '../config';
import type { ArtifactId } from '../config';

// Deterministic pseudo-random so the damage looks the same every time.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const grimeFilter = (id: string, freq = 0.035, seed = 7) => `
  <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="4" seed="${seed}"/>
    <feColorMatrix type="matrix" values="0 0 0 0 .12  0 0 0 0 .08  0 0 0 0 .04  0 0 0 1.6 -.55"/>
  </filter>`;

const roughFilter = (id: string, scale = 4, seed = 3) => `
  <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${seed}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
  </filter>`;

function clockSvg(): string {
  let marks = '';
  for (let i = 0; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180;
    const big = i % 5 === 0;
    const r1 = big ? 150 : 156;
    const r2 = 163;
    marks += `<line x1="${200 + r1 * Math.sin(a)}" y1="${200 - r1 * Math.cos(a)}" x2="${200 + r2 * Math.sin(a)}" y2="${200 - r2 * Math.cos(a)}" stroke="#2b251b" stroke-width="${big ? 3 : 1}" opacity="${big ? 0.85 : 0.5}"/>`;
  }
  const rnd = rng(11);
  let nums = '';
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    nums += `<text x="${200 + 128 * Math.sin(a)}" y="${200 - 128 * Math.cos(a) + 11}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="32" fill="#2b251b" opacity="${(0.55 + rnd() * 0.4).toFixed(2)}">${i}</text>`;
  }
  const cracks = [
    'M262,128 L225,160 L212,198 L176,236 L150,300 L138,330',
    'M262,128 L300,146 L330,200 L352,236',
    'M262,128 L246,90 L252,52 L240,22',
    'M262,128 L290,96 L312,62',
    'M262,128 L214,118 L170,96 L126,84',
    'M262,128 L268,170 L292,214 L282,262 L296,300',
    'M212,198 L238,214 L236,252', 'M300,146 L326,126 L346,128',
    'M176,236 L198,266 L190,300', 'M246,90 L222,76 L206,52',
    'M232,102 Q250,88 276,96 T304,132', 'M240,160 Q262,176 290,166',
  ];
  const crackPaths = cracks
    .map((d) => `<path d="${d}" stroke="rgba(0,0,0,.6)" stroke-width="2.4" fill="none" transform="translate(1.4,1.6)"/><path d="${d}" stroke="rgba(255,252,235,.72)" stroke-width="1" fill="none"/>`)
    .join('');
  return `
<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cracked wall clock stopped at four o'clock">
  <defs>
    <radialGradient id="cFace" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="#d4cbab"/><stop offset=".7" stop-color="#a49a7c"/><stop offset="1" stop-color="#6e6650"/></radialGradient>
    <linearGradient id="cRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b6254"/><stop offset=".5" stop-color="#2b261e"/><stop offset="1" stop-color="#4a4236"/></linearGradient>
    <radialGradient id="cGlass" cx="30%" cy="25%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".4" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient>
    <clipPath id="cClip"><circle cx="200" cy="200" r="168"/></clipPath>
    <filter id="cBlur"><feGaussianBlur stdDeviation="6"/></filter>
    ${grimeFilter('cGrime', 0.03, 7)}${roughFilter('cRough', 5, 3)}
  </defs>
  <g transform="rotate(-3 200 200)">
    <ellipse cx="206" cy="212" rx="190" ry="188" fill="#000" opacity=".5" filter="url(#cBlur)"/>
    <g filter="url(#cRough)">
      <circle cx="200" cy="200" r="190" fill="url(#cRim)" stroke="#0c0a07" stroke-width="3"/>
      <circle cx="200" cy="200" r="176" fill="none" stroke="rgba(255,240,210,.18)" stroke-width="2"/>
    </g>
    <circle cx="200" cy="200" r="168" fill="url(#cFace)"/>
    <g clip-path="url(#cClip)">
      <ellipse cx="120" cy="300" rx="90" ry="60" fill="#5b4326" opacity=".28" filter="url(#cBlur)"/>
      <ellipse cx="300" cy="290" rx="60" ry="80" fill="#2a2418" opacity=".25" filter="url(#cBlur)"/>
      <circle cx="200" cy="200" r="190" fill="#000" filter="url(#cGrime)" opacity=".75"/>
      ${marks}${nums}
      <text x="200" y="290" text-anchor="middle" font-family="ui-monospace, 'Courier New', monospace" font-size="21" letter-spacing="5" fill="#2b251b" opacity=".5">${CONFIG.evidence.clock.display}</text>
      <g transform="rotate(120 200 200)"><polygon points="193,204 200,112 207,204 200,218" fill="#17130d" stroke="rgba(255,240,200,.18)" stroke-width=".8"/></g>
      <g><polygon points="196.5,204 200,52 203.5,204 200,222" fill="#17130d" stroke="rgba(255,240,200,.18)" stroke-width=".8"/></g>
      <circle cx="200" cy="200" r="9" fill="#2b261e" stroke="#0c0a07"/><circle cx="198" cy="198" r="3" fill="rgba(255,255,255,.2)"/>
      <circle cx="200" cy="200" r="170" fill="url(#cGlass)"/>
      ${crackPaths}
      <circle cx="262" cy="128" r="5" fill="rgba(255,252,235,.5)"/>
    </g>
  </g>
</svg>`;
}

function calendarSvg(): string {
  const parts = CONFIG.evidence.calendar.display.split(/\s+/);
  const day = parts[0];
  const month = parts.slice(1).join(' ');
  const rnd = rng(5);
  // jagged torn bottom edge, right to left
  let tear = '';
  for (let x = 330; x >= 30; x -= 9 + rnd() * 9) tear += ` L${x.toFixed(1)},${(402 + rnd() * 34).toFixed(1)}`;
  const paper = `M30,22 L330,22 L330,402${tear} L30,410 Z`;
  return `
<svg viewBox="0 0 360 470" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Torn wall calendar page, ${CONFIG.evidence.calendar.display}">
  <defs>
    <linearGradient id="kPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4dcc4"/><stop offset=".6" stop-color="#d1c7aa"/><stop offset="1" stop-color="#b3a789"/></linearGradient>
    <linearGradient id="kHead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9b3028"/><stop offset="1" stop-color="#6e2019"/></linearGradient>
    <linearGradient id="kSoot" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a0f05" stop-opacity=".55"/></linearGradient>
    <radialGradient id="kBurn" cx="100%" cy="0%" r="70%"><stop offset="0" stop-color="#150b04" stop-opacity=".7"/><stop offset="1" stop-color="#150b04" stop-opacity="0"/></radialGradient>
    <clipPath id="kClip"><path d="${paper}"/></clipPath>
    <filter id="kBlur"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="kShadow"><feGaussianBlur stdDeviation="9"/></filter>
    ${grimeFilter('kGrime', 0.025, 21)}${roughFilter('kRough', 3, 8)}
  </defs>
  <g transform="rotate(2.5 180 235)">
    <path d="${paper}" transform="translate(8,12)" fill="#000" opacity=".55" filter="url(#kShadow)"/>
    <g filter="url(#kRough)"><path d="${paper}" fill="url(#kPaper)"/></g>
    <g clip-path="url(#kClip)">
      <rect x="30" y="22" width="300" height="92" fill="url(#kHead)"/>
      <rect x="30" y="108" width="300" height="6" fill="#000" opacity=".18"/>
      <text x="180" y="82" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="44" font-weight="bold" letter-spacing="9" fill="#ecdfc9" opacity=".88">${month}</text>
      <circle cx="90" cy="42" r="6" fill="#120d08"/><circle cx="270" cy="42" r="6" fill="#120d08"/>
      <text x="180" y="146" text-anchor="middle" font-family="Georgia, serif" font-size="12" letter-spacing="7" fill="#5e5645" opacity=".8">S  M  T  W  T  F  S</text>
      <text x="180" y="338" text-anchor="middle" font-family="Impact, 'Arial Black', 'Helvetica Neue', sans-serif" font-size="215" fill="#26211b" opacity=".92">${day}</text>
      <circle cx="244" cy="292" r="48" fill="rgba(120,80,40,.1)" stroke="rgba(88,52,22,.45)" stroke-width="5" filter="url(#kBlur)"/>
      <ellipse cx="96" cy="380" rx="70" ry="22" fill="#4a3318" opacity=".3" filter="url(#kBlur)"/>
      <line x1="180" y1="115" x2="168" y2="410" stroke="#000" stroke-opacity=".1" stroke-width="2"/>
      <rect x="0" y="0" width="360" height="470" fill="url(#kSoot)"/>
      <rect x="0" y="0" width="360" height="470" fill="url(#kBurn)"/>
      <rect x="0" y="0" width="360" height="470" filter="url(#kGrime)" opacity=".8"/>
      <path d="M330,22 L330,70 Q316,48 296,22 Z" fill="#000" opacity=".25"/>
    </g>
  </g>
</svg>`;
}

function badgeSvg(): string {
  const words = CONFIG.evidence.badge.display.split(/\s+/);
  const level = words.pop() ?? '';
  const label = words.join(' ');
  return `
<svg viewBox="0 0 300 480" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scorched ID badge, ${CONFIG.evidence.badge.display}">
  <defs>
    <pattern id="bWeave" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="#2a3037"/><rect width="3" height="6" fill="#343b44"/></pattern>
    <linearGradient id="bCard" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6cfba"/><stop offset="1" stop-color="#a99f86"/></linearGradient>
    <linearGradient id="bClip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d6064"/><stop offset=".5" stop-color="#a9acaf"/><stop offset="1" stop-color="#4b4e52"/></linearGradient>
    <radialGradient id="bPhoto" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#000"/><stop offset=".6" stop-color="#0d0a07"/><stop offset="1" stop-color="#3a2a1a"/></radialGradient>
    <radialGradient id="bChar" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".95"/><stop offset=".6" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <radialGradient id="bScorch1" cx="100%" cy="0%" r="75%"><stop offset="0" stop-color="#0a0502" stop-opacity=".92"/><stop offset=".55" stop-color="#2a1608" stop-opacity=".45"/><stop offset="1" stop-color="#2a1608" stop-opacity="0"/></radialGradient>
    <radialGradient id="bScorch2" cx="0%" cy="100%" r="65%"><stop offset="0" stop-color="#0a0502" stop-opacity=".85"/><stop offset="1" stop-color="#2a1608" stop-opacity="0"/></radialGradient>
    <clipPath id="bClipCard"><rect x="40" y="122" width="220" height="338" rx="14"/></clipPath>
    <filter id="bBlur"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="bShadow"><feGaussianBlur stdDeviation="8"/></filter>
    ${grimeFilter('bGrime', 0.04, 13)}${roughFilter('bRough', 3, 5)}
  </defs>
  <g transform="rotate(3 150 290)">
    <polygon points="58,0 98,0 158,98 136,106" fill="url(#bWeave)"/>
    <polygon points="242,0 202,0 142,98 164,106" fill="url(#bWeave)"/>
    <rect x="40" y="130" width="220" height="338" rx="14" fill="#000" opacity=".55" filter="url(#bShadow)"/>
    <rect x="126" y="90" width="48" height="42" rx="6" fill="url(#bClip)" stroke="#1a1c1e"/>
    <rect x="140" y="100" width="20" height="7" rx="3" fill="#111"/>
    <g filter="url(#bRough)"><rect x="40" y="122" width="220" height="338" rx="14" fill="url(#bCard)" stroke="#6f6853" stroke-width="2"/></g>
    <g clip-path="url(#bClipCard)">
      <rect x="40" y="122" width="220" height="30" fill="#33465a" opacity=".85"/>
      <text x="150" y="143" text-anchor="middle" font-family="ui-monospace, 'Courier New', monospace" font-size="13" letter-spacing="4" fill="#cfd6dc" opacity=".6" filter="url(#bBlur)">- - - - - - - -</text>
      <rect x="75" y="166" width="150" height="116" rx="6" fill="url(#bPhoto)" stroke="#1b1610" stroke-width="2"/>
      <circle cx="150" cy="208" r="22" fill="#6a5a46" opacity=".14"/><path d="M104,282 Q150,226 196,282 Z" fill="#6a5a46" opacity=".12"/>
      <text x="150" y="314" text-anchor="middle" font-family="ui-monospace, 'Courier New', monospace" font-size="21" font-weight="bold" letter-spacing="2" fill="#2d2418" filter="url(#bBlur)" opacity=".8">J. MARCUS HALE</text>
      <ellipse cx="148" cy="309" rx="92" ry="17" fill="url(#bChar)"/>
      <ellipse cx="204" cy="304" rx="30" ry="9" fill="url(#bChar)"/>
      <rect x="40" y="338" width="220" height="122" fill="#1f252b" opacity=".16"/>
      <text x="150" y="366" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" letter-spacing="4" fill="#352c20">${label}</text>
      <text x="150" y="444" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="92" fill="#9c2e26" opacity=".92">${level}</text>
      <rect x="40" y="122" width="220" height="338" fill="url(#bScorch1)"/>
      <rect x="40" y="122" width="220" height="338" fill="url(#bScorch2)"/>
      <rect x="40" y="122" width="220" height="338" filter="url(#bGrime)" opacity=".85"/>
      <g stroke-linecap="round" fill="none">
        <path d="M58,190 L118,420" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>
        <path d="M70,170 L140,330" stroke="#000" stroke-opacity=".3" stroke-width="1"/>
        <path d="M180,360 L250,420" stroke="#fff" stroke-opacity=".2" stroke-width="1.2"/>
        <path d="M205,172 L226,300" stroke="#fff" stroke-opacity=".16" stroke-width="1"/>
        <path d="M90,400 L170,386" stroke="#000" stroke-opacity=".35" stroke-width="1.2"/>
      </g>
    </g>
  </g>
</svg>`;
}

/** SVG markup plus width/height aspect for sizing the close-up. */
export const ART: Record<ArtifactId, { svg: () => string; aspect: number }> = {
  clock: { svg: clockSvg, aspect: 1 },
  calendar: { svg: calendarSvg, aspect: 360 / 470 },
  badge: { svg: badgeSvg, aspect: 300 / 480 },
};
