import { CONFIG } from '../config';

export interface ReplyInput { name: string; message: string }
export interface ReplyResult { ok: boolean }

const TIMEOUT_MS = 8000;

/** Save a visitor's reply to Supabase (REST, no library). Never throws. */
export async function saveReply({ name, message }: ReplyInput): Promise<ReplyResult> {
  const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) ?? {};
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn('saveReply: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing; reply not saved.');
    return { ok: false };
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/${CONFIG.act4.supabaseTable}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ name: name || null, message, created_at: new Date().toISOString() }),
      signal: ctl.signal,
    });
    if (!res.ok) console.error('saveReply failed', res.status, await res.text().catch(() => ''));
    return { ok: res.ok };
  } catch (e) {
    console.error('saveReply error', e);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}
