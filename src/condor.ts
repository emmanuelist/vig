/**
 * Iron condor construction, and the risk gates that stand in front of it.
 *
 * The whole product is the assertion that a trade is covered before it exists.
 * That assertion is made here, in `price()` and `gate()`, and nothing may reach
 * the CLI without passing through both.
 *
 * Pricing is deliberately pessimistic: we sell at the BID and buy at the ASK.
 * The credit we reserve against is the credit we would get if every fill went
 * against us. A reserve computed off mid-price would be a reserve that can be wrong.
 */

import type { Contract } from "./chain.js";

export type Leg = { contract: Contract; side: "sell" | "buy" };

export type Condor = {
  underlying: string;
  expiry: string;
  width: number;
  qty: number;

  shortPut: Contract;
  longPut: Contract;
  shortCall: Contract;
  longCall: Contract;

  /** Net credit per share, priced against us. */
  creditPerShare: number;
  /** Net credit in dollars for the whole position. */
  creditTotal: number;
  /** Worst case per share: only one wing can ever be breached. */
  maxLossPerShare: number;
  /** Dollars that must be reserved before this order is allowed to exist. */
  maxLossTotal: number;

  breakevenLow: number;
  breakevenHigh: number;
};

export type Rejection = { ok: false; reason: string; detail: string };
export type Priced = { ok: true; condor: Condor };

/** Nearest contract to a target delta among one right, or undefined. */
function atDelta(cs: Contract[], right: "C" | "P", target: number): Contract | undefined {
  const pool = cs.filter((c) => c.right === right);
  if (!pool.length) return undefined;
  return pool.reduce((best, c) =>
    Math.abs(c.delta - target) < Math.abs(best.delta - target) ? c : best);
}

function atStrike(cs: Contract[], right: "C" | "P", strike: number): Contract | undefined {
  return cs.find((c) => c.right === right && Math.abs(c.strike - strike) < 1e-9);
}

export type PriceParams = {
  underlying: string;
  expiry: string;
  /** Absolute delta for the short strikes. 0.12 ≈ an ~88% chance of expiring OTM. */
  shortDelta: number;
  /** Distance in dollars from each short strike to its protective wing. */
  width: number;
  qty: number;
};

/**
 * Build the four legs and price them. Returns a rejection rather than throwing:
 * a condor we decline to build is an ordinary outcome, not an error, and the
 * reason is worth showing.
 */
export function price(contracts: Contract[], p: PriceParams): Priced | Rejection {
  const live = contracts.filter((c) => c.expiry === p.expiry);
  if (!live.length) return { ok: false, reason: "no-contracts", detail: `nothing live at ${p.expiry}` };

  const shortPut = atDelta(live, "P", -p.shortDelta);
  const shortCall = atDelta(live, "C", p.shortDelta);
  if (!shortPut || !shortCall) {
    return { ok: false, reason: "no-short-strike", detail: `no contract near |delta| ${p.shortDelta}` };
  }

  // The wings must exist at exactly the strikes we need. Substituting a nearby
  // strike would silently change the width, and the width is the max loss.
  const longPut = atStrike(live, "P", shortPut.strike - p.width);
  const longCall = atStrike(live, "C", shortCall.strike + p.width);
  if (!longPut) {
    return { ok: false, reason: "no-wing", detail: `no put at ${shortPut.strike - p.width} to cap the put side` };
  }
  if (!longCall) {
    return { ok: false, reason: "no-wing", detail: `no call at ${shortCall.strike + p.width} to cap the call side` };
  }

  // The short strikes must not have crossed. If they have, the "condor" is a box
  // and the loss is guaranteed rather than bounded.
  if (shortPut.strike >= shortCall.strike) {
    return { ok: false, reason: "inverted", detail: `short put ${shortPut.strike} >= short call ${shortCall.strike}` };
  }

  // Priced against us on every leg.
  const creditPerShare =
    (shortPut.bid - longPut.ask) + (shortCall.bid - longCall.ask);

  if (creditPerShare <= 0) {
    return {
      ok: false, reason: "no-credit",
      detail: `structure pays ${creditPerShare.toFixed(2)} at these quotes — it costs money to open`,
    };
  }

  // Only one wing can be breached, so the worst case is one width less the credit.
  const maxLossPerShare = p.width - creditPerShare;

  return {
    ok: true,
    condor: {
      underlying: p.underlying,
      expiry: p.expiry,
      width: p.width,
      qty: p.qty,
      shortPut, longPut, shortCall, longCall,
      creditPerShare,
      creditTotal: creditPerShare * 100 * p.qty,
      maxLossPerShare,
      maxLossTotal: maxLossPerShare * 100 * p.qty,
      breakevenLow: shortPut.strike - creditPerShare,
      breakevenHigh: shortCall.strike + creditPerShare,
    },
  };
}

export type Limits = {
  /** Fraction of equity a single position may put at risk. */
  maxRiskPerPosition: number;
  /** Fraction of equity every open position may put at risk together. */
  maxRiskTotal: number;
  /** Minimum credit as a fraction of width. Below this the payoff is not worth the tail. */
  minCreditRatio: number;
  /** Widest bid/ask, in dollars, we will accept on any single leg. */
  maxLegSpread: number;
  /**
   * Fraction of equity permitted in any one underlying+expiry bucket.
   *
   * Without this the total ceiling is a fiction. Twenty-two identical SPY
   * condors are not twenty-two bets; they breach together and behave as one
   * position at twenty-two times the size. Concentration is capped per bucket
   * so the book has to spread across underlyings and expiries to fill up.
   */
  maxRiskPerBucket: number;
};

export const DEFAULT_LIMITS: Limits = {
  maxRiskPerPosition: 0.05,
  maxRiskTotal: 0.25,
  minCreditRatio: 0.10,
  maxLegSpread: 0.15,
  maxRiskPerBucket: 0.06,
};

export type Account = {
  equity: number;
  /** Dollars already reserved against open positions, across the whole book. */
  reserved: number;
  /** Dollars already reserved in this condor's own underlying+expiry bucket. */
  reservedInBucket?: number;
};

/**
 * The gate. Every reason a trade is refused lives here, and each one is
 * reported in terms a person can act on — this text goes on the Cover Sheet and
 * is read aloud in the demo.
 */
export function gate(c: Condor, acct: Account, lim: Limits = DEFAULT_LIMITS): Rejection | { ok: true } {
  const legs: Array<[string, Contract]> = [
    ["short put", c.shortPut], ["long put", c.longPut],
    ["short call", c.shortCall], ["long call", c.longCall],
  ];

  for (const [name, leg] of legs) {
    if (leg.spread > lim.maxLegSpread) {
      return {
        ok: false, reason: "illiquid",
        detail: `${name} ${leg.symbol} is ${leg.spread.toFixed(2)} wide, over the ${lim.maxLegSpread.toFixed(2)} limit`,
      };
    }
  }

  const ratio = c.creditPerShare / c.width;
  if (ratio < lim.minCreditRatio) {
    return {
      ok: false, reason: "thin-credit",
      detail: `credit is ${(ratio * 100).toFixed(1)}% of width, under the ${(lim.minCreditRatio * 100).toFixed(0)}% floor`,
    };
  }

  const perPositionCap = acct.equity * lim.maxRiskPerPosition;
  if (c.maxLossTotal > perPositionCap) {
    return {
      ok: false, reason: "position-too-large",
      detail: `risks $${c.maxLossTotal.toFixed(0)}, over the $${perPositionCap.toFixed(0)} single-position cap`,
    };
  }

  const bucketCap = acct.equity * lim.maxRiskPerBucket;
  const inBucket = acct.reservedInBucket ?? 0;
  if (inBucket + c.maxLossTotal > bucketCap) {
    return {
      ok: false, reason: "bucket-full",
      detail: `${c.underlying} ${c.expiry} already holds $${inBucket.toFixed(0)}; another would concentrate past $${bucketCap.toFixed(0)}`,
    };
  }

  const totalCap = acct.equity * lim.maxRiskTotal;
  if (acct.reserved + c.maxLossTotal > totalCap) {
    return {
      ok: false, reason: "book-full",
      detail: `$${acct.reserved.toFixed(0)} already reserved; this would take the book past its $${totalCap.toFixed(0)} ceiling`,
    };
  }

  return { ok: true };
}

/** The four legs, in the shape `alpaca order submit --legs` expects. */
export function legsPayload(c: Condor) {
  const leg = (contract: Contract, side: "sell" | "buy") => ({
    symbol: contract.symbol,
    side,
    ratio_qty: "1",
    position_intent: side === "sell" ? "sell_to_open" : "buy_to_open",
  });
  return [
    leg(c.shortPut, "sell"), leg(c.longPut, "buy"),
    leg(c.shortCall, "sell"), leg(c.longCall, "buy"),
  ];
}
