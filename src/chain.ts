/**
 * Reading the option chain.
 *
 * Everything here comes from `alpaca data option chain`. Two facts about that
 * payload cost real time to discover and are enforced below:
 *
 *  1. The chain contains ALREADY-EXPIRED contracts. On 2026-09-02 a plain SPY
 *     chain returned 470 contracts expiring 2026-09-01 — dead, still quoted,
 *     still selectable by anything that does not filter. Always bound the query
 *     with --expiration-date-gte.
 *  2. `greeks` is present only on unexpired contracts. A missing/zero delta is
 *     the signature of a dead contract, not of a far-OTM one.
 */

import { alpaca } from "./cli.js";

/** Alpaca's quote payload. Two-letter keys: bid/ask price, size, exchange. */
export type Quote = {
  bp: number; bs: number; bx: string;
  ap: number; as: number; ax: string;
  t: string; c?: string;
};

export type Greeks = { delta: number; gamma: number; theta: number; vega: number; rho: number };

export type Snapshot = {
  latestQuote?: Quote;
  latestTrade?: { p: number; s: number; t: string };
  greeks?: Greeks;
};

/** A contract we are willing to consider trading. */
export type Contract = {
  symbol: string;
  expiry: string;      // YYYY-MM-DD
  right: "C" | "P";
  strike: number;
  bid: number;
  ask: number;
  mid: number;
  spread: number;      // ask - bid, in dollars per share
  delta: number;
  quotedAt: string;
};

/** OCC symbol: SPY260904P00755000 -> root, YYMMDD, C|P, strike x1000 (8 digits). */
const OCC = /^([A-Z]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/;

export function parseOcc(symbol: string): { root: string; expiry: string; right: "C" | "P"; strike: number } | null {
  const m = OCC.exec(symbol);
  if (!m) return null;
  const [, root, yy, mm, dd, right, strike] = m;
  return {
    root: root!,
    expiry: `20${yy}-${mm}-${dd}`,
    right: right as "C" | "P",
    strike: Number(strike) / 1000,
  };
}

/** Build an OCC symbol. Strike is padded to 8 digits at 1/1000 precision. */
export function occSymbol(root: string, expiry: string, right: "C" | "P", strike: number): string {
  const [y, m, d] = expiry.split("-");
  const k = String(Math.round(strike * 1000)).padStart(8, "0");
  return `${root}${y!.slice(2)}${m}${d}${right}${k}`;
}

type ChainResponse = { snapshots: Record<string, Snapshot>; next_page_token?: string | null };

/**
 * Fetch every live contract for an underlying between two dates, following
 * pagination. `from` defaults to today, which is what keeps expired contracts out.
 */
export async function fetchChain(
  underlying: string,
  from: string,
  to: string,
): Promise<Contract[]> {
  const out: Contract[] = [];
  let pageToken: string | undefined;

  do {
    const args = [
      "data", "option", "chain",
      "--underlying-symbol", underlying,
      "--expiration-date-gte", from,
      "--expiration-date-lte", to,
      "--limit", "1000",
    ];
    if (pageToken) args.push("--page-token", pageToken);

    const page = await alpaca<ChainResponse>(...args);

    for (const [symbol, snap] of Object.entries(page.snapshots ?? {})) {
      const occ = parseOcc(symbol);
      const q = snap.latestQuote;
      const delta = snap.greeks?.delta;

      // No greeks means the contract has expired. No quote means we cannot
      // price it. Either way it is not tradeable and must not reach selection.
      if (!occ || !q || delta === undefined || delta === 0) continue;
      if (q.bp <= 0 || q.ap <= 0) continue;

      out.push({
        symbol,
        expiry: occ.expiry,
        right: occ.right,
        strike: occ.strike,
        bid: q.bp,
        ask: q.ap,
        mid: (q.bp + q.ap) / 2,
        spread: q.ap - q.bp,
        delta,
        quotedAt: q.t,
      });
    }
    pageToken = page.next_page_token ?? undefined;
  } while (pageToken);

  return out;
}

/**
 * Spot, inferred by put-call parity at the strike where call and put mids are
 * closest. Cheaper and more reliable than a second market-data call, and it uses
 * the same quotes the strikes are chosen from.
 */
export function inferSpot(contracts: Contract[]): number | null {
  const byExpiry = new Map<string, { c: Map<number, Contract>; p: Map<number, Contract> }>();
  for (const c of contracts) {
    let e = byExpiry.get(c.expiry);
    if (!e) byExpiry.set(c.expiry, (e = { c: new Map(), p: new Map() }));
    (c.right === "C" ? e.c : e.p).set(c.strike, c);
  }

  const nearest = [...byExpiry.keys()].sort()[0];
  const e = nearest ? byExpiry.get(nearest) : undefined;
  if (!e) return null;

  const shared = [...e.c.keys()].filter((k) => e.p.has(k));
  if (!shared.length) return null;

  const atm = shared.reduce((best, k) =>
    Math.abs(e.c.get(k)!.mid - e.p.get(k)!.mid) < Math.abs(e.c.get(best)!.mid - e.p.get(best)!.mid) ? k : best);

  return atm + e.c.get(atm)!.mid - e.p.get(atm)!.mid;
}
