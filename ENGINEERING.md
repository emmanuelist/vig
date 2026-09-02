# Vig — build rules

> **vig** (n.) *vigorish*. The house's cut. The edge the book takes for standing
> between two people who both think they are right.

**Thesis (use this sentence verbatim, everywhere):**
*It never takes a position it can't cover.*

That sentence goes in the repo description, the README subtitle, the lablab
submission field, and the closing line of the demo video. Identical wording each time.

**Event:** Alpaca AI Trading Agents Hackathon (lablab.ai × Alpaca).
Deadline **Sep 4 2026, 15:00 UTC**. $6,300 pool. See [see.md](see.md) for the full brief.
As of Sep 2: 1,157 teams registered, 58 submissions, 80 drafts.

**Judging criteria — build against these, not against taste.** No weights published.

| Criterion | Where we win it |
|---|---|
| P&L Performance | Defined-risk credit spreads: many small, capped, high hit rate. Optimised for P(green at judging) over ~2.6 sessions, not for max return. |
| Technology Implementation | The CLI *is* the execution path. Every action a JSON receipt. Not an SDK import with MCP name-dropped in the README. |
| Creativity & Originality | Options as the thesis, not a bolted-on leg to satisfy the rule. Collateral proven before the order exists. |
| Presentation & Execution | The Cover Sheet, and a 3-minute scripted film — not a hand-recorded screen capture. |

---

## 1. Non-negotiables

1. **No mocks, no fake data, no demo mode.** Every number rendered comes from the
   Alpaca account or the market. No seeded fixtures in the demo path. Judges detect
   mocks instantly and it is the most common reason strong-looking projects lose.
   If a surface cannot be filled with real data yet, it does not ship.
2. **Verify every CLI invocation against `--help` or `--schema` before writing it.**
   The CLI is **0.0.14, alpha preview** — flags change between releases. Do not infer
   flags from the Python SDK or from other brokers. A hallucinated command surface is
   the most expensive failure mode in a timeboxed build.
3. **Phase-gate.** Build one phase, stop, confirm it against the paper account, then
   start the next. No parallel half-finished systems.
4. **Never scope-cut silently.** If something has to go, say so and say why, on
   technical merit rather than effort.
5. **Green gate before any phase closes:** typecheck clean, build succeeds.

## 2. The hard prohibition

```
ALPACA_LIVE_TRADE   must never be set, anywhere, for any reason.
```

The CLI defaults to paper. Setting that variable routes orders to **live money**.
It must not appear in `.env`, in a script, in a shell export, or in a code path that
could set it conditionally. There is no scenario in this project where live routing
is correct. If you find yourself writing it, stop.

Paper-only is also a hackathon rule, not just a safety rail: submissions run in the
paper environment and paper results are hypothetical.

## 3. Account rules — these decide eligibility, not quality

- The competition account is **brand new and dedicated to this hackathon**. Reused or
  pre-existing accounts are **not eligible for judging**. Prototype wherever you like;
  the submitted account must be fresh.
- **Starting balance exactly $100,000.**
- The **paper account ID ships in the submission** — it is how judges pull our P&L.
- Keys live in `.env`, which is gitignored, and are never printed to stdout, never
  written into `film/`, and never visible in a demo frame. The film QA pass checks
  frames for leaked keys.

## 4. CLI facts — verified against 0.0.14 on 2026-09-02, do not re-derive

Installed with `brew install alpacahq/tap/cli`. Alpaca's own description: *"designed
for AI agents, scripts, and automation pipelines."* That is the sentence the
Technology Implementation score hangs on — the CLI is the product's execution path,
not a convenience.

**Auth** resolves in order: `ALPACA_API_KEY` + `ALPACA_SECRET_KEY`, then profile access
token, then profile key/secret.

**Output** is JSON on stdout by default. Errors are JSON on **stderr**.
Exit codes: `0` success, `1` error, **`2` auth failure** — treat 2 as fatal and stop
the loop; do not retry it as though it were a transient error.

**Global flags that matter:** `--jq` (filter in-process), `--quiet` (suppress hints and
colour — always use this when parsing), `--schema` (dump the response schema, use it
instead of guessing field names), `--timeout`.

**Commands we use:**

```
alpaca account get
alpaca clock                          # gate the loop; never trade a closed market
alpaca calendar
alpaca data option chain              # candidate selection
alpaca data option latest-quotes      # mid, spread width, liquidity check
alpaca data option snapshot
alpaca option contracts               # contract discovery + filtering
alpaca option get
alpaca option exercise | do-not-exercise
alpaca order submit                   # see mleg below
alpaca order list --status open
alpaca order cancel | cancel-all
alpaca position list | close | close-all
alpaca api [METHOD] <path>            # raw escape hatch, only if a command is missing
alpaca doctor
```

**Multi-leg is real and it is how every Vig trade is placed:**

```
alpaca order submit --order-class mleg --qty 1 --type limit --limit-price <credit> \
  --time-in-force day --client-order-id <uuid> \
  --legs '[{"symbol":...,"side":"sell","ratio_qty":"1","position_intent":"sell_to_open"},
           {"symbol":...,"side":"buy","ratio_qty":"1","position_intent":"buy_to_open"}]'
```

- `--legs` takes **at most 4**.
- With `--order-class mleg`, top-level `--symbol` and `--side` are **not** required —
  they are required for every other order class.
- **`--client-order-id` on every single order.** It makes retries idempotent, and it is
  the join key between our receipt log and Alpaca's order record. Non-negotiable: a
  timed-out submit that we blindly retry without one doubles the position.
- **`--dry-run` prints the request body without submitting, but still requires auth.**
  It is the receipt generator: we render the exact request we are about to send, prove
  the collateral covers it, and only then submit the same body for real.

**Flag gotchas, verified:**

- `data option chain` takes `--underlying-symbol` (**singular**).
  `option contracts` takes `--underlying-symbol`**`s`** (**plural**). They are
  different commands with different flag names for the same idea.
- `data option chain` filters we actually want: `--expiration-date`,
  `--strike-price-gte` / `--strike-price-lte`, `--type call|put`, `--limit`
  (default 100, so paginate or narrow), `--feed` (default `opra`).
- `order submit --legs` JSON shape is **validated** against a live `--dry-run`
  (exit 0, 2026-09-02). The four keys per leg are exactly
  `symbol` · `side` · `ratio_qty` · `position_intent`, and the server echoes them
  back unchanged. `--qty` is the condor count, not the leg count.

**Resolved against the competition account, 2026-09-02 03:30 WAT:**
- **Options level 3 — spreads permitted.** The strategy runs as designed.
- Equity **$100,000.00** exactly. Margin account, $400k buying power.
- `SPY` chain returns 100 contracts, all carrying quotes.
- Two identifiers, and they are not interchangeable. **Ship both in the submission:**
  account number `PA3PLCOVLR4I` (dashboard) · UUID
  `687ede83-6811-4d04-9644-e71debbec71e` (API `id`).

- **Data feed: REAL-TIME OPRA, not delayed.** Settled without waiting for the
  open: across 500 SPY contracts the newest quote was stamped
  `19:59:59.9988Z` — 1.1 ms before the 20:00Z bell. A 15-minute-delayed feed
  cannot produce that timestamp. `--feed` defaults to `opra`.

**Chain gotchas, each one verified and each one able to pick a dead contract:**
- The chain returns **already-expired** contracts. On 2026-09-02 a plain SPY
  chain gave 470 contracts expiring 2026-09-01. Always bound with
  `--expiration-date-gte`.
- **`greeks` is present only on unexpired contracts.** A zero/absent delta means
  expired, not far-OTM. `fetchChain` drops those, and that is the only reliable
  liveness signal in the payload.
- Quote keys are two letters: `bp`/`ap` price, `bs`/`as` size, `bx`/`ax` exchange,
  `t` timestamp.

## 5. The strategy — and its honest shape

**Iron condors.** Four legs: a short put spread below the market and a short call
spread above it. We collect premium from the bulls and the bears at once, and the
position profits if price simply stays between the short strikes.

This is not a stylistic choice. Three things converge on it:

- `--legs` caps at **4**. An iron condor is exactly 4. The sponsor's primitive and
  the structure fit without compromise.
- **Only one side can ever be breached.** Price cannot finish both below the short
  put and above the short call. So max loss is `width − credit`, not `2×width − credit`
  — the structure is self-covering by construction, which is the thesis in geometry.
- It is **delta-neutral**. We do not predict direction, because over 2.6 sessions we
  have no measurable edge on direction and claiming one would be dishonest.

Max loss is `(width − net credit) × 100 × qty`, known exactly before the order exists,
computed and reserved *before* the request reaches the CLI. Price the credit
conservatively — **sell at the bid, buy at the ask** — so the reserve is never
optimistic.

The claim is not that this predicts the market. It is that **the loss is bounded and
pre-funded**. Max loss is computed and reserved *before* the order reaches the CLI; if
the account cannot cover it, the trade is never submitted. That is the whole product.

**Say the limitation out loud, in the README and in the film:** this shape has a high
hit rate and negative skew — many small wins, occasional larger loss. Over ~2.6
sessions it maximises the probability of finishing green, which is a deliberate
response to a judging window too short for any edge to be statistically real. We do
not claim an edge we have not measured. Two days of P&L is not evidence, and saying so
buys more credit than it costs.

## 6. Frontend

Direction comes from `premium-product-design`. Hackathon-specific:

- **Hand-build the components.** No component library. A default MUI/Chakra/shadcn look
  is recognisable on sight and drops us into the same bucket as thirty other entries.
- **One signature component, and it *is* the thesis: The Cover Sheet.** Every open
  position, live, showing premium collected against max loss already reserved — and the
  account's total uncovered exposure, which reads **zero**, always, by construction.
  That zero is the product. Build it first and make it unmissable.
- **Design for the beat.** What is the judge looking at in second 40? That element gets
  built before anything peripheral.
- Every state, with real content lengths: market closed, no positions yet, an order
  rejected by the risk gate, a spread that filled one leg, assignment pending, long
  OCC symbols (`SPY260904P00640000`), five-figure numbers.
- The film pipeline scripts a real cursor that clicks and types. Give it something
  worth clicking — a passive dashboard wastes the capability.

## 7. README is a verification surface

Above the fold: the thesis sentence · live deployed link · demo video · the **paper
account ID** · CLI version. Then a section stating plainly that nothing is mocked, and
proving it — real order IDs, real fills, real receipts.

**State the limits honestly:** paper only, ~2.6 sessions of P&L, negative skew,
unaudited, alpha-preview CLI, whatever data tier we ended up on. Naming our own gaps
reads as engineering maturity and pre-empts the question a judge was already forming.

## 8. The film

Pipeline ported from `~/Documents/hackathons/cleave` — see that project's
`DEMO-VIDEO-PLAYBOOK.md` for the failure modes, all of which apply here.
Project-agnostic scripts are copied unchanged. The tailoring surface is
`narration.ts`, `pointer.ts → MOVES`, `card.ts → CARDS`, and `film.ts → main()`.

Run order is not negotiable: `film` → `film:cut` → `voice` → `film:mix`.

**Zoom sparingly.** Three or four pushes in a three-minute film, on the beats that
actually matter — the uncovered-exposure zero, a rejected order, a real fill. Where a
push-in is not earning anything, let the shot play flat. Zoom on every move is nausea.
