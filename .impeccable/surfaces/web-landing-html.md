---
version: 1
slug: "web-landing-html"
primary_target: "web/landing.html"
related_targets: ["web/index.html"]
---

## Scope

Landing surface at `/` for Vig. Visitor mode: **Persuade**. The live Cover Sheet
moves to `/app` and keeps its established world unchanged.

## Audience and job

Hackathon judges — a brokerage COO and two Trading API leads — giving the entry
roughly four minutes, tired, after many submissions. They must believe one
falsifiable thing (loss is bounded and reserved before the order exists) and
then act: open the live sheet, or open the repo.

## Direction contract

THESIS: An iron condor's payoff curve is the claim — the flat floors are the
bounded loss — so the curve is the page, at page scale, and the visitor moves
price along it themselves. Refuses the SaaS landing arrangement of centered
headline, three feature cards, logo strip.

OWN-WORLD: Inherited from the Cover Sheet. Near-black ground `#0a0a0c`, bone ink
`#ece9e3`, brass `#d8b26a` for reserved capital, green `#86b06b` for premium
collected, red `#c8574a` reserved solely for a breached strike. IBM Plex Mono
carries every quantity; Archivo carries labels. Hairline rules, no shadows, no
rounded cards.

STORY: Understands that an autonomous agent can bound its own downside; believes
it because the floor is visible and the command that placed the trade is
readable; opens the live account.

FIRST VIEWPORT: Full-bleed payoff curve, price axis spanning the viewport, the
two flat floors landing in the lower third. Claim sentence set over the corridor.
Live account figures (equity, reserved, uncovered $0) as a hairline strip along
the top. Primary action "Open the live sheet" sits at the right end of the
corridor where the curve turns down.

FORM: Payoff-diagram-as-page; index 4 of my ordered list; seed key cab86dc3.

RAISE (cape): one governing control — the visitor drags price across the curve
and watches the loss stop deepening at the floor. Discovery, not assertion.
RAISE (provenance ribbon): measured and unmeasured are typographically distinct;
nothing unverified is set as if it were fact.
RAISE (labanotation): every visual property encodes exactly one real quantity —
height is P&L, width is price, fill is state. No decorative variance.
RAISE (ticket wallet): brass commits at region scale, not as an accent.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.

## Unresolved

Deployed URL not yet provisioned; the primary action points at `/app` locally.

## Finish

FINISH discharged: finish review run twice on captured evidence (recapture round,
then fix round), all eight material fixes plus three documenter defects applied
and confirmed, DESIGN.md written from the shipped artifact, deviations recorded
there. Detector clean apart from the em-dash advisory, upheld as a false positive
(em-dash as null-value placeholder in empty data slots).

Evidence packet in .impeccable/review/ was captured before the final type-ramp
consolidation (28 one-off font sizes collapsed onto a six-step ramp, plus
--reserved-lit tokenised). That change altered two values by 1-2px and no
composition; the packet is otherwise current.
