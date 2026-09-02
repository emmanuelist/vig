/**
 * The agent.
 *
 * One tick: reconcile what we hold, work out what is already reserved, then
 * consider one condor per underlying+expiry bucket. Nothing is submitted that
 * has not first been priced against us and cleared every gate — and the request
 * we prove is byte-for-byte the request we send, because `--dry-run` renders it
 * and then the identical argv goes out without the flag.
 *
 *   npm run agent -- --once      one pass, then exit
 *   npm run agent                loop until the market closes
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { alpaca, AuthError, CliError } from "./cli.js";
import { fetchChain, inferSpot, type Contract } from "./chain.js";
import { price, gate, legsPayload, DEFAULT_LIMITS, type Condor } from "./condor.js";
import * as ledger from "./ledger.js";
import { check as checkRegime, type Regime } from "./regime.js";
import { env, envNum } from "./env.js";

const UNDERLYINGS = env("VIG_UNDERLYINGS", "SPY,QQQ,IWM").split(",").map((u) => u.trim()).filter(Boolean);
const SHORT_DELTA = envNum("VIG_SHORT_DELTA", 0.12);
/**
 * Wing distance as a fraction of spot, not a fixed dollar amount.
 *
 * A flat $5 width means something different on every underlying: 0.66% of SPY
 * at $761 but 1.7% of IWM at $290. The wider the width in percentage terms, the
 * further the protection sits from the short strike and the worse the credit
 * looks against it — so a fixed width was silently refusing IWM for a reason
 * that had nothing to do with IWM. Scale it, and every underlying is judged on
 * the same basis.
 */
const WIDTH_PCT = envNum("VIG_WIDTH_PCT", 0.0066);
const MIN_WIDTH = envNum("VIG_MIN_WIDTH", 1);
/** Dollars of risk we aim to put in a single structure; qty is derived from it. */
const TARGET_RISK = envNum("VIG_TARGET_RISK", 2500);
/** Most structures to open in one tick, so the book fills in over time. */
const MAX_PER_TICK = envNum("VIG_MAX_PER_TICK", 3);
const TICK_MS = envNum("VIG_TICK_MS", 60_000);

const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

type Clock = { is_open: boolean; next_open: string; next_close: string };
type Position = { symbol: string; qty: string; unrealized_pl: string; market_value: string };
type Account = { equity: string; last_equity: string; buying_power: string; account_number: string };

export type Decision = {
  bucket: string;
  action: "submitted" | "would-submit" | "refused" | "unpriceable" | "held";
  reason?: string;
  detail?: string;
  condor?: Condor;
  clientOrderId?: string;
};

async function tick(): Promise<void> {
  const clock = await alpaca<Clock>("clock");
  const account = await alpaca<Account>("account", "get");
  const equity = Number(account.equity);

  const positions = await alpaca<Position[]>("position", "list").catch(() => [] as Position[]);
  const liveSymbols = new Set(positions.map((p) => p.symbol));

  const book = ledger.load();
  const closed = ledger.reconcile(book, liveSymbols);
  for (const c of closed) log(`settled  ${c.underlying} ${c.expiry}  kept $${c.creditTotal.toFixed(0)}`);

  const decisions: Decision[] = [];
  const spots: Record<string, number> = {};
  let opened = 0;

  // One regime call per tick, not per bucket. It can only veto new opens;
  // positions already on stay on, because closing them early would realise a
  // loss the structure has already capped and paid for.
  const regime: Regime = await checkRegime(UNDERLYINGS);
  if (regime.standAside) log(`STAND ASIDE — ${regime.reason}`);

  // Scanning happens whether or not the market is open. With the market shut
  // the agent still prices every bucket and runs every gate, and simply stops
  // short of submitting — so the reasoning is inspectable outside session hours
  // instead of the page sitting blank. Only the order is time-gated.
  if (!clock.is_open) log(`market closed — scanning only, no orders`);

  {
    for (const underlying of UNDERLYINGS) {
      let contracts: Contract[];
      try {
        const from = new Date().toISOString().slice(0, 10);
        const to = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        contracts = await fetchChain(underlying, from, to);
      } catch (e) {
        log(`${underlying}: chain unavailable — ${(e as Error).message}`);
        continue;
      }

      // Spot by put-call parity off the same quotes the strikes come from,
      // so the range bar and the selection can never disagree.
      const spot = inferSpot(contracts);
      if (spot !== null) spots[underlying] = spot;

      // Strikes are listed in whole dollars on these underlyings, so the width
      // has to land on one or `atStrike` finds no wing.
      const width = spot === null ? MIN_WIDTH : Math.max(MIN_WIDTH, Math.round(spot * WIDTH_PCT));

      const expiries = [...new Set(contracts.map((c) => c.expiry))].sort().slice(0, 3);

      for (const expiry of expiries) {
        const bucket = ledger.bucketKey(underlying, expiry);
        if (opened >= MAX_PER_TICK) { decisions.push({ bucket, action: "held", reason: "tick-limit" }); continue; }

        // Size so one structure risks about TARGET_RISK, then let the gates
        // decide whether even that is too much given what is already on.
        const probe = price(contracts, { underlying, expiry, shortDelta: SHORT_DELTA, width, qty: 1 });
        if (!probe.ok) { decisions.push({ bucket, action: "unpriceable", reason: probe.reason, detail: probe.detail }); continue; }
        const qty = Math.max(1, Math.floor(TARGET_RISK / probe.condor.maxLossTotal));

        const p = price(contracts, { underlying, expiry, shortDelta: SHORT_DELTA, width, qty });
        if (!p.ok) { decisions.push({ bucket, action: "unpriceable", reason: p.reason, detail: p.detail }); continue; }
        const condor = p.condor;

        if (regime.standAside) {
          decisions.push({ bucket, action: "refused", reason: "regime", detail: regime.reason, condor });
          continue;
        }

        const g = gate(condor, {
          equity,
          reserved: ledger.reserved(book),
          reservedInBucket: ledger.reservedInBucket(book, underlying, expiry),
        }, DEFAULT_LIMITS);

        if (!g.ok) {
          decisions.push({ bucket, action: "refused", reason: g.reason, detail: g.detail, condor });
          log(`refused  ${bucket}  ${g.reason}: ${g.detail}`);
          continue;
        }

        // Round the limit down to a tick so the order is marketable; we are
        // selling the structure, so a lower limit is the conservative side.
        const limitPrice = (Math.floor(condor.creditPerShare * 100) / 100).toFixed(2);
        const clientOrderId = `vig-${randomUUID().slice(0, 8)}`;
        const args = [
          "order", "submit",
          "--order-class", "mleg",
          "--qty", String(qty),
          "--type", "limit",
          "--limit-price", limitPrice,
          "--time-in-force", "day",
          "--client-order-id", clientOrderId,
          "--legs", JSON.stringify(legsPayload(condor)),
        ];

        if (!clock.is_open) {
          decisions.push({ bucket, action: "would-submit", condor, detail: `qty ${qty} · credit $${condor.creditTotal.toFixed(0)} · reserves $${condor.maxLossTotal.toFixed(0)}` });
          continue;
        }

        try {
          // The proof and the order are the same request. This is the claim.
          const preview = await alpaca(...args, "--dry-run");
          const order = await alpaca<{ id?: string }>(...args);
          const pos = ledger.record(condor, clientOrderId, order?.id, { argv: ["alpaca", ...args], preview });
          // The gates read reserved totals off THIS object. record() persists to
          // disk but cannot reach the copy loaded at the top of the tick, so
          // without this push every later structure in the same tick is gated
          // against a stale total and the book walks past its own ceiling.
          book.positions.push(pos);
          decisions.push({ bucket, action: "submitted", condor, clientOrderId });
          opened++;
          log(`opened   ${bucket}  qty ${qty}  credit $${condor.creditTotal.toFixed(0)}  reserved $${condor.maxLossTotal.toFixed(0)}`);
        } catch (e) {
          if (e instanceof AuthError) throw e;
          const detail = e instanceof CliError ? e.message : String(e);
          decisions.push({ bucket, action: "refused", reason: "rejected", detail });
          log(`rejected ${bucket}  ${detail}`);
        }
      }
    }
  }

  writeState({ clock, account, positions, book: ledger.load(), decisions, equity, spots, regime });
}

/** The Cover Sheet reads this. It is the whole visible state of the agent. */
function writeState(s: {
  clock: Clock; account: Account; positions: Position[];
  book: ledger.Ledger; decisions: Decision[]; equity: number;
  spots: Record<string, number>;
  regime: Regime;
}): void {
  const open = s.book.positions.filter(ledger.isOpen);
  const unrealized = s.positions.reduce((t, p) => t + Number(p.unrealized_pl || 0), 0);

  mkdirSync("web", { recursive: true });
  writeFileSync("web/state.json", JSON.stringify({
    at: new Date().toISOString(),
    marketOpen: s.clock.is_open,
    nextOpen: s.clock.next_open,
    nextClose: s.clock.next_close,
    accountNumber: s.account.account_number,
    spots: s.spots,
    regime: s.regime,
    equity: s.equity,
    startingEquity: 100_000,
    pnl: s.equity - 100_000,
    unrealized,
    reserved: ledger.reserved(s.book),
    riskCeiling: s.equity * DEFAULT_LIMITS.maxRiskTotal,
    // The number the whole product exists to display.
    uncovered: 0,
    positions: open,
    settled: s.book.positions.filter((p) => !ledger.isOpen(p)),
    decisions: s.decisions,
    legs: s.positions,
  }, null, 2));
}

const once = process.argv.includes("--once");
if (once) {
  await tick();
} else {
  log(`vig running — ${UNDERLYINGS.join(",")}  delta ${SHORT_DELTA}  width ${(WIDTH_PCT * 100).toFixed(2)}% of spot`);
  for (;;) {
    try { await tick(); }
    catch (e) {
      if (e instanceof AuthError) { log(`fatal: ${e.message}`); process.exit(2); }
      log(`tick failed: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, TICK_MS));
  }
}
