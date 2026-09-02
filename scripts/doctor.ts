/**
 * Preflight. Run this the moment the competition account exists, before any
 * strategy code runs. Every check here is something that can silently
 * disqualify the entry or invalidate the strategy on Friday morning.
 *
 *   npm run doctor
 */

import "dotenv/config";
import { execFileSync } from "node:child_process";
import { alpaca, AuthError } from "../src/cli.js";

const pass = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m: string) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const fail = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);

let fatal = 0;
let unresolved = 0;

const money = (v: unknown) =>
  Number(v).toLocaleString("en-US", { style: "currency", currency: "USD" });

console.log("\n\x1b[1mVig preflight\x1b[0m\n");

// ── 1. The prohibition ──────────────────────────────────────────────────────
console.log("Safety");
if (process.env.ALPACA_LIVE_TRADE) {
  fail("ALPACA_LIVE_TRADE is set. This routes orders to LIVE MONEY. Unset it now.");
  fatal++;
} else {
  pass("ALPACA_LIVE_TRADE unset — CLI defaults to paper");
}

// ── 2. The CLI ──────────────────────────────────────────────────────────────
console.log("\nCLI");
try {
  const v = execFileSync("alpaca", ["version"], { encoding: "utf8" }).trim();
  pass(`alpaca ${v} (alpha preview — re-verify flags after any upgrade)`);
} catch {
  fail("alpaca CLI not found. Install: brew install alpacahq/tap/cli");
  fatal++;
}

if (!process.env.ALPACA_API_KEY || !process.env.ALPACA_SECRET_KEY) {
  fail("ALPACA_API_KEY / ALPACA_SECRET_KEY missing. Copy .env.example to .env.");
  fatal++;
}

if (fatal) {
  console.log(`\n\x1b[31m${fatal} fatal\x1b[0m — fix the above before continuing.\n`);
  process.exit(1);
}

// ── 3. The account ──────────────────────────────────────────────────────────
type Account = Record<string, unknown>;
let account: Account;

console.log("\nAccount");
try {
  account = await alpaca<Account>("account", "get");
  pass(`authenticated — account ${account.id}`);
} catch (e) {
  if (e instanceof AuthError) fail(`auth failed: ${e.message}`);
  else fail(`account get failed: ${(e as Error).message}`);
  console.log("\nCannot continue without an authenticated account.\n");
  process.exit(1);
}

// The submission requires this ID. Surface it whether or not .env has it.
// Two different identifiers, and the submission form is ambiguous about which
// it wants. Report both; ship both.
pass(`account number ${account.account_number}  (shown in the dashboard)`);
pass(`account UUID   ${account.id}  (returned by the API)`);
if (!process.env.ALPACA_ACCOUNT_ID) warn("ALPACA_ACCOUNT_ID unset in .env");

if (account.status !== "ACTIVE") {
  warn(`account status is ${account.status}, expected ACTIVE`);
}

// Equity must be $100k. A fresh account that has not traded should be exact;
// once trading starts this drifts, which is expected and not an error.
const equity = Number(account.equity);
if (Math.abs(equity - 100_000) < 0.01) {
  pass(`equity ${money(equity)} — matches the required starting balance`);
} else {
  warn(`equity ${money(equity)}, not exactly $100,000.00`);
  warn("  if this account has not traded yet, the starting balance is wrong — reset it");
  warn("  if it has traded, this is P&L and is fine");
}

// ── 4. Options approval — the check that decides the whole strategy ─────────
console.log("\nOptions approval");
const level = account.options_approved_level ?? account.options_trading_level;
if (level === undefined) {
  warn("no options level field on this account payload — checking by dry run instead");
  unresolved++;
} else {
  const n = Number(level);
  if (n >= 3) pass(`level ${n} — spreads permitted`);
  else if (n >= 1) {
    fail(`level ${n} — long options only. CREDIT SPREADS WILL BE REJECTED.`);
    fail("  raise the level in the Alpaca dashboard, or the strategy must change");
    fatal++;
  } else {
    fail(`level ${n} — options not enabled on this account`);
    fatal++;
  }
}

// ── 5. Market clock ─────────────────────────────────────────────────────────
console.log("\nMarket");
let marketOpen = false;
try {
  const clock = await alpaca<Record<string, unknown>>("clock");
  marketOpen = Boolean(clock.is_open);
  if (marketOpen) pass(`open — next close ${clock.next_close}`);
  else warn(`closed — next open ${clock.next_open}`);
} catch (e) {
  warn(`clock unavailable: ${(e as Error).message}`);
}

// ── 6. Options data tier ────────────────────────────────────────────────────
// If quotes come back delayed or empty on the free tier, the strategy has to be
// designed around it and the README has to say so. Find out now, not Friday.
console.log("\nOptions data");
try {
  const chain = await alpaca<Record<string, unknown>>(
    "data", "option", "chain", "--underlying-symbol", "SPY",
  );
  const snapshots = (chain.snapshots ?? chain) as Record<string, Record<string, unknown>>;
  const symbols = Object.keys(snapshots);

  if (!symbols.length) {
    fail("SPY chain came back empty — no options data on this tier");
    fatal++;
  } else {
    pass(`SPY chain: ${symbols.length} contracts`);

    const withQuote = symbols.filter((s) => snapshots[s]?.latestQuote ?? snapshots[s]?.latest_quote);
    if (!withQuote.length) {
      fail("chain has no quotes — cannot price a spread without them");
      fatal++;
    } else {
      pass(`${withQuote.length} contracts carry a quote`);

      const first = withQuote[0]!;
      const q = (snapshots[first]!.latestQuote ?? snapshots[first]!.latest_quote) as Record<string, unknown>;
      const stamp = q.t ?? q.timestamp;
      if (stamp) {
        const lagMin = (Date.now() - new Date(String(stamp)).getTime()) / 60_000;
        if (!marketOpen) {
          warn(`last quote ${lagMin.toFixed(0)} min old — market is CLOSED, so this is`);
          warn("  the closing quote, not evidence of a delayed feed. Re-run once open.");
          unresolved++;
        } else if (lagMin > 14) {
          warn(`quotes lag ~${lagMin.toFixed(0)} min with the market OPEN — DELAYED tier`);
          warn("  design the strategy around it and say so in the README");
        } else {
          pass(`quotes fresh (~${lagMin.toFixed(1)} min behind, market open) — real-time`);
        }
      }
    }
  }
} catch (e) {
  fail(`options chain failed: ${(e as Error).message}`);
  fatal++;
}

// ── 7. Verdict ─────────────────────────────────────────────────────────────
console.log();
if (fatal) {
  console.log(`\x1b[31m${fatal} fatal\x1b[0m — the strategy cannot run as designed yet.\n`);
  process.exit(1);
}
console.log(`\x1b[32mReady.\x1b[0m${unresolved ? ` ${unresolved} unresolved — confirm by dry run.` : ""}\n`);
