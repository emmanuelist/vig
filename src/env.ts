/**
 * Environment reading, with one rule: an empty value is an ABSENT value.
 *
 * `process.env.X ?? fallback` only falls back on undefined, so a variable
 * present-but-blank in .env — which is exactly what copying .env.example
 * produces — silently wins over the default. That cost us a broken narration
 * URL: `ELEVENLABS_VOICE_ID=` resolved to "" rather than the default voice, and
 * the request went to `/v1/text-to-speech/` with no id at all.
 *
 * Blank means "I have not set this yet". Treat it that way everywhere.
 */

export function env(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v.trim() === "" ? fallback : v.trim();
}

export function envNum(name: string, fallback: number): number {
  const v = env(name, "");
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** True only when the variable holds an actual value. */
export function envSet(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v.trim() !== "";
}
