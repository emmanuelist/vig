# lablab submission — copy/paste

Figures below are live as of 3 Sep 21:30 WAT. Re-run `npm run snapshot` before
submitting if you want them refreshed.

---

## Project title

```
Vig
```

## Short description

```
An autonomous options agent on Alpaca that computes and reserves every position's maximum loss before the order is submitted. An order that would not be covered is never sent.
```

## Long description

```
Vig sells iron condors on SPY, QQQ and IWM through Alpaca's paper trading
account. Before any order is submitted, the structure's maximum loss is
computed and reserved. If the account cannot cover that loss, the order is
never sent — uncovered exposure reads zero, by construction.

THE CLI IS THE EXECUTION PATH

Every read and every write goes through the Alpaca CLI, the tool Alpaca
describes as designed for AI agents and automation pipelines. Each order is
submitted twice: once with --dry-run, which renders the exact request body
without sending it, then again as the identical argv for real. The proof and
the order are the same request. Across the competition window that is 4,594 CLI
invocations, 48 order submissions, and 24 dry-run proofs — one for every
structure, all committed under evidence/.

WHY IRON CONDORS

Three constraints converge on the same instrument. Alpaca's --legs flag accepts
at most four, and a condor is exactly four. Only one side can ever be breached,
so maximum loss is width minus credit and the structure is self-covering. And
it is delta-neutral, which is the honest posture when 2.6 trading sessions
prove nothing about direction.

Credit is priced against us — sell at the bid, buy at the ask — so the reserve
is what we would collect if every fill went the wrong way.

EIGHT GATES, EVERY ONE ABLE TO REFUSE

illiquid, thin-credit, position-too-large, bucket-full, book-full, no-wing,
inverted, and a news-driven regime check that can only ever veto. The
refusals are shown beside the fills, because an agent that reports only what it
did is hiding half its judgement.

WHAT HAPPENED, AND WHY IT IS IN THE README

The account finished the window down 13.0%. On 2 September at 23:48 a single
`position list` call failed to reach the API. The tick substituted an empty
array, which the reconciler cannot distinguish from an account holding nothing.
It marked every open structure settled and reset reserved to zero — after which
the book-full gate saw a full ceiling of headroom against a book that was
already full, and the agent doubled its own position count. The market then
rallied through the short calls.

Every individual structure stayed inside its own bounded loss. The long wings
paid for exactly what they were bought for, and uncovered exposure never left
zero — the receipts show it. The per-position guarantee held. The portfolio
ceiling did not, and it was defeated by a bug rather than overridden by a
decision. Both the failure and the two-guard fix are in the repository history.

We are submitting that rather than hiding it, because the claim this project
makes is that its numbers are checkable, and a drawdown is the most checkable
thing in it.
```

## Technology tags

```
Alpaca Trading API, Alpaca CLI, Options Trading, Autonomous Agents, TypeScript, Node.js
```

## Category tags

```
Trading Agent, Risk Management, FinTech, Automation
```

## Application URL

```
https://emmanuelist.github.io/vig/
```

Cover Sheet: `https://emmanuelist.github.io/vig/app.html`
Mirror: `https://vig-six.vercel.app`

## GitHub repository

```
https://github.com/emmanuelist/vig
```

## Alpaca paper trading account ID

```
PA3PLCOVLR4I
```

UUID, if the form wants that form instead:

```
687ede83-6811-4d04-9644-e71debbec71e
```

## Video presentation

`film/vig-demo.mp4` — 2m22s. Upload to YouTube unlisted, paste the link.

## Slide presentation

`deck/vig-deck.pdf` — 7 slides.

## Cover image

`web/og.png` — 1200x630.

---

## Before you submit

- [ ] Refresh figures: `npm run snapshot`
- [ ] Video uploaded and the link opens in a private window
- [ ] Both app URLs open on your phone, on cellular data, not wifi
- [ ] Account ID matches the account the agent actually traded
- [ ] Social posts (handled separately)
