/* Motion primitives.
 *
 * One rule governs this file: every animation here is CAUSED by something that
 * actually happened in the account. Capital moves because capital was reserved.
 * A curve draws because a structure opened. Nothing loops, nothing idles, and
 * nothing animates to fill silence — if the agent does nothing for a minute,
 * the page is still. That is what keeps the motion informative rather than
 * decorative, and it is why a judge can trust what they are watching.
 */

export const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Expo-out. Fast commit, long settle — reads as something heavy arriving and
   coming to rest, which is what a sum of money should feel like. */
const easeOutExpo = (p) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p));

/* Slight overshoot for things that snap into place rather than settle. */
export const SPRING = "linear(0,.006,.026,.06,.106,.166,.24,.328,.43,.546,.677,.72,.766,.813,.86,.905,.945,.977,1,1.012,1.017,1.015,1.01,1.005,1.001,1)";

/**
 * Tween a number in place. The element remembers its own last value, so a
 * repeated identical frame from SSE costs nothing and does not re-animate.
 */
export function tweenNumber(el, to, format, dur = 850) {
  if (!el) return;
  const first = el.dataset.v === undefined;
  const from = first ? to : Number(el.dataset.v);
  // Record the value on EVERY path. Returning early without stamping it leaves
  // dataset.v undefined forever, so the next update also reads `from === to`
  // and snaps — the tween silently never runs after the first frame.
  el.dataset.v = String(to);
  if (from === to) { el.textContent = format(to); return; }

  if (REDUCED) { el.textContent = format(to); return; }

  cancelAnimationFrame(Number(el.dataset.raf));
  const t0 = performance.now();
  const step = (t) => {
    // rAF hands back the FRAME START time, which can predate the
    // performance.now() captured immediately before scheduling it. Left
    // unclamped that makes p negative, and 1 - 2^(-10p) goes negative with it —
    // so the first painted frame of a $18,263 tween reads "-$698". Clamp both ends.
    const p = Math.min(1, Math.max(0, (t - t0) / dur));
    el.textContent = format(from + (to - from) * easeOutExpo(p));
    if (p < 1) el.dataset.raf = String(requestAnimationFrame(step));
  };
  el.dataset.raf = String(requestAnimationFrame(step));
}

/**
 * Send a sum of money from one element to another.
 *
 * This is the moment the whole product exists to show: capital leaving the
 * available pile and being set aside against a structure, BEFORE the order is
 * live. It travels on an arc, because a straight line reads as a UI transition
 * and an arc reads as an object with weight.
 */
export function transferCapital(fromEl, toEl, label) {
  if (REDUCED || !fromEl || !toEl) return Promise.resolve();

  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();

  const chip = document.createElement("div");
  chip.className = "capital-chip";
  chip.textContent = label;
  document.body.appendChild(chip);

  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
  /* Lift the arc above both endpoints so the travel is legible even when the
     two elements sit on nearly the same line. */
  const lift = Math.max(46, Math.abs(x1 - x0) * 0.18);

  chip.style.left = `${x0}px`;
  chip.style.top = `${y0}px`;

  const anim = chip.animate([
    { transform: "translate(-50%,-50%) scale(.82)", opacity: 0 },
    { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: .14 },
    { transform: `translate(calc(-50% + ${(x1 - x0) * .5}px), calc(-50% + ${(y1 - y0) * .5 - lift}px)) scale(1)`, opacity: 1, offset: .55 },
    { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(.7)`, opacity: 0 },
  ], { duration: 1100, easing: "cubic-bezier(.34,.02,.24,1)" });

  return anim.finished.then(() => {
    chip.remove();
    /* The meter absorbs it — the impact is the point, not the travel. */
    toEl.animate([
      { filter: "brightness(1)" }, { filter: "brightness(1.9)" }, { filter: "brightness(1)" },
    ], { duration: 620, easing: "ease-out" });
  });
}

/** Draw an SVG path from nothing, stroke-first. */
export function drawPath(path, dur = 900, delay = 0) {
  if (!path) return;
  if (REDUCED) return;
  let len = 0;
  try { len = path.getTotalLength(); } catch { return; }
  if (!len) return;
  path.animate(
    [{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }],
    { duration: dur, delay, easing: "cubic-bezier(.22,.61,.36,1)", fill: "backwards" },
  );
}

/** A card arriving. Staggered by index so a batch reads as a sequence. */
export function enter(el, i = 0) {
  if (REDUCED) return;
  el.animate([
    { opacity: 0, transform: "translateY(14px) scale(.985)" },
    { opacity: 1, transform: "none" },
  ], { duration: 620, delay: i * 70, easing: "cubic-bezier(.22,.61,.36,1)", fill: "backwards" });
}

/** A card leaving, after its structure settled. */
export function exit(el) {
  if (REDUCED) { el.remove(); return; }
  el.animate([
    { opacity: 1, transform: "none" },
    { opacity: 0, transform: "translateY(-8px) scale(.99)" },
  ], { duration: 340, easing: "ease-in" }).finished.then(() => el.remove());
}

/** One hard pulse. Used when something is decided, never on a timer. */
export function pulse(el, tone = "var(--reserved)") {
  if (!el || REDUCED) return;
  el.animate([
    { boxShadow: `0 0 0 0 ${tone}00` },
    { boxShadow: `0 0 0 6px ${tone}22` },
    { boxShadow: `0 0 0 14px ${tone}00` },
  ], { duration: 900, easing: "cubic-bezier(.22,.61,.36,1)" });
}
