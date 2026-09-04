# lablab submission — copy/paste

Figures below are live as of 3 Sep 21:30 WAT. Re-run `npm run snapshot` before
submitting if you want them refreshed.

---

## Project title

```
Vig — it never takes a position it can't cover
```

_46 chars. The form requires 5–50, so the name alone is rejected._

## Short description

```
An autonomous options agent on Alpaca that computes and reserves every position's maximum loss before the order is submitted. An order that would not be covered is never sent.
```

## Long description

_Form limit 2,000 characters. This is 1979._

```
Vig sells iron condors on SPY, QQQ and IWM through Alpaca's paper account. Before any order is submitted, the structure's maximum loss is computed and reserved. If the account cannot cover it, the order is never sent — uncovered exposure reads zero by construction.

THE CLI IS THE EXECUTION PATH. Every read and write goes through the Alpaca CLI, the tool Alpaca built for AI agents and automation pipelines. Each order is submitted twice: once with --dry-run, which renders the exact request without sending it, then again as the identical argv for real. The proof and the order are the same request. Across the window: 4,594 CLI invocations, 48 submissions, 24 dry-run proofs, committed under evidence/.

WHY IRON CONDORS. Alpaca's --legs accepts at most four and a condor is exactly four. Only one side can ever be breached, so maximum loss is width minus credit — the structure is self-covering. It is also delta-neutral, the honest posture when the window is too short for a directional edge to be real.

EIGHT GATES, EVERY ONE ABLE TO REFUSE: illiquid, thin-credit, position-too-large, bucket-full, book-full, no-wing, inverted, and a news-driven regime check that can only veto. Refusals are shown beside the fills, because an agent that reports only what it did is hiding half its judgement.

WHAT HAPPENED. The account finished down 13%. On 2 September at 23:48 a position list call failed and the tick substituted an empty array, which the reconciler could not tell from an account holding nothing. It marked every structure settled and reset reserved to zero — book-full then saw a full ceiling against a book already full, and the agent doubled its position count before the market rallied.

Every structure stayed inside its bounded loss and uncovered exposure never left zero; the receipts show it. The per-position guarantee held; the portfolio ceiling did not, defeated by a bug rather than a decision. The failure and the fix are both in the repository history.
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

**Step 2 uploads a FILE, not a link.** Upload **`film/vig-demo-master.mp4`** (30MB) —
not `vig-demo.mp4`. Same picture
(PSNR 47.5 dB, visually identical), but yuv420p instead of yuv444p, and the
index is at the front so it streams instead of downloading first. 4:4:3 chroma
is outside what some players and platforms handle cleanly.

**Set it to Unlisted, not Private.** Private means only accounts you invite can
watch it, and judges are not on that list — it is the most common way a
submission video ends up unviewable.

Uploaded: **https://youtu.be/VvQHkqJHcDk**

Open it in a private window while signed out — that is the only check that
proves a judge can see it.

## Slide presentation

`deck/vig-deck.pdf` — 7 slides.

## One-page write-up

`WRITEUP.md` — 809 words, structured to the three things the brief names: AI
logic, risk gates, Alpaca infrastructure implementation. Paste the text or
attach the PDF at `deck/vig-writeup.pdf`.

## Cover image

`deck/vig-cover.png` — **1920x1080, true 16:9**, which is what the form asks
for. `web/og.png` is 1200x630 (1.905:1), the Open Graph standard — right for a
link preview, wrong for this field.

---

## Before you submit

- [ ] Refresh figures: `npm run snapshot`
- [ ] One-page write-up attached — it is a required field, listed beside the
      cover image, video and slides
- [ ] Video uploaded and the link opens in a private window
- [ ] Both app URLs open on your phone, on cellular data, not wifi
- [ ] Account ID matches the account the agent actually traded
- [ ] Social posts (handled separately)
