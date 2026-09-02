/* Vig — landing.
 *
 * Two jobs. Draw the payoff curve at page scale and let the visitor move price
 * along it, and carry the real account figures in the tape.
 *
 * The curve is not decoration: its geometry is a real iron condor, and the
 * numbers under the scrub are the actual result of that structure at the price
 * the visitor has chosen. Every visual property encodes exactly one quantity —
 * height is profit and loss, width is price, fill is state — so nothing on the
 * page varies for looks.
 */

const $ = (id) => document.getElementById(id);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* A representative structure, in the shape the agent actually builds: short
   strikes near 0.12 delta, wings one width out, credit priced against us.
   Real geometry with illustrative strikes — the live account's own structures
   are on the Cover Sheet, which is one click away. */
const STRUCTURE = { longPut: 746, shortPut: 751, shortCall: 769, longCall: 774, creditPerShare: 0.53, qty: 5 };
const CONTRACT = 100;

const width = STRUCTURE.shortPut - STRUCTURE.longPut;
const maxLoss = (width - STRUCTURE.creditPerShare) * CONTRACT * STRUCTURE.qty;
const credit = STRUCTURE.creditPerShare * CONTRACT * STRUCTURE.qty;

const VB = { w: 1200, h: 520 };
const PAD = (STRUCTURE.longCall - STRUCTURE.longPut) * 0.34;
const LO = STRUCTURE.longPut - PAD;
const HI = STRUCTURE.longCall + PAD;

const x = (price) => ((price - LO) / (HI - LO)) * VB.w;
const priceAt = (px) => LO + (px / VB.w) * (HI - LO);

/* Independent vertical scales: the loss is far larger than the credit, and a
   shared scale would flatten the plateau into the zero line. The magnitudes are
   printed as text beside the control, where they are exact. */
const yZero = VB.h * 0.42;
const yUp = yZero - VB.h * 0.17;
const yDn = yZero + VB.h * 0.34;

/** Profit or loss of the whole structure if price expires here. */
function pnl(price) {
  const { longPut: lp, shortPut: sp, shortCall: sc, longCall: lc } = STRUCTURE;
  let intrinsic = 0;
  if (price < sp) intrinsic = Math.min(sp - price, sp - lp);
  else if (price > sc) intrinsic = Math.min(price - sc, lc - sc);
  return credit - intrinsic * CONTRACT * STRUCTURE.qty;
}

const yFor = (price) => {
  const v = pnl(price);
  return v >= 0
    ? yZero - (v / credit) * (yZero - yUp)
    : yZero + (Math.abs(v) / maxLoss) * (yDn - yZero);
};

const S = STRUCTURE;
const pts = [
  [0, yDn], [x(S.longPut), yDn], [x(S.shortPut), yUp],
  [x(S.shortCall), yUp], [x(S.longCall), yDn], [VB.w, yDn],
];
const d = "M" + pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" L");

function draw() {
  $("line").setAttribute("d", d);
  $("zero").setAttribute("y1", yZero); $("zero").setAttribute("y2", yZero);

  /* The two flat floors, drawn heavier than the ramps. They are the claim:
     past these points the loss does not deepen, whatever price does. */
  const fl = $("floorL"), fr = $("floorR");
  fl.setAttribute("x1", 0); fl.setAttribute("x2", x(S.longPut));
  fl.setAttribute("y1", yDn); fl.setAttribute("y2", yDn);
  fr.setAttribute("x1", x(S.longCall)); fr.setAttribute("x2", VB.w);
  fr.setAttribute("y1", yDn); fr.setAttribute("y2", yDn);

  $("areaReserved").setAttribute("d",
    `M0,${yDn} L${VB.w},${yDn} L${VB.w},${VB.h} L0,${VB.h} Z`);
  $("areaProfit").setAttribute("d",
    `M${x(S.shortPut)},${yZero} L${x(S.shortPut)},${yUp} L${x(S.shortCall)},${yUp} L${x(S.shortCall)},${yZero} Z`);
  $("areaLoss").setAttribute("d",
    `M0,${yZero} L0,${yDn} L${x(S.longPut)},${yDn} L${x(S.shortPut)},${yZero} Z` +
    `M${x(S.shortCall)},${yZero} L${x(S.longCall)},${yDn} L${VB.w},${yDn} L${VB.w},${yZero} Z`);

  const corridor = $("corridor");
  corridor.style.left = `${(x(S.shortPut) / VB.w) * 100}%`;
  corridor.style.width = `${((x(S.shortCall) - x(S.shortPut)) / VB.w) * 100}%`;
}

let atPrice = (S.shortPut + S.shortCall) / 2;

function place(price) {
  atPrice = Math.max(LO, Math.min(HI, price));
  const px = x(atPrice);
  const py = yFor(atPrice);
  const v = pnl(atPrice);
  /* Red means losing money, not "past a short strike". Between the breakeven
     and the short strike the structure is beyond its corridor and still
     profitable, so keying the colour to the strike put a red curve above a
     green number. One quantity, one encoding: the sign of the result. */
  const breached = v < 0;

  $("mark").setAttribute("x1", px); $("mark").setAttribute("x2", px);
  $("mark").setAttribute("y1", 0); $("mark").setAttribute("y2", VB.h);
  $("dot").setAttribute("cx", px); $("dot").setAttribute("cy", py);
  $("hero").classList.toggle("breach", breached);

  $("knob").style.left = `${(px / VB.w) * 100}%`;
  $("s-price").textContent = atPrice.toFixed(2);

  const out = $("s-pnl");
  const shown = Number(out.dataset.v ?? v);
  out.dataset.v = String(v);
  out.className = "n " + (v >= 0 ? "win" : "lose");
  if (REDUCED || Math.abs(v - shown) < 1) {
    out.textContent = (v >= 0 ? "+$" : "−$") + Math.abs(Math.round(v)).toLocaleString("en-US");
  } else {
    cancelAnimationFrame(Number(out.dataset.raf));
    const t0 = performance.now(), dur = 420;
    const step = (t) => {
      const k = Math.min(1, Math.max(0, (t - t0) / dur));
      const e = 1 - Math.pow(2, -10 * k);
      const cur = shown + (v - shown) * e;
      out.textContent = (cur >= 0 ? "+$" : "−$") + Math.abs(Math.round(cur)).toLocaleString("en-US");
      if (k < 1) out.dataset.raf = String(requestAnimationFrame(step));
    };
    out.dataset.raf = String(requestAnimationFrame(step));
  }

  /* At the floor the loss has stopped deepening. That is the claim. */
  if (Math.abs(v + maxLoss) < 1) greetFloor();

  const knob = $("knob");
  knob.setAttribute("aria-valuenow", String(Math.round(((atPrice - LO) / (HI - LO)) * 100)));
  knob.setAttribute("aria-valuetext",
    `price ${atPrice.toFixed(2)}, ${v >= 0 ? "profit" : "loss"} ${Math.abs(Math.round(v))} dollars`);
}

/* Pointer and keyboard both drive the same setter, so the control is genuinely
   operable rather than merely mouse-shaped. */
function bindScrub() {
  const rail = $("rail");
  const hint = $("hint");
  let dragging = false;

  const fromClientX = (clientX) => {
    const r = rail.getBoundingClientRect();
    return priceAt(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * VB.w);
  };
  const used = () => hint.classList.add("used");

  const move = (e) => { if (!dragging) return; e.preventDefault(); place(fromClientX(e.clientX)); };
  rail.addEventListener("pointerdown", (e) => {
    dragging = true; used(); rail.setPointerCapture(e.pointerId); place(fromClientX(e.clientX));
  });
  rail.addEventListener("pointermove", move);
  rail.addEventListener("pointerup", () => { dragging = false; });
  rail.addEventListener("pointercancel", () => { dragging = false; });

  $("knob").addEventListener("keydown", (e) => {
    const step = (HI - LO) / 100 * (e.shiftKey ? 5 : 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { place(atPrice - step); used(); e.preventDefault(); }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { place(atPrice + step); used(); e.preventDefault(); }
    if (e.key === "Home") { place(LO); used(); e.preventDefault(); }
    if (e.key === "End") { place(HI); used(); e.preventDefault(); }
  });
}

/* The one authored motion moment: the curve draws itself once, on arrival.
   After this the only thing that moves is what the visitor moves. */
function intro() {
  if (REDUCED) return;
  const line = $("line");
  const len = line.getTotalLength();
  line.animate(
    [{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }],
    { duration: 1300, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
  for (const el of [$("floorL"), $("floorR")]) {
    el.animate([{ opacity: 0 }, { opacity: .85 }], { duration: 700, delay: 900, easing: "ease-out", fill: "backwards" });
  }
  $("dot").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 1200, fill: "backwards" });
}

/* ── The gate sequence ────────────────────────────────────────────────
 * A structure is checked against eight gates in order, and any one of them
 * can stop it. So when the section arrives, the rules draw in one after
 * another, left to right — the checks being applied, in the order the agent
 * applies them. It runs once. It is not a section reveal wearing a
 * product's clothes; the sequence IS the subject of the section.
 * ------------------------------------------------------------------- */
function gateSequence() {
  const list = document.getElementById("gates");
  if (!list || REDUCED) return;
  const rows = [...list.children];
  rows.forEach((r) => r.classList.add("armed"));

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.disconnect();
      rows.forEach((r, i) => setTimeout(() => r.classList.remove("armed"), 90 * i));
    }
  }, { threshold: 0.18 });
  io.observe(list);
}

/* The floor, acknowledged. The first time a visitor drags far enough that the
 * loss stops deepening, the reserved field answers once — that band is the
 * money standing behind the position, and reaching the floor is the moment it
 * means something. Once only: a response that repeats is wallpaper. */
let floorGreeted = false;
function greetFloor() {
  if (floorGreeted || REDUCED) return;
  floorGreeted = true;
  const field = document.getElementById("areaReserved");
  field.animate(
    [{ opacity: 1 }, { opacity: .45 }, { opacity: 1 }],
    { duration: 900, easing: "cubic-bezier(.22,.61,.36,1)" });
}

/* The tape. Real account state over the same stream the Cover Sheet reads; if
   it is not connected the strip says so rather than showing a stale figure as
   though it were current. */
function bindTape() {
  const usd = (v, dp = 0) => "$" + Number(v ?? 0).toLocaleString("en-US",
    { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const live = $("t-live"), status = $("t-status");
  /* The dot is the only liveness signal at phone width, where its label is
     hidden. Give it an accessible name so it is not a decorative circle. */
  const say = (text) => { status.textContent = text; live.setAttribute("aria-label", text); live.title = text; };

  let gotLive = false;
  const paint = (s) => {
    if (!s || s.equity === undefined) return;
    $("p-acct").textContent = s.accountNumber ?? "—";
    $("p-eq").textContent = usd(s.equity);
    $("p-res").textContent = usd(s.reserved);
    $("p-unc").textContent = usd(s.uncovered ?? 0);
    if (s.live === false) {
      live.className = "tape-live snap";
      say("snapshot · " + new Date(s.capturedAt ?? s.at).toLocaleTimeString("en-US", { hour12: false }));
    } else {
      live.className = "tape-live on";
      say(s.marketOpen ? "market open" : "market closed");
      gotLive = true;
    }
  };

  const es = new EventSource("/api/stream");
  es.onmessage = (e) => { try { paint(JSON.parse(e.data)); } catch { /* next frame */ } };
  es.onerror = () => {
    es.close();
    if (gotLive) { live.className = "tape-live off"; say("not connected"); return; }
    fetch("/snapshot.json").then((r) => (r.ok ? r.json() : null)).then(paint)
      .catch(() => { live.className = "tape-live off"; say("not connected"); });
  };
}

draw();
place(atPrice);
bindScrub();
bindTape();
intro();
gateSequence();
