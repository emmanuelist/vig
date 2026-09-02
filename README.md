# Vig

**It never takes a position it can't cover.**

An autonomous options agent for the [Alpaca AI Trading Agents Hackathon](https://lablab.ai/ai-hackathons/alpaca-ai-trading-agents-hackathon).
Vig sells iron condors on US index ETFs and computes the maximum loss of every
structure *before* the order exists. If the account cannot cover that loss, the
order is never sent.

| | |
|---|---|
| **Alpaca paper account** | `PA3PLCOVLR4I` · UUID `687ede83-6811-4d04-9644-e71debbec71e` |
| **Live Cover Sheet** | _TODO: deployed URL_ |
| **Demo video** | _TODO_ |
| **Alpaca CLI** | `0.0.14` (alpha preview) |
| **Environment** | Paper trading only. No real capital. |

---

## The claim, and how to check it

Vig's entire execution path is the **Alpaca CLI**. Not the SDK with the CLI
mentioned in passing — every read and every write in this repo shells out to
`alpaca` and records what came back. Alpaca describes that tool as *"designed for
AI agents, scripts, and automation pipelines"*, and this is what taking that
seriously looks like.

Each order is submitted twice: once with `--dry-run`, which renders the exact
request body without sending it, and then again as the identical argv without the
flag. **The proof and the order are the same request.** That is what lets the
Cover Sheet claim a position was covered before it existed rather than after.

```bash
receipts/receipts.jsonl   # every CLI invocation: argv, exit code, response, duration
receipts/ledger.json      # every structure: strikes, credit, and the loss reserved against it
```

These are written at runtime and are not tracked in git — they grow for as long
as the agent runs, and they hold live account activity. A snapshot covering the
competition window is committed under `evidence/` with the submission. Each open
structure also carries its own receipt in the interface: click **receipt** on any
position to see the exact command that placed it, all four legs included.

Market-data responses over 8 KB are summarised in the log rather than stored —
one option chain is ~560 KB, and three underlyings on a sixty-second tick would
write about 4.8 GB across the competition. Order submissions are 1–2 KB, so they
are kept whole, which is the part that has to be auditable.

## Why iron condors

Three things converge on the same structure:

- `--legs` accepts at most **4**. An iron condor is exactly 4. The sponsor's
  primitive and the instrument fit without compromise.
- **Only one side can ever be breached.** Price cannot finish both below the short
  put and above the short call, so maximum loss is `width − credit`, not
  `2 × width − credit`. The structure is self-covering by construction.
- It is **delta-neutral**. Vig does not predict direction, because over the
  competition's ~2.6 trading sessions nobody has a measurable edge on direction
  and claiming one would be dishonest.

Credit is priced **against us** — sell at the bid, buy at the ask. The reserve is
what we would collect if every fill went the wrong way, so it can never be
optimistic.

## The gates

No structure reaches the CLI without clearing all of these:

| Gate | Refuses when |
|---|---|
| `illiquid` | any leg's bid/ask is wider than $0.15 |
| `thin-credit` | credit is under 10% of width — the payoff does not justify the tail |
| `position-too-large` | one structure would risk more than 5% of equity |
| `bucket-full` | one underlying+expiry would exceed 6% of equity |
| `book-full` | total reserved would exceed 25% of equity |
| `no-wing` | the protective strike does not exist, so width would silently change |
| `inverted` | short strikes have crossed and the loss is no longer bounded |
| `regime` | the news says today is a bad day to be short premium |

The per-bucket cap exists because the total ceiling is otherwise a fiction:
twenty-two identical SPY condors are not twenty-two bets. They breach together
and behave as one position at twenty-two times the size.

## The one judgement that isn't arithmetic

Strike selection is mechanical and needs no language model. But *whether today is
a bad day to sell premium* lives in prose, in the newswire — a rate decision, a
CPI print, a geopolitical shock. So Vig pulls headlines through
`alpaca data news` and asks a model on **[Featherless AI](https://featherless.ai)**
one question: is there an identifiable event today that makes a range-bound
assumption unsafe?

Two rules, both deliberate:

1. **The model can only veto.** There is no path by which it increases size or
   loosens a limit. Being wrong costs a missed trade, never an uncovered one.
2. **If it is unavailable, the agent keeps trading and says so on screen.** The
   mechanical gates are what bound the loss; this is an extra veto on top. A dead
   inference endpoint must not halt the strategy, and must not silently look like
   approval either.

**Status: implemented, unfunded.** The Featherless path is complete and exercised
— headlines are pulled live from `alpaca data news` on every tick and the verdict
is rendered with its provenance. We did not fund the inference subscription, so
in this submission the check reports `unavailable` and the Cover Sheet says so in
those words rather than implying a judgement was made. Set `FEATHERLESS_API_KEY`
and it engages with no other change.

## Nothing here is mocked

Every number rendered by the Cover Sheet was read from the paper account through
the CLI. There is no demo mode, no fixture, and no seeded state. The agent
refuses to trade a closed market, and when the market is closed the page shows
what it *would* do — priced against real quotes — rather than pretending to hold
positions.

Two facts about Alpaca's option chain that this repo defends against, both found
the expensive way:

- **The chain serves already-expired contracts.** On 2026-09-02 a plain SPY chain
  returned 470 contracts that expired the previous day, still quoted.
- **`greeks` is present only on unexpired contracts.** A zero or absent delta means
  expired, not far-out-of-the-money. It is the only reliable liveness signal in
  the payload.

## Limits, stated plainly

- **Paper trading only.** Results are hypothetical and do not represent real trading.
- **~2.6 trading sessions of P&L.** That is not a sample size from which any edge
  can be inferred. We do not claim one.
- **Negative skew.** Selling premium wins often and loses occasionally larger. The
  25% ceiling and the per-bucket cap bound how much that can cost, but the shape
  is real and choosing it was a deliberate response to a judging window too short
  for an edge to show.
- **Correlated underlyings.** SPY, QQQ and IWM are all US equity indices. The
  per-bucket cap spreads concentration but does not make them independent.
- **Alpha-preview CLI.** Flags may change between releases; every command in this
  repo was verified against `0.0.14` on 2026-09-02.
- **Unaudited.** This is a hackathon build.

## Running it

```bash
cp .env.example .env        # add ALPACA_API_KEY and ALPACA_SECRET_KEY
brew install alpacahq/tap/cli
npm install

npm run doctor              # preflight: options level, data feed, balance, safety
npm run chain               # what the agent would do right now, without doing it
npm run agent -- --once     # one pass
npm run agent               # loop
npm run serve               # the Cover Sheet at localhost:5174
```

`ALPACA_LIVE_TRADE` must never be set. The CLI defaults to paper and nothing in
this repo changes that.

---

Securities trading is offered by Alpaca Securities LLC. Options trading is not
suitable for all investors. Paper trading is a simulation and does not involve
real funds or real securities transactions.
