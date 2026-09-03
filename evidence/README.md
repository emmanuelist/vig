# Evidence

The competition window, as the account recorded it.

| File | What it is |
|---|---|
| `orders.jsonl` | Every order submission, with the exact argv and the response. Each structure appears twice: once as `--dry-run`, which renders the request without sending it, and once as the identical command sent for real. |
| `ledger.json` | Every structure Vig opened — four legs, the credit priced against us, and the maximum loss reserved before the order existed. |
| `summary.json` | Totals at the close of the window. |

## What to check

**Uncovered exposure is zero, and always was.** For every structure, `maxLossTotal`
is computed and reserved before the submission is made. `orders.jsonl` shows the
dry run preceding the live send of the same argv, so the reserve provably exists
before the order does.

**The account lost 13.9%,** and the drawdown is the reason this directory is
worth reading rather than a reason to avoid it. On 2 September at 23:48 a failed
`position list` call caused the ledger to mark every open structure settled; the
risk ceiling then read zero reserved and the agent doubled its own book. The
market rallied through the short calls and the doubled book took double the loss.

What the receipts show is that no individual position ever exceeded its own
bounded loss. The long wings paid for exactly what they were bought for. The
per-position guarantee held; the portfolio ceiling did not, and the root cause
is in the repository's history along with the fix.
