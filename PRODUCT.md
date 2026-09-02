# Vig — product truth

> **Assumptions labelled.** Written by inference from the working brief and the
> built system, not from a user interview: the operator asked for an autopilot
> run. Everything under "Mechanism", "Constraints" and "Proof" is verified
> against shipped code and the live Alpaca account. Items marked *(assumed)* are
> inferences that a later interview should confirm.

## What it is

An autonomous options trading agent that sells iron condors on US index ETFs
through Alpaca's programmable brokerage, and computes and reserves each
structure's maximum loss **before** the order is submitted.

**The claim, used verbatim everywhere:** *It never takes a position it can't cover.*

## The mechanism nobody else has

Execution runs entirely through the **Alpaca CLI** — the tool Alpaca itself
describes as "designed for AI agents, scripts, and automation pipelines". Every
order is submitted twice: once with `--dry-run`, which renders the exact request
body without sending it, then again as the identical argv for real. The proof
and the order are the same request. Remove the CLI and the product stops
existing.

Iron condors because three constraints converge: `--legs` caps at 4 and a condor
is exactly 4; only one side can ever be breached, so max loss is `width − credit`
and the structure is self-covering; and it is delta-neutral, which is the honest
posture when no edge on direction is measurable.

## Audience and scene

Hackathon judges: a brokerage Chief Brokerage Officer and two Trading API team
leads, plus two platform staff. They will read the code. They see 40–200
submissions and give each about four minutes, tired. *(assumed: the four-minute
figure is a working estimate, not published.)*

Secondary: developers evaluating whether an autonomous trading agent can be
trusted with an account.

## What the first surface must prove

That the loss is bounded and pre-funded — checkable, not asserted. A judge who
cannot verify the claim in one click assumes exaggeration.

## Constraints (verified)

- Paper trading only. `ALPACA_LIVE_TRADE` is never set.
- Competition account is fresh, started at exactly $100,000.
- ~2.6 trading sessions of P&L. Not a sample size that proves an edge, and the
  product must not claim one.
- Selling premium has negative skew: many small wins, occasional larger loss.
  Stated openly rather than hidden.
- Deadline Fri 4 Sep 2026, 15:00 UTC.

## Proof available (real, not invented)

- Live paper account `PA3PLCOVLR4I`, equity read through the CLI.
- Per-structure receipts carrying the literal command that placed each trade.
- Eight named risk gates, each able to refuse, with human-readable reasons.
- Real option chain data on the real-time OPRA feed.

## Brand commitments

- The claim sentence is fixed and appears identically on every surface.
- Never narrate or display a number that has not been measured.
- Limits are stated by us before a judge asks.
