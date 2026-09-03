# Vig — one-page write-up

**It never takes a position it can't cover.**
Paper account `PA3PLCOVLR4I` · [github.com/emmanuelist/vig](https://github.com/emmanuelist/vig) · [emmanuelist.github.io/vig](https://emmanuelist.github.io/vig/)

---

## AI logic

Vig sells **iron condors** on SPY, QQQ and IWM — a short put spread below the
market and a short call spread above it, collecting premium from both sides.
Three constraints converge on that instrument: Alpaca's `--legs` accepts at most
four and a condor is exactly four; only one side can ever be breached, so
maximum loss is `width − credit` rather than twice it, making the structure
self-covering; and it is delta-neutral, the honest posture when the window is
too short for a directional edge to be statistically real.

Selection is mechanical. Short strikes sit at ≈0.12 delta from the live chain,
wings one width out, with width scaled as a fraction of spot rather than a fixed
dollar amount — a flat $5 is 0.66% of SPY but 1.7% of IWM and would silently
exclude the cheaper underlying. Credit is priced **against us**, selling at the
bid and buying at the ask, so the reserve is what we would collect if every fill
went the wrong way.

The one judgement that is not arithmetic goes to a language model. Whether
*today* is a bad day to be short premium lives in prose, so Vig pulls headlines
via `alpaca data news` and asks a model on Featherless AI whether an identifiable
event makes a range-bound assumption unsafe. It can only ever **veto** — never
increase size or loosen a limit — and if it is unavailable the agent keeps
trading and says so on screen, because a dead endpoint must not resemble approval.

## Risk gates

No structure reaches the broker without clearing all eight.

| Gate | Refuses when |
|---|---|
| `illiquid` | any leg's bid/ask exceeds $0.15 |
| `thin-credit` | credit is under 10% of width |
| `position-too-large` | one structure risks over 5% of equity |
| `bucket-full` | one underlying+expiry exceeds 6% of equity |
| `book-full` | total reserved exceeds the 25% ceiling |
| `no-wing` | the protective strike does not exist |
| `inverted` | short strikes crossed; loss no longer bounded |
| `regime` | the newswire says stand aside |

The per-bucket cap exists because the total ceiling is otherwise a fiction:
twenty identical SPY condors are not twenty bets, they breach together as one
position at twenty times the size. Refusals carry readable reasons and are shown
beside the fills.

**The account finished down 13%.** On 2 September at 23:48 a `position list`
call failed; the tick substituted an empty array, which the reconciler could not
tell from an account holding nothing. It marked every structure settled and reset
reserved to zero — `book-full` then saw a full ceiling against a book already
full, and the agent doubled its position count before the market rallied through
the short calls. Every structure stayed inside its own bounded loss and
**uncovered exposure never left zero**. The per-position guarantee held; the
portfolio ceiling did not, defeated by a bug rather than a decision. The failure
and its two-guard fix are both in the repository history.

## Alpaca infrastructure

**The CLI is the entire execution path** — `data option chain` for selection,
`order submit --order-class mleg` for the four-leg structure, plus `position
list`, `account get`, `clock` and `data news`. Not an SDK with the CLI mentioned
in passing: **4,594 invocations**, each leaving a receipt with its argv, exit
code and duration.

**Every order is submitted twice** — once with `--dry-run`, which renders the
exact request without sending it, then again as the identical argv for real. The
proof and the order are the same request: 48 submissions, 24 dry-run proofs, one
per structure, committed under `evidence/`.

Two chain behaviours are defended against, both found the expensive way: the
chain returns **already-expired contracts** (470 dead SPY strikes on 2
September), and `greeks` appears only on unexpired ones, making a zero delta the
only reliable liveness signal. Index options were evaluated when Alpaca launched
them mid-event and declined on measurement — 400 of 400 SPX contracts carried a
bid and none carried a delta, and selection here is delta-based.

Paper trading only. `ALPACA_LIVE_TRADE` is never set.
