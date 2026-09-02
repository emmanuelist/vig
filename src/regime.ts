/**
 * The regime check — the one judgement in Vig that is not arithmetic.
 *
 * Strike selection is mechanical: delta, width, credit ratio, concentration.
 * None of it needs a language model and pretending otherwise would be
 * decoration. But whether *today* is a bad day to be short premium is a
 * different kind of question. Selling an iron condor is a bet that price stays
 * in a range, and ranges break on events — a central bank decision, a
 * geopolitical shock, an inflation print. That judgement lives in prose, in the
 * newswire, and reading prose is what a model is actually for.
 *
 * So this reads Alpaca's news feed and asks a model one question: is there an
 * identifiable event today that makes a range-bound assumption unsafe?
 *
 * TWO RULES, both deliberate:
 *
 *   1. The model can only ever VETO. There is no path by which it increases
 *      size, widens the book, or loosens a limit. Being wrong costs us a missed
 *      trade, never an uncovered one.
 *   2. If it is unavailable, the agent keeps trading and says so. The mechanical
 *      gates are what bound the loss; this is an extra veto on top. A dead
 *      inference endpoint must not be able to halt the strategy, and it must
 *      not be able to silently look like approval either.
 */

import { alpaca } from "./cli.js";
import { env, envSet } from "./env.js";

const BASE = env("FEATHERLESS_BASE", "https://api.featherless.ai/v1");
const MODEL = env("FEATHERLESS_MODEL", "Qwen/Qwen2.5-7B-Instruct");

export type Regime = {
  standAside: boolean;
  reason: string;
  /** How the verdict was reached, so the Cover Sheet never implies more than happened. */
  source: "model" | "unavailable" | "no-news";
  headlines: string[];
  model?: string;
};

type NewsItem = { headline: string; summary?: string; created_at: string; source?: string };

/** Headlines from the last few hours for the underlyings we trade. */
async function recentNews(symbols: string[], limit = 12): Promise<NewsItem[]> {
  const since = new Date(Date.now() - 18 * 3600_000).toISOString();
  const res = await alpaca<{ news?: NewsItem[] }>(
    "data", "news",
    "--symbols", symbols.join(","),
    "--start", since,
    "--limit", String(limit),
    "--exclude-contentless",
  );
  return res.news ?? [];
}

const PROMPT = `You assess whether today is a dangerous day to SELL OPTION PREMIUM on US equity index ETFs.

Selling an iron condor profits when the index stays inside a range. It loses when the index moves sharply in either direction. So the only thing that matters is: is there a known, scheduled or breaking event that makes a large move materially more likely than usual today?

Stand aside for things like: central bank rate decisions, CPI or jobs prints landing today, war or major geopolitical escalation, a large index-level shock already underway, or an unusual volatility spike.

Do NOT stand aside for: ordinary single-company news, routine analyst notes, mild sector moves, or general market commentary. Those are normal and are exactly what premium selling is paid to absorb.

Answer with STRICT JSON and nothing else:
{"stand_aside": <true|false>, "reason": "<one short sentence>"}`;

export async function check(symbols: string[]): Promise<Regime> {
  let news: NewsItem[] = [];
  try {
    news = await recentNews(symbols);
  } catch {
    return { standAside: false, reason: "news feed unavailable; mechanical gates still apply", source: "unavailable", headlines: [] };
  }

  const headlines = news.map((n) => n.headline).filter(Boolean).slice(0, 12);
  if (!headlines.length) {
    return { standAside: false, reason: "no recent headlines for these underlyings", source: "no-news", headlines: [] };
  }

  const key = envSet("FEATHERLESS_API_KEY") ? process.env.FEATHERLESS_API_KEY! : "";
  if (!key) {
    return {
      standAside: false,
      reason: "regime check skipped — no Featherless key configured; mechanical gates still apply",
      source: "unavailable",
      headlines,
    };
  }

  const body = {
    model: MODEL,
    temperature: 0,
    max_tokens: 160,
    messages: [
      { role: "system", content: PROMPT },
      {
        role: "user",
        content: `Date: ${new Date().toISOString().slice(0, 10)}\nUnderlyings: ${symbols.join(", ")}\n\nHeadlines:\n` +
          news.map((n) => `- ${n.headline}${n.summary ? ` — ${n.summary.slice(0, 200)}` : ""}`).join("\n"),
      },
    ],
  };

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20_000);
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      return { standAside: false, reason: `regime check failed (${r.status}); mechanical gates still apply`, source: "unavailable", headlines };
    }

    const json = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";

    // Models wrap JSON in prose or fences given half a chance; take the object.
    const match = /\{[\s\S]*\}/.exec(text);
    if (!match) {
      return { standAside: false, reason: "regime check returned no verdict; mechanical gates still apply", source: "unavailable", headlines };
    }
    const verdict = JSON.parse(match[0]) as { stand_aside?: boolean; reason?: string };

    return {
      // Coerced explicitly: anything that is not a clear `true` means trade.
      // A malformed veto must not become a silent halt.
      standAside: verdict.stand_aside === true,
      reason: String(verdict.reason ?? "").slice(0, 200) || "no reason given",
      source: "model",
      headlines,
      model: MODEL,
    };
  } catch {
    return { standAside: false, reason: "regime check timed out; mechanical gates still apply", source: "unavailable", headlines };
  }
}
