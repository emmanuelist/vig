/**
 * Scan the live chain and show what the agent would do, without doing it.
 *   npm run chain -- [underlying] [shortDelta] [width] [qty]
 */

import "dotenv/config";
import { fetchChain, inferSpot } from "../src/chain.js";
import { price, gate, legsPayload, DEFAULT_LIMITS } from "../src/condor.js";
import { alpaca } from "../src/cli.js";

const [, , sym = "SPY", d = "0.12", w = "5", q = "1"] = process.argv;
const shortDelta = Number(d), width = Number(w), qty = Number(q);

const today = new Date().toISOString().slice(0, 10);
const horizon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

const acct = await alpaca<Record<string, unknown>>("account", "get");
const equity = Number(acct.equity);

const contracts = await fetchChain(sym, today, horizon);
const spot = inferSpot(contracts);
const expiries = [...new Set(contracts.map((c) => c.expiry))].sort();

console.log(`\n\x1b[1m${sym}\x1b[0m  spot ~$${spot?.toFixed(2) ?? "?"}   equity $${equity.toLocaleString()}`);
console.log(`${contracts.length} live contracts across ${expiries.join(", ")}\n`);

for (const expiry of expiries) {
  const p = price(contracts, { underlying: sym, expiry, shortDelta, width, qty });

  if (!p.ok) {
    console.log(`\x1b[33m${expiry}  declined\x1b[0m — ${p.reason}: ${p.detail}`);
    continue;
  }

  const c = p.condor;
  const g = gate(c, { equity, reserved: 0 }, DEFAULT_LIMITS);
  const verdict = g.ok
    ? "\x1b[32mwould submit\x1b[0m"
    : `\x1b[31mrefused\x1b[0m — ${g.reason}: ${g.detail}`;

  console.log(`\x1b[1m${expiry}\x1b[0m  ${verdict}`);
  console.log(`   put  ${c.longPut.strike} / ${c.shortPut.strike}   call ${c.shortCall.strike} / ${c.longCall.strike}`);
  console.log(`   short deltas  put ${c.shortPut.delta.toFixed(3)}   call ${c.shortCall.delta.toFixed(3)}`);
  console.log(`   credit  $${c.creditTotal.toFixed(0)}   max loss  \x1b[1m$${c.maxLossTotal.toFixed(0)}\x1b[0m   (${(c.creditPerShare / c.width * 100).toFixed(1)}% of width)`);
  console.log(`   profits between  $${c.breakevenLow.toFixed(2)} — $${c.breakevenHigh.toFixed(2)}`);
  if (spot) {
    const room = Math.min(spot - c.breakevenLow, c.breakevenHigh - spot) / spot * 100;
    console.log(`   nearest breakeven is ${room.toFixed(2)}% away from spot`);
  }
  console.log();
}

console.log("legs payload for the nearest expiry:");
const first = expiries[0];
if (first) {
  const p = price(contracts, { underlying: sym, expiry: first, shortDelta, width, qty });
  if (p.ok) console.log(JSON.stringify(legsPayload(p.condor)));
}
console.log();
