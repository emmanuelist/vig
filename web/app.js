/* The Cover Sheet.
 *
 * This file renders state and computes nothing. Every figure shown was written
 * by the agent, which read it from the account through the Alpaca CLI.
 *
 * The rendering is DIFFED rather than replaced. That is not an optimisation —
 * it is what makes the motion mean anything. A card that survives between ticks
 * can animate a value changing; a card rebuilt from innerHTML every tick can
 * only ever snap. So structures persist, numbers tween toward their new values,
 * and the only things that animate in or out are the ones that genuinely
 * arrived or settled.
 */

import { REDUCED, tweenNumber, transferCapital, drawPath, enter, exit, pulse } from "./motion.js";

const $ = (id) => document.getElementById(id);

const usd = (v, dp = 0) =>
  Number(v ?? 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
const money = (dp = 0) => (v) => "$" + usd(v, dp);
const plain = (dp = 0) => (v) => usd(v, dp);
const signedFmt = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + "$" + usd(Math.abs(v));

const clock = (iso) => {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour12: false }); }
  catch { return "—"; }
};

function panel(fn) {
  try { fn(); } catch (e) { console.error("panel failed:", e); }
}

/* ── payoff geometry ──────────────────────────────────────────────────
   Shared by build and update so the drawn curve and the moving spot marker
   can never disagree about where a price sits.
   ------------------------------------------------------------------- */
const VB = { W: 600, H: 116, PAD: 10 };

function geom(p) {
  const { longPut, shortPut, shortCall, longCall } = p.strikes;
  const pad = (longCall - longPut) * 0.14;
  const lo = longPut - pad, hi = longCall + pad;
  const x = (v) => ((v - lo) / (hi - lo)) * VB.W;
  const zeroY = VB.PAD + (VB.H - 2 * VB.PAD) * 0.3;
  return {
    x, lo, hi, zeroY,
    yUp: zeroY - (VB.H - 2 * VB.PAD) * 0.24,
    yDn: zeroY + (VB.H - 2 * VB.PAD) * 0.62,
  };
}

function payoffMarkup(p) {
  const g = geom(p);
  const k = p.strikes;
  const pts = [
    [0, g.yDn], [g.x(k.longPut), g.yDn], [g.x(k.shortPut), g.yUp],
    [g.x(k.shortCall), g.yUp], [g.x(k.longCall), g.yDn], [VB.W, g.yDn],
  ].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");

  return `
  <div class="payoff">
    <svg viewBox="0 0 ${VB.W} ${VB.H}" preserveAspectRatio="none" aria-hidden="true">
      <rect class="corridor" x="${g.x(k.shortPut).toFixed(1)}" y="${VB.PAD - 4}"
            width="${(g.x(k.shortCall) - g.x(k.shortPut)).toFixed(1)}"
            height="${VB.H - 2 * VB.PAD + 6}"/>
      <line class="be" x1="0" y1="${g.zeroY}" x2="${VB.W}" y2="${g.zeroY}"
            stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>
      <polyline class="curve" points="${pts}" fill="none" stroke-width="1.5"
                vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <line class="spotline" x1="0" y1="${VB.PAD - 4}" x2="0" y2="${VB.H - VB.PAD + 2}"
            stroke-width="1" vector-effect="non-scaling-stroke"/>
      <circle class="spotdot" cx="0" cy="${g.yUp}" r="3"/>
    </svg>
    <div class="axis">
      <span style="left:0">${usd(k.longPut, 0)}</span>
      <span style="left:${((g.x(k.shortPut) / VB.W) * 100).toFixed(2)}%">${usd(k.shortPut, 0)}</span>
      <span class="now">—</span>
      <span style="left:${((g.x(k.shortCall) / VB.W) * 100).toFixed(2)}%">${usd(k.shortCall, 0)}</span>
      <span style="left:100%">${usd(k.longCall, 0)}</span>
    </div>
    <div class="floors">
      <span class="win">keeps <b>$${usd(p.creditTotal)}</b> between ${usd(k.shortPut, 0)} and ${usd(k.shortCall, 0)}</span>
      <span class="cap">loss cannot exceed <b>$${usd(p.maxLossTotal)}</b> — already reserved</span>
    </div>
  </div>`;
}

/** Move the spot marker to where price actually is. The only thing that moves
 *  on an open structure between ticks, so it carries all the tension. */
function updateSpot(card, p, spot) {
  const svg = card.querySelector(".payoff svg");
  if (!svg || spot == null) return;
  const g = geom(p);
  const k = p.strikes;
  const breached = spot < k.shortPut || spot > k.shortCall;
  const px = Math.max(0, Math.min(VB.W, g.x(spot)));

  card.classList.toggle("breach", breached);

  const line = svg.querySelector(".spotline");
  const dot = svg.querySelector(".spotdot");
  const label = card.querySelector(".axis .now");

  const move = (el, attrs) => {
    for (const [a, v] of Object.entries(attrs)) {
      if (REDUCED) { el.setAttribute(a, v); continue; }
      const from = el.getAttribute(a);
      el.setAttribute(a, v);
      if (from !== null && from !== String(v)) {
        el.animate([{ [a]: from }, { [a]: v }], { duration: 700, easing: "cubic-bezier(.22,.61,.36,1)" });
      }
    }
  };
  move(line, { x1: px.toFixed(1), x2: px.toFixed(1) });
  move(dot, { cx: px.toFixed(1), cy: (breached ? g.yDn : g.yUp).toFixed(1) });

  if (label) {
    label.style.left = `${((px / VB.W) * 100).toFixed(2)}%`;
    label.textContent = usd(spot, 2);
  }
}

/* The receipt.
 *
 * `--dry-run` renders the exact request without sending it; the identical argv
 * then goes out for real. Showing both is the only way the claim "covered
 * before the order existed" can be checked rather than believed, so it lives
 * one click from the structure it belongs to instead of in a log file.
 *
 * No credentials appear here — they travel by environment, never argv.
 */
function receiptMarkup(p) {
  const argv = p.proof.argv || [];
  /* Break the command one flag per line, and the legs array one leg per line.
     JSON whitespace is insignificant, so this is still the literal request that
     was sent — just readable, and it shows all four legs at once, which is the
     condor itself. */
  const parts = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--legs") {
      let legs = argv[++i];
      try {
        legs = "[\n" + JSON.parse(legs).map((l) => "      " + JSON.stringify(l)).join(",\n") + "\n    ]";
      } catch { /* leave it raw rather than lose it */ }
      parts.push(`  --legs ${legs}`);
    } else if (a.startsWith("--")) {
      const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? " " + argv[++i] : "";
      parts.push(`  ${a}${v}`);
    } else {
      parts.push(parts.length ? `  ${a}` : a);
    }
  }
  const wrapped = parts.join("\n").replace(/^alpaca\n  order\n  submit/, "alpaca order submit");
  return `
  <div class="receipt">
    <button class="receipt-toggle" type="button" aria-expanded="false">
      <span class="chev">▸</span> receipt
      <span class="coid">${p.clientOrderId ?? ""}</span>
    </button>
    <div class="receipt-body" hidden>
      <div class="rk">the request, rendered by <code>--dry-run</code> and then sent unchanged</div>
      <pre class="rcmd">${wrapped.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]))}</pre>
      ${p.orderId ? `<div class="rk">broker order id <b>${p.orderId}</b></div>` : ""}
    </div>
  </div>`;
}

function positionCard(p, settled) {
  const k = p.strikes;
  const el = document.createElement("article");
  el.className = "pos";
  el.dataset.id = p.id;
  el.innerHTML = `
    <div class="pos-head">
      <span class="sym">${p.underlying}</span>
      <span class="exp">${p.expiry}</span>
      <span class="tag ${settled ? "settled" : "covered"}">${settled ? "settled" : "covered"}</span>
      <div class="pos-nums">
        <span><span class="k">qty</span><span class="v n">${p.qty}</span></span>
        <span><span class="k">credit</span><span class="v n credit">$${usd(p.creditTotal)}</span></span>
        <span><span class="k">${settled ? "kept" : "reserved"}</span><span class="v n ${settled ? "credit" : "res"}">$${usd(settled ? (p.realizedPnl ?? p.creditTotal) : p.maxLossTotal)}</span></span>
      </div>
    </div>
    ${settled ? "" : payoffMarkup(p)}
    ${p.proof ? receiptMarkup(p) : ""}
    ${settled ? `<div class="strikes">
      <div><span class="k">structure</span>${usd(k.longPut, 0)} / ${usd(k.shortPut, 0)} &nbsp;—&nbsp; ${usd(k.shortCall, 0)} / ${usd(k.longCall, 0)}</div>
      <div><span class="k">breakevens</span>${usd(p.breakevenLow, 2)} – ${usd(p.breakevenHigh, 2)}</div>
    </div>` : ""}`;
  const toggle = el.querySelector(".receipt-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const body = el.querySelector(".receipt-body");
      const open = !body.hidden;
      body.hidden = open;
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.querySelector(".chev").textContent = open ? "▸" : "▾";
      if (!open && !REDUCED) {
        body.animate(
          [{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }],
          { duration: 260, easing: "cubic-bezier(.22,.61,.36,1)" });
      }
    });
  }
  return el;
}

/* ── diffed lists ─────────────────────────────────────────────────── */
function reconcile(container, items, spots, settled) {
  const seen = new Set();
  let added = 0;

  items.forEach((p) => {
    seen.add(p.id);
    let card = container.querySelector(`[data-id="${CSS.escape(p.id)}"]`);

    if (!card) {
      card = positionCard(p, settled);
      container.appendChild(card);
      enter(card, added++);
      /* The curve draws itself as the structure opens — the shape being built
         is the loss being bounded. */
      drawPath(card.querySelector(".curve"), 900, 180 + added * 70);
    }
    if (!settled) updateSpot(card, p, spots[p.underlying]);
  });

  [...container.children].forEach((c) => { if (!seen.has(c.dataset.id)) exit(c); });
}

const VERB = {
  submitted: "submitted", "would-submit": "would submit", refused: "refused",
  unpriceable: "no structure", held: "held back",
};

let prev = null;

function render(s) {
  panel(() => {
    const open = Boolean(s.marketOpen);
    const snapshot = s.live === false;
    $("dot").className = "dot" + (snapshot ? " snap" : open ? " live" : "");
    $("market").textContent = snapshot
      ? "snapshot · " + clock(s.capturedAt ?? s.at)
      : open ? "market open"
      : s.nextOpen ? "closed · opens " + clock(s.nextOpen) : "closed";
    $("account").textContent = s.accountNumber ?? "—";
    tweenNumber($("equity"), Number(s.equity ?? 0), money(0));

    const pnl = Number(s.pnl ?? 0);
    const el = $("pnl");
    tweenNumber(el, pnl, signedFmt);
    el.style.color = pnl > 0 ? "var(--credit)" : pnl < 0 ? "var(--breached)" : "var(--ink-dim)";
  });

  panel(() => {
    const positions = s.positions ?? [];
    const credit = positions.reduce((t, p) => t + Number(p.creditTotal || 0), 0)
      + (s.settled ?? []).reduce((t, p) => t + Number(p.realizedPnl ?? p.creditTotal ?? 0), 0);
    const reserved = Number(s.reserved ?? 0);
    const worst = positions.reduce((t, p) => t + Number(p.maxLossTotal || 0), 0);

    tweenNumber($("uncovered"), Number(s.uncovered ?? 0), plain(0));
    tweenNumber($("credit"), credit, money(0));
    tweenNumber($("reserved"), reserved, money(0));
    tweenNumber($("hero-open"), positions.length, plain(0));
    tweenNumber($("hero-worst"), worst, money(0));
    tweenNumber($("hero-res"), reserved, money(0));
    tweenNumber($("open-count"), positions.length, plain(0));

    $("ceiling").textContent = "$" + usd(s.riskCeiling);
    const pct = s.riskCeiling ? (reserved / s.riskCeiling) * 100 : 0;
    const fill = $("meter-fill");
    fill.style.transform = `scaleX(${(Math.min(100, pct) / 100).toFixed(4)})`;
    fill.dataset.empty = String(pct <= 0);
    /* Over the ceiling is a real state, not a rendering error: positions
       already open are never closed early to get back under, because closing
       realises a loss the structure has already capped and paid for. The bar
       says so rather than sitting quietly at 100%. */
    fill.dataset.over = String(pct > 100);
    $("ceiling-pct").classList.toggle("over", pct > 100);
    tweenNumber($("ceiling-pct"), pct, (v) => v.toFixed(1) + "% used");

    /* THE MOMENT. Capital that was available a tick ago is now standing behind
       a structure. Show it travelling, because "reserved before the order
       exists" is the entire claim and a number quietly changing does not say it. */
    const before = Number(prev?.reserved ?? 0);
    if (prev && reserved > before) {
      transferCapital($("equity"), $("meter-fill"), "−$" + usd(reserved - before));
      pulse($("cover"), "var(--reserved)");
    }
  });

  panel(() => {
    const positions = s.positions ?? [];
    const spots = s.spots ?? {};
    $("pos-count").textContent = positions.length ? `(${positions.length})` : "";
    $("pos-empty").hidden = positions.length > 0;
    if (!positions.length) {
      $("pos-empty").innerHTML = `<b>No structures open.</b>
        <span>${s.marketOpen
          ? "The agent is scanning; nothing has cleared the risk gates yet."
          : `Market closed — next open ${clock(s.nextOpen)}. Decisions below are live, priced against real quotes.`}</span>`;
    }
    reconcile($("positions"), positions, spots, false);
  });

  panel(() => {
    const settled = s.settled ?? [];
    $("settled-section").hidden = settled.length === 0;
    $("settled-count").textContent = settled.length ? `(${settled.length})` : "";
    reconcile($("settled"), settled, {}, true);
  });

  panel(() => {
    const decisions = s.decisions ?? [];
    $("dec-count").textContent = decisions.length ? `(${decisions.length})` : "";
    const host = $("decisions");
    host.innerHTML = decisions.length
      ? decisions.map((d) => `
          <div class="dec ${d.action}">
            <span class="bucket">${d.bucket ?? ""}</span>
            <span class="verb">${VERB[d.action] ?? d.action}</span>
            <span class="why">${d.detail ?? d.reason ?? ""}</span>
          </div>`).join("")
      : `<div class="empty" style="border:0"><b>Nothing considered yet.</b>
           <span>Decisions appear here each tick, including the ones declined.</span></div>`;

    /* A gate firing is worth seeing. Flash only the refusals that are new, so a
       standing refusal does not blink every minute. */
    const before = new Set((prev?.decisions ?? []).filter((d) => d.action === "refused").map((d) => d.bucket + d.reason));
    decisions.forEach((d, i) => {
      if (d.action !== "refused" || before.has(d.bucket + d.reason) || REDUCED) return;
      const row = host.children[i];
      if (row) row.animate(
        [{ background: "var(--reserved-lo)" }, { background: "transparent" }],
        { duration: 1400, easing: "ease-out" });
    });
  });

  panel(() => {
    const r = s.regime;
    const box = $("regime");
    box.hidden = !r;
    if (!r) return;
    const wasAside = Boolean(prev?.regime?.standAside);
    const measured = r.source === "model";
    box.className = "regime" + (r.standAside ? " aside" : measured ? "" : " unmeasured");
    $("regime-verdict").textContent = !measured
      ? "regime unchecked"
      : r.standAside ? "stand aside" : "conditions normal";
    $("regime-reason").textContent = r.reason ?? "";
    $("regime-src").textContent = r.source === "model"
      ? `${r.headlines?.length ?? 0} headlines · ${r.model ?? "model"}`
      : r.source === "no-news" ? "no headlines" : "check unavailable";
    if (r.standAside && !wasAside) pulse(box, "var(--reserved)");
  });

  panel(() => { $("updated").textContent = clock(s.at); });
  prev = s;
}

/* Live where an agent is running; the committed snapshot where one is not.
   Which of the two you are looking at is never left to be inferred — the
   masthead says so, and the payload carries `live` rather than the page
   guessing from whether a request succeeded. */
let gotLive = false;
const es = new EventSource("/api/stream");
es.onmessage = (e) => {
  try { render(JSON.parse(e.data)); gotLive = true; }
  catch (err) { console.error("bad frame:", err); }
};
es.onerror = () => {
  es.close();
  if (gotLive) { $("dot").className = "dot"; return; }
  fetch("/snapshot.json")
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => { if (s) render(s); })
    .catch(() => { $("dot").className = "dot"; });
};
