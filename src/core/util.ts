export const abortError = () => new DOMException('Aborted', 'AbortError');
export const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** Abort-aware sleep: rejects with AbortError when the signal fires. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  const p = new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => {
      clearTimeout(t);
      reject(abortError());
    };
    const t = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
  p.catch(() => {}); // never an "unhandled" rejection if the caller doesn't await
  return p;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  parent?: HTMLElement,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent?.appendChild(e);
  return e;
}

export const isCoarse = () => window.matchMedia('(pointer: coarse)').matches;
