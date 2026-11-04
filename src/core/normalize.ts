// Text normalising for voice input (dictation output is messy).

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};
// Homophones: only trusted when we are specifically looking for a code.
const HOMOPHONES: Record<string, string> = { o: '0', won: '1', to: '2', too: '2', for: '4', ate: '8' };
const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** lowercase, strip punctuation, collapse spaces, number words -> digits. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => DIGIT_WORDS[w] ?? w)
    .join(' ');
}

function tokens(s: string): string[] {
  return normalize(s)
    .split(' ')
    .filter(Boolean)
    .map((t) => HOMOPHONES[t] ?? t);
}

/** Concatenate every digit-like token: "four three seven" -> "437". */
export function digitsOnly(s: string): string {
  return tokens(s)
    .filter((t) => /^\d+$/.test(t))
    .join('');
}

/** Parse spoken numbers: "4 hundred and 30 7", "4 30 7", "437" -> 437. */
function spokenValue(s: string): number | null {
  const items: Array<number | 'H'> = [];
  for (const t of tokens(s)) {
    if (t === 'and') continue;
    if (t === 'hundred') items.push('H');
    else if (/^\d+$/.test(t)) items.push(Number(t));
    else if (t in TEENS) items.push(TEENS[t]);
    else if (t in TENS) items.push(TENS[t]);
    // other words (filler) are ignored
  }
  if (!items.length) return null;
  const nums: number[] = [];
  for (const it of items) {
    if (it === 'H') {
      const prev = nums.pop();
      nums.push((prev && prev < 10 ? prev : 1) * 100);
    } else nums.push(it);
  }
  // "four thirty seven": a single digit followed by a tens word means hundreds.
  if (nums.length > 1 && nums[0] < 10 && nums[1] >= 10 && !items.includes('H')) nums[0] *= 100;
  return nums.reduce((a, b) => a + b, 0);
}

export function matchesCode(input: string, code: string): boolean {
  if (digitsOnly(input) === code) return true;
  return spokenValue(input) === Number(code);
}
