# Vig

**It never takes a position it can't cover.**

An autonomous options agent for the [Alpaca AI Trading Agents Hackathon](https://lablab.ai/ai-hackathons/alpaca-ai-trading-agents-hackathon).
Vig sells iron condors on US index ETFs and computes the maximum loss of every
structure *before* the order exists. If the account cannot cover that loss, the
order is never sent.

| | |
|---|---|
| **Alpaca paper account** | `PA3PLCOVLR4I` · UUID `687ede83-6811-4d04-9644-e71debbec71e` |
| **Live** | **[emmanuelist.github.io/vig](https://emmanuelist.github.io/vig/)** — the Cover Sheet is at [`/app.html`](https://emmanuelist.github.io/vig/app.html) |
| **Mirror** | [vig-six.vercel.app](https://vig-six.vercel.app) — the Cover Sheet is at [`/app`](https://vig-six.vercel.app/app) |
| **Repository** | [github.com/emmanuelist/vig](https://github.com/emmanuelist/vig) |
| **Demo video** | _recorded once the competition window closes_ |
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

The deployed copy has no agent behind it, so it serves a committed snapshot of
real account state and labels it as one, with the time it was taken. `live:
false` travels inside the payload; a snapshot is never rendered as though it
were live. Run the agent locally and the same pages stream.

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

## Index options: evaluated, declined

Alpaca launched index options on the Trading API on 2 September 2026, mid-event.
They are attractive for this strategy on paper: SPX and XSP are cash settled and
**European-style, so a short leg cannot be assigned before expiration**, which
removes the assignment mechanics that American-style equity options carry.

They are not used here, for a measured reason. Alpaca's chain returns quotes for
index options but **no greeks** — verified on 2 September: 400 of 400 SPX
contracts carried a live bid and none carried a delta; XSP returned 188 bids and
zero deltas. Strike selection in `src/condor.ts` is delta-based, so adopting
them would mean replacing the risk model's selection criterion with an untested
one, on an underlying this agent has never traded, inside the last day of the
competition.

Worth stating plainly: assignment was never a hole in the claim. On a defined-risk
spread the long wing still caps the loss when the short leg is assigned, so the
position stays covered — early assignment is a capital-mechanics nuisance, not an
uncovered loss. European exercise would have removed the nuisance, not a risk.

## The incident, 2 September 23:48 UTC

At 23:48 a single call to `position list` failed to reach the API. The tick
caught the error and substituted an empty array, which `reconcile()` cannot
distinguish from an account that genuinely holds nothing. It marked all twelve
open structures settled, booked their credit as realised profit, and reset
`reserved` to zero.

With reserved reading zero, `book-full` saw an entire ceiling of headroom
against a book that was already full. The agent opened twelve more. Twenty-four
structures and **$53,453 reserved against a $21,532 ceiling** — 62% of equity at
risk where the design permits 25%. The market then rallied through the short
calls and the doubled book took double the loss.

**What held.** Every structure's loss stayed inside its own width. The long
wings paid for exactly what they were bought for, and **uncovered exposure never
left zero through the entire drawdown** — the receipts show it tick by tick. The
per-position claim is intact and was never in question.

**What failed.** Portfolio discipline. The ceiling was not overridden by a
decision; it was defeated by a bug that made the agent forget what it held. A
risk limit computed from state is only as good as the state, and this state
could be silently erased by one failed read.

**The fix**, in `src/agent.ts` and `src/ledger.ts`, is two redundant guards. A
tick that cannot read the account returns without reconciling and without
trading — staleness is recoverable, an amnesiac ledger is not. And `reconcile()`
independently refuses to settle an open book against zero live legs, because a
whole book closing between two ticks is possible in principle and a failed read
is not.

`npm run rebuild-ledger` restores the ledger from broker positions, which are
the truth whenever the two disagree.

This is in the README rather than in a postmortem nobody reads because the
project's claim is that its numbers are checkable. A drawdown this size is the
most checkable thing here.

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
