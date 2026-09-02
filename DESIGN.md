---
name: Vig
description: A margin report for an autonomous options agent — colour derived from the collateral mechanic, every quantity in tabular mono.
colors:
  ground: "#0a0a0c"
  panel: "#101014"
  raised: "#16161b"
  hair: "#21212a"
  hair-lit: "#31313d"
  ink: "#ece9e3"
  ink-dim: "#918d85"
  ink-mute: "#5f5c56"
  reserved: "#d8b26a"
  reserved-lo: "#d8b26a14"
  credit: "#86b06b"
  credit-lo: "#86b06b14"
  breached: "#c8574a"
  working: "#6b8caf"
typography:
  display:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(52px, 8vw, 84px)"
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "-0.04em"
    fontFeature: "tabular-nums"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(32px, 4.9vw, 60px)"
    fontWeight: 600
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(21px, 2.6vw, 31px)"
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  quantity:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "-0.01em"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0.12em"
  mark:
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0.18em"
rounded:
  none: "0px"
  chip: "2px"
  full: "50%"
spacing:
  hair: "2px"
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "26px"
  gutter: "24px"
  band: "78px"
components:
  cta-primary:
    backgroundColor: "{colors.reserved}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
    padding: "11px 20px"
    typography: "{typography.body}"
  cta-primary-hover:
    backgroundColor: "#e6c489"
    textColor: "{colors.ground}"
  cta-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.none}"
    padding: "11px 20px"
  cta-ghost-hover:
    textColor: "{colors.ink}"
  panel-surface:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
  tag-covered:
    backgroundColor: "transparent"
    textColor: "{colors.reserved}"
    rounded: "{rounded.none}"
    padding: "2px 7px"
    typography: "{typography.label}"
  tag-settled:
    backgroundColor: "transparent"
    textColor: "{colors.credit}"
    rounded: "{rounded.none}"
    padding: "2px 7px"
    typography: "{typography.label}"
  meter-track:
    backgroundColor: "{colors.raised}"
    height: "6px"
    rounded: "{rounded.none}"
  meter-fill:
    backgroundColor: "{colors.reserved}"
    height: "6px"
  scrub-knob:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "19px"
  capital-chip:
    backgroundColor: "{colors.reserved}"
    textColor: "{colors.ground}"
    rounded: "{rounded.chip}"
    padding: "3px 9px"
    typography: "{typography.quantity}"
---

# Design System: Vig

## Overview

**Creative North Star: "The Margin Report"**

Vig looks like the document a risk desk prints at the close of the session, not like a
trading app. The surfaces are dark because of the scene rather than the category — this
is read on a desk beside a broker dashboard, in a room where the screen is the brightest
object — and the ink is bone (#ece9e3) rather than white, so the page reads as paper
under lamplight instead of as an LCD. Nothing is rounded, nothing is shadowed, nothing
is decorated. Structure is carried entirely by one hairline (#21212a) and by two
background steps above the ground.

The system's whole discipline is that colour is not a palette. Every accent is a
statement about capital: brass is money set aside, green is money collected, red is a
strike that broke, blue-grey is an order still working. There is no brand colour, no
gradient, and no hue that means "primary". Any surface that adopts these tokens without
the mechanic behind them is misusing them.

Density is high and deliberate. Body type sits at 13px, labels at 10–11px, and the only
type allowed to be large is a quantity: the uncovered-exposure figure on the Cover Sheet
(up to 84px) and the landing claim. Every number is IBM Plex Mono with tabular figures,
because every number on these surfaces is compared against another number and
proportional digits make columns drift.

**Key Characteristics:**
- Zero-radius rectangles, hairline rules, no shadow vocabulary except one in-flight chip
- Two accent families with fixed meanings (brass = reserved, green = collected) and one forbidden-elsewhere red
- Mono for all quantities, Archivo for all labels; never the reverse
- Motion only as consequence — nothing loops, nothing idles
- Dark ground with bone ink; browser chrome (selection, caret, scrollbar, focus ring) themed to match

## Colors

A near-black ground with three tonal surface steps, bone ink at three weights, and four
accents whose names are account states rather than hues.

### Primary
- **Reserved Brass** (`{colors.reserved}`): capital standing behind a trade. It marks the reserve meter fill, the capital-in-transit chip, the "covered" tag, refused decisions, gate names, command flags in code blocks, the landing CTA, the focus ring, text selection and the caret. It is the closest thing to a brand colour and it is still a mechanic.
- **Reserved Wash** (`{colors.reserved-lo}`): a 8%-alpha brass used only as an inline tint behind brass elements.

### Secondary
- **Collected Green** (`{colors.credit}`): premium the house was paid. It carries positive P&L values, the "settled" tag, the live-market dot, the profitable payoff curve and its corridor fill, and submitted decisions.
- **Collected Wash** (`{colors.credit-lo}`): the 3px halo behind the live dot and inline corridor tints.

### Tertiary
- **Breached Red** (`{colors.breached}`): one meaning only — a strike that has been breached, or a loss actually realised. It recolours the position card border, its payoff curve, spot line and dot, the scrub knob in breach, and the offline status dot.
- **Working Blue-Grey** (`{colors.working}`): an order that is live but not yet filled. It appears on `would-submit` decision verbs and nowhere else.

### Neutral
- **Ground** (`{colors.ground}`): page background, and the text colour that sits *on* brass (CTA label, capital chip, selected text).
- **Panel** (`{colors.panel}`): every card, cover sheet, decision list and empty state; also the alternating landing band.
- **Raised** (`{colors.raised}`): the meter track — the only third-step surface in the build.
- **Hairline** (`{colors.hair}`): all structural borders and dividers, at 1px.
- **Lit Hairline** (`{colors.hair-lit}`): borders that need to be seen — neutral tag outlines, the zero line on the payoff curve, breakeven marks, scrollbar thumb.
- **Bone Ink** (`{colors.ink}`): primary text and the large figures.
- **Dim Ink** (`{colors.ink-dim}`): running prose, reasons, secondary values.
- **Mute Ink** (`{colors.ink-mute}`): labels, units, timestamps, footers.

### Named Rules

**The Mechanic Rule.** Colour is derived from the product mechanic, never chosen as a palette. Before introducing any colour, name the account state it reports. If there is no state, use ink.

**The Red Is Breach Rule.** Red means a breached strike or a realised loss, and it is permitted nowhere else. It is never an error colour for form validation, never a destructive-button colour, never a chart series. A red pixel on a Vig surface is a claim about money.

**The Brass-On-Ground Rule.** Brass is a background only when the foreground is ground (#0a0a0c) — CTA, capital chip, selection. Brass text sits on panel or ground, never on brass.

## Typography

**Display / Quantity Font:** IBM Plex Mono (with ui-monospace, SFMono-Regular, Menlo)
**Body / Label Font:** Archivo (with ui-sans-serif, system-ui, -apple-system)

**Character:** Plex Mono was drawn for institutional systems, so it reads as
infrastructure rather than as a code editor; Archivo is a grotesque with enough
character to keep the page off-template and tight enough to stay out of the way. The
pairing is a printed report, not a dashboard.

### Hierarchy
- **Display** (mono, 500, `clamp(52px, 8vw, 84px)`, 0.92, -0.04em): reserved for the single uncovered-exposure figure on the Cover Sheet. Its currency glyph is set at 0.38em in mute ink, raised 0.62em.
- **Headline** (Archivo, 600, `clamp(32px, 4.9vw, 60px)`, 1.03, -0.035em): the landing claim only. Capped at 15ch with `text-wrap: balance`.
- **Title** (Archivo, 600, `clamp(21px, 2.6vw, 31px)`, 1.14, -0.02em): landing band headings, capped at 22ch.
- **Body** (Archivo, 400, 13px/1.45; 14px at 1.65 in landing bands): prose, capped at 68ch on landing and 46ch in the Cover Sheet hero note.
- **Quantity** (mono, 400–500, 14–16px, -0.01em, tabular): every figure in the ledger, position card, decisions list and tape.
- **Label** (Archivo, 400, 9.5–11px, 0.08–0.16em, uppercase): every key, unit, section heading and tag. Section headings on the Cover Sheet are 11px/0.16em uppercase in mute ink.
- **Mark** (Archivo, 700, 20px on app / 15px on landing, 0.18–0.2em, uppercase): the wordmark, the only place tracking goes this wide.

### Named Rules

**The Tabular Rule.** Every quantity carries `.n` — IBM Plex Mono with `font-variant-numeric: tabular-nums`. `tabular-nums` is also set on `body` as a floor. Figures in adjacent rows must share an advance width; a proportional digit in a blotter is a bug.

**The Two-Job Rule.** Mono is for quantities, Archivo is for language. A label never uses mono (the meter legend explicitly resets `.n` back to Archivo when its digits are prose, not a column), and a quantity never uses Archivo.

**The Size-Is-Importance Rule.** Type scale is a claim about what matters. Only one figure per surface earns display size, and on the Cover Sheet that figure is uncovered exposure — the number the product exists to show. It never moves and never shrinks at mobile.

## Layout

A single centred measure of **1180px** with **24px** gutters governs the landing page:
tape, hero copy, scrub, every band and the footer share that spine, including the narrow
reading band, which caps children at 68ch while keeping the same left edge rather than
centring a narrower column.

The Cover Sheet is a stack of full-width blocks: a masthead with a right-aligned meta
cluster, a hairline rule, then the two-column cover sheet at
`minmax(0,1.15fr) / minmax(0,1fr)` split by a single vertical hairline, then sections at
34px intervals. Section headings carry their own trailing rule via `h2::after` (a
flex-filling 1px border offset -3px), so no divider element is needed.

Vertical rhythm on the landing page is a 78px band with a 1px top hairline (54px below
820px). Internal spacing runs on a coarse 2 / 6 / 10 / 14 / 18 / 26px set; component
padding clusters at 11–13px vertical, 16–28px horizontal.

**Breakpoints as built:** 820px and 560px on the landing page, 860px on the Cover Sheet.

- **≤820px (landing):** the hero releases its `100svh` lock and scrolls (locking it clipped the claim at phone width); the curve becomes `clamp(190px, 34svh, 300px)`; two-column blocks collapse to one; the gate list drops from `190px / 1fr` to a stacked pair; the tape drops its `.secondary` items.
- **≤560px (landing):** the tape keeps one labelled figure and the wordmark shrinks to 13px; `.compact-hide` items and the live-status word are removed. Three unlabelled figures were judged less useful than one labelled one.
- **≤860px (Cover Sheet):** the cover sheet stacks and its left border becomes a top border; the meta cluster goes full width; the position number cluster wraps instead of shrinking its type; the decisions grid becomes `1fr auto` with the reason on its own full-width row.

### Named Rules

**The One Spine Rule.** Every landing block shares the 1180px/24px measure. Narrow reading columns are achieved by capping children (`max-width: 68ch`), never by centring a smaller container — a shifted left edge reads as a different page.

**The Figure Survives Rule.** Responsive behaviour removes labels and secondary items before it shrinks a number. The uncovered-exposure figure and the reserve state keep their size at every width.

## Elevation & Depth

There is no shadow vocabulary. Depth is tonal and linear: ground (#0a0a0c) → panel
(#101014) → raised (#16161b), separated by 1px hairlines. Cards do not lift, do not glow
at rest, and do not use backdrop blur — with one exception, the fixed landing tape, which
sits on `color-mix(in oklab, var(--ground) 88%, transparent)` with `blur(8px)` because
content scrolls under it.

Two shadows exist in the build and both are attached to a moving object rather than to a
surface: the scrub knob (`0 2px 10px rgba(0,0,0,.55)`), which must read as a physical
grabbable thing above the rail, and the capital chip in flight
(`0 6px 22px rgba(216,178,106,.28)`), which exists for about a second. The live-market
dot's `0 0 0 3px` ring is a halo, not elevation.

### Named Rules

**The Flat Report Rule.** Surfaces are flat. If a new element needs separation, use a hairline or the next tonal step — never a shadow. A shadow is permitted only on something that is literally in motion or literally grabbable.

## Shapes

Rectangles with square corners. `border-radius` appears in exactly three places in the
build: the capital chip (2px, so it reads as a token rather than a panel), status dots
(50%), and the scrub knob (50%) — round because it is a physical control. Everything
else — cards, tags, buttons, meters, code blocks, empty states — is a hard rectangle at
0px.

Borders are always 1px and always a hairline token. Tags and verdict chips are outlined,
never filled; the outline takes the state colour and the text matches it. The only filled
elements in the system are the brass CTA, the brass meter fill, the brass capital chip
and the green corridor wash.

### Named Rules

**The No-Radius Rule.** Radius is 0 unless the element is circular by function (a dot, a knob) or is in flight (the 2px chip). There is no "rounded card" in this system.

**The Outline-State Rule.** A state is shown by recolouring a 1px outline and its label together, never by filling a pill with a background.

## Components

### Buttons
- **Shape:** hard rectangle (0px), 1px border matching the fill.
- **Primary (CTA):** brass background, ground text, 600 weight, 12.5px, `11px 20px`. Hover lifts to `#e6c489` and `translateY(-1px)`; active returns to `translateY(0)` so the press reads as landing. Transitions are 0.18s ease and are removed under `prefers-reduced-motion`.
- **Ghost:** transparent, dim ink, lit-hairline border. Hover raises text to full ink and border to mute ink; no background ever appears.
- **Focus:** the global ring — `1px solid var(--reserved)` at `3px` offset, on `:focus-visible` only.

### Cards / Containers
- **Corner Style:** 0px.
- **Background:** panel on ground; settled position cards drop to transparent with reduced padding (11px vs 16px) so history recedes without leaving the list.
- **Border:** 1px hairline; recoloured to breached red when the card's structure is breached, over a 0.45s ease.
- **Internal Padding:** `16px 18px` (position card), `26px 28px` (Cover Sheet hero), `22px 26px` (ledger).

### Tags
- **Style:** uppercase 10px label, 0.1em tracking, `2px 7px`, 1px outline, no fill.
- **States:** neutral (lit hairline + dim ink), `covered` (brass), `settled` (green).

### Navigation
There is no nav bar. The landing tape is the only persistent chrome: fixed to the top,
11px, 22px gaps, blurred ground at 88%, hairline bottom border, wordmark left, live
status pushed right with `margin-left: auto`. The Cover Sheet masthead is its
counterpart: wordmark, fixed claim sentence, then a right-aligned meta cluster.

### Reserve Meter
A 6px raised track with a hairline border and a brass fill. The fill is a full-width
element driven by `transform: scaleX()` from `transform-origin: left center` over 0.5s
`cubic-bezier(.22,.61,.36,1)` — scaled, not resized, because animating width relayouts
every frame. At zero the fill switches to lit hairline via `data-empty="true"` so an
empty meter reads as an empty meter rather than as a missing element. A legend sits 7px
below in 10.5px mute ink, ceiling on the left, percent used on the right, and it
explicitly resets to Archivo because those digits are prose.

### Position Card
Symbol (mono 14px), expiry (mono 11px mute), state tag, then a right-pushed number
cluster (`margin-left: auto`, 22px gaps) of stacked label-over-value pairs. Below it the
payoff diagram, the axis, the floors row, then the folded receipt. Breach is a single
class on the card that swaps six things at once — border, curve stroke, corridor fill,
spot line, spot dot, and the capital figure — over a shared 0.45s transition.

### Payoff Diagram
A 76px-tall full-width SVG with `overflow: visible`. Green curve, a `#86b06b1c` corridor
wash marking where the structure pays, lit-hairline breakevens, a bone spot line and a
green spot dot. The tone is set once in CSS and swapped by the card's class, never
rebuilt per frame. The axis beneath is absolutely positioned mono 10px labels, with the
first left-aligned, the last right-aligned, the rest centred on their value, and `now`
raised to full ink.

### Hero Payoff Curve (landing)
The page's subject: a full-bleed SVG taking the lower band of a `100svh` hero
(`auto` below 820px). Green 2px line with `vector-effect: non-scaling-stroke`, a dashed
lit-hairline zero line (`3 4`), and the loss floors drawn heavier at 3px in brass at 0.85
opacity — the floors are the argument, so they outweigh the ramps. In breach the line and
the marker dot turn red.

### Scrub Control
The governing interaction on the landing page, and the only place a Vig surface responds
to something the visitor did rather than something the account did. A 34px rail with a
top hairline that is shared with the curve above it — same price axis, same edge — a
green corridor bar at 0.55 opacity marking the profitable range, and a 19px bone knob
with a `-9.5px` margin offset. The knob carries a 44px `::after` touch target so the
visual control can stay small without being impossible to grab with a thumb; it scales
to 1.14 on hover and 1.06 on active, with `cursor: ew-resize` on the rail and
`grab`/`grabbing` on the knob, and `touch-action: none` on both. Keyboard operation is
supported and shows the standard brass focus ring. The knob turns red when the scrubbed
price breaches. The hint below fades to `opacity: 0` once the control has been used.

### Receipt Disclosure
Folded by default: it is proof, not furniture. A hairline-topped, full-width borderless
toggle in 10.5px uppercase mute ink with a 9px chevron and the client order ID pushed
right in mono. Hover raises to dim ink; focus shows the brass ring. Open, it reveals key
lines (mono values in dim ink, brass `code`) and the literal command in a ground-filled,
hairline-bordered mono block at 11px/1.6 with `white-space: pre` and horizontal scroll.

### Decisions List
A panel-backed list of hairline-separated rows on a `108px / 92px / 1fr` grid: bucket
(mono), verb (10px uppercase, state-coloured), reason (dim ink). The verb colour is the
entire semantic payload — `submitted` green, `refused` brass, `would-submit` blue-grey,
`unpriceable` and `held` mute. Refusals sit in the same list as fills at the same weight.

### Gate List (landing)
One rule per row on a `190px / 1fr` grid with hairline separators: the gate name in brass
mono 12.5px, the reason in dim ink 13px. Not feature cards — a list of refusals.

### Regime Bar
A single hairline-bordered panel row: an outlined uppercase verdict chip, the reason in
dim ink, and the provenance pushed right in 10.5px mute ink. In `stand aside` the panel
border and the chip both turn brass. Provenance is always displayed, because a verdict
that came from a failed call must never be able to look like a verdict that came from a
model.

### Empty States
Designed, not blank: a panel with a hairline border and `18px 20px` padding holding a
dim-ink bold statement and a mute-ink explanation on the same baseline row, wrapping. The
market is shut most of the time these surfaces are read, so "nothing yet" carries the
reason and the next open time rather than a placeholder.

### Named Rules

**The Caused-Motion Rule.** Every animation is caused by something that actually happened in the account. Nothing loops, nothing idles, nothing animates to fill silence. Numbers tween with expo-out over 850ms; capital travels on a lifted arc from equity into the reserve meter over 1100ms and the meter brightens on impact; payoff paths draw stroke-first over 900ms; cards enter staggered at 70ms per index. Every one of these is behind `prefers-reduced-motion`.

**The Empty Is Designed Rule.** No component ships without a zero state that says why it is empty. An empty meter changes colour; an empty list states the market's status.

## Do's and Don'ts

### Do:
- **Do** name the account state before choosing a colour. Brass = reserved, green = collected, red = breached, blue-grey = working.
- **Do** set every quantity in IBM Plex Mono with `tabular-nums` via `.n`.
- **Do** keep radius at 0 for everything that is not a dot, a knob, or the in-flight capital chip (2px).
- **Do** separate surfaces with a 1px hairline (#21212a) or the next tonal step, in that order.
- **Do** show state by recolouring a 1px outline and its label together.
- **Do** animate a value only when the account changed it, and always with a `prefers-reduced-motion` escape.
- **Do** give small controls an invisible 44px touch target rather than growing the visual control.
- **Do** hold the 1180px / 24px spine; narrow a column by capping children at a ch measure, not by re-centring.
- **Do** theme the browser's own surfaces — selection, caret, scrollbar, focus ring — with system tokens.
- **Do** design the empty state with its reason; the market is closed most of the time.

### Don't:
- **Don't** use red for anything but a breached strike or a realised loss. It is not an error colour, not a destructive-action colour, not a chart series.
- **Don't** introduce a colour that has no mechanic behind it, including a "brand" hue or any gradient.
- **Don't** add a shadow to a surface. Shadows belong only to something in motion or something grabbable.
- **Don't** loop, idle, or pulse an animation on a timer. If the account did nothing, the page is still.
- **Don't** set a label in mono or a quantity in Archivo.
- **Don't** shrink a figure to fit a small screen; drop labels and secondary items first.
- **Don't** fill a tag or chip with a background colour; outline it.
- **Don't** use pure white — ink is bone (#ece9e3).
- **Don't** turn refusals into a lesser visual class than fills; they share the list, the grid and the weight.

## Permanent deviations from the direction contract

Recorded at finish review, deliberate and not to be "corrected" later.

**The claim does not sit over the corridor.** FIRST VIEWPORT placed it there. At
desktop width the plateau lands exactly where the headline sits and the marker
line cuts through the type, so the curve takes the lower half instead. The curve
is still the largest object on the page and still the argument; only the overlay
was abandoned.

**The primary action is not at the right end of the corridor.** It sits at far
left beneath the claim, in the natural reading order after the lede. The
contract's placement was tried and lost to the same collision. The upper-right
quadrant it would have occupied carries the live account figures instead.

**Brass owns the field beneath the floors, not a panel.** The first attempt at
region-scale brass was a bordered figure block, which is the hero-metric template
the craft floor refuses by name and which restated the Cover Sheet's own figure.
The field under the payoff floors is the honest region: everything below that
line is loss that cannot happen, because the capital for it is already reserved.
