/**
 * The ledger.
 *
 * Alpaca has no concept of "an iron condor". Submit four legs and it reports
 * four independent option positions; nothing in the API remembers that they were
 * one decision with one bounded loss. So we keep that knowledge ourselves.
 *
 * The ledger is what makes the Cover Sheet possible: it is the only place where
 * "this $440 is reserved against these four symbols" is written down. It is
 * append-only and survives restarts, because an agent that forgets what it
 * reserved is an agent that cannot claim anything is covered.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import type { Condor } from "./condor.js";

const DIR = "receipts";
const FILE = `${DIR}/ledger.json`;

export type OpenPosition = {
  id: string;
  clientOrderId: string;
  orderId?: string;
  underlying: string;
  expiry: string;
  qty: number;
  width: number;

  /** The four OCC symbols, so live positions can be joined back to this condor. */
  symbols: { shortPut: string; longPut: string; shortCall: string; longCall: string };
  strikes: { shortPut: number; longPut: number; shortCall: number; longCall: number };

  /** Credit we priced against ourselves, and the loss reserved before submitting. */
  creditTotal: number;
  maxLossTotal: number;
  breakevenLow: number;
  breakevenHigh: number;

  /**
   * The evidence. `argv` is the exact command that placed this structure and
   * `preview` is what `--dry-run` rendered for that same command a moment
   * earlier. Holding both is what lets the Cover Sheet show a judge that the
   * request we proved and the request we sent are the same request.
   *
   * Safe to display: credentials travel via environment, never argv.
   */
  proof?: { argv: string[]; preview: unknown };

  openedAt: string;
  /** Set once the structure is closed or expired. */
  closedAt?: string;
  realizedPnl?: number;
};

export type Ledger = { positions: OpenPosition[] };

export function load(): Ledger {
  if (!existsSync(FILE)) return { positions: [] };
  return JSON.parse(readFileSync(FILE, "utf8")) as Ledger;
}

export function save(l: Ledger): void {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(l, null, 2));
}

export function record(c: Condor, clientOrderId: string, orderId?: string, proof?: OpenPosition["proof"]): OpenPosition {
  const l = load();
  const pos: OpenPosition = {
    id: clientOrderId,
    clientOrderId,
    orderId,
    underlying: c.underlying,
    expiry: c.expiry,
    qty: c.qty,
    width: c.width,
    symbols: {
      shortPut: c.shortPut.symbol, longPut: c.longPut.symbol,
      shortCall: c.shortCall.symbol, longCall: c.longCall.symbol,
    },
    strikes: {
      shortPut: c.shortPut.strike, longPut: c.longPut.strike,
      shortCall: c.shortCall.strike, longCall: c.longCall.strike,
    },
    creditTotal: c.creditTotal,
    maxLossTotal: c.maxLossTotal,
    breakevenLow: c.breakevenLow,
    breakevenHigh: c.breakevenHigh,
    proof,
    openedAt: new Date().toISOString(),
  };
  l.positions.push(pos);
  save(l);
  return pos;
}

export const isOpen = (p: OpenPosition): boolean => !p.closedAt;

/** Total dollars reserved against everything still open. */
export function reserved(l: Ledger): number {
  return l.positions.filter(isOpen).reduce((s, p) => s + p.maxLossTotal, 0);
}

/** Dollars reserved within one underlying+expiry bucket. */
export function reservedInBucket(l: Ledger, underlying: string, expiry: string): number {
  return l.positions
    .filter((p) => isOpen(p) && p.underlying === underlying && p.expiry === expiry)
    .reduce((s, p) => s + p.maxLossTotal, 0);
}

export const bucketKey = (underlying: string, expiry: string) => `${underlying}:${expiry}`;

/**
 * Mark structures closed once their legs have left the account. An expired
 * condor simply stops appearing in `position list`; nothing announces it.
 */
export function reconcile(l: Ledger, liveSymbols: Set<string>): OpenPosition[] {
  const justClosed: OpenPosition[] = [];
  for (const p of l.positions) {
    if (!isOpen(p)) continue;
    const stillHeld = Object.values(p.symbols).some((s) => liveSymbols.has(s));
    if (!stillHeld) {
      p.closedAt = new Date().toISOString();
      // Every leg gone with none breached means the credit was kept in full.
      // A breached condor is closed by Alpaca's assignment/exercise flow and
      // its true P&L comes from the account, not from this assumption — so this
      // is a floor, corrected by `settle()` when activities confirm otherwise.
      p.realizedPnl = p.creditTotal;
      justClosed.push(p);
    }
  }
  if (justClosed.length) save(l);
  return justClosed;
}
