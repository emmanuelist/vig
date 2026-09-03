/**
 * Rebuild the ledger from what the broker actually holds.
 *
 * The ledger is the only record of which four legs formed one decision with one
 * bounded loss. When a failed read wrongly marked every structure settled, that
 * knowledge was lost while the positions stayed open — the interface then showed
 * an empty book against a live account, and the risk gates read zero reserved.
 *
 * Broker positions are the truth. This reopens any ledger entry whose legs are
 * still held, and leaves genuinely settled ones closed.
 *
 *   npm run rebuild-ledger
 */
import "dotenv/config";
import { alpaca } from "../src/cli.js";
import * as ledger from "../src/ledger.js";

type Position = { symbol: string };

const held = new Set((await alpaca<Position[]>("position", "list")).map((p) => p.symbol));
if (held.size === 0) {
  console.error("account reports no legs — refusing to rebuild against an empty read");
  process.exit(1);
}

const book = ledger.load();
let reopened = 0, stillClosed = 0;

for (const p of book.positions) {
  const legsHeld = Object.values(p.symbols).filter((s) => held.has(s)).length;
  if (legsHeld > 0 && p.closedAt) {
    delete p.closedAt;
    delete p.realizedPnl;
    reopened++;
  } else if (legsHeld === 0 && !p.closedAt) {
    p.closedAt = new Date().toISOString();
    p.realizedPnl = p.creditTotal;
    stillClosed++;
  }
}
ledger.save(book);

const open = book.positions.filter(ledger.isOpen);
const reserved = open.reduce((t, p) => t + p.maxLossTotal, 0);
const credit = open.reduce((t, p) => t + p.creditTotal, 0);
const legs = new Set(open.flatMap((p) => Object.values(p.symbols)));

console.log(`broker holds ${held.size} legs`);
console.log(`  reopened ${reopened} structures the failed read had wrongly settled`);
console.log(`  ${stillClosed} confirmed settled`);
console.log(`  open now: ${open.length} structures, ${legs.size} legs`);
console.log(`  reserved $${reserved.toLocaleString()}   credit $${credit.toLocaleString()}`);
const unaccounted = [...held].filter((s) => !legs.has(s));
if (unaccounted.length) console.log(`  legs held but not in any ledger entry: ${unaccounted.length}`);
