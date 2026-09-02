/**
 * Films the demo.
 *
 * This automates the CAMERA, not the content. Every frame is the real app,
 * driven by the real engine, against real Somnia markets. Nothing is stubbed
 * and no footage is synthesised. What it buys is determinism: exact beats,
 * no mouse fumbling, and a re-run if anything changes.
 *
 * Segments map to docs/run-of-show.md. Record voice separately, then:
 *   npm run film:cut          # assemble segments
 *   npm run film:voice a.m4a  # mux narration over the cut
 *
 *   npm run film              # needs `npm run serve -- --live --short` warm
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { CUES, CAPTION_RUNTIME } from "./captions.js";
import { MOVES, POINTER_RUNTIME, TRAVEL_MS, type Move } from "./pointer.js";
import { NARRATION } from "./narration.js";
import { CARDS, cardHTML, type Card } from "./card.js";
import { readFileSync, existsSync } from "node:fs";

/** Each segment runs as long as its narration actually takes, plus a tail to
 *  let the last line land. Hand-tuned windows break the moment the voice
 *  changes pace, and swapping TTS voices changes it a lot. */
const TAIL = 4.5;
function windowFor(segment: string, planned: number): number {
  if (!existsSync("film/timing.json")) return planned;
  try {
    const t = JSON.parse(readFileSync("film/timing.json", "utf8")) as
      Record<string, { at: number; secs: number }[]>;
    const lines = t[segment];
    if (!lines?.length) return planned;
    const last = lines[lines.length - 1]!;
    return Math.round((last.at + last.secs + TAIL) * 10) / 10;
  } catch { return planned; }
}

/* Two surfaces, two URLs. Routing moved the Cover Sheet to /app, and every
   segment was still pointed at the root — so segments narrating the sheet
   ("each open structure is drawn as its own payoff") were filmed over the
   landing page. The narration must be over the thing it describes. */
const LANDING = process.env.APP_URL ?? "http://localhost:5174/";
const SHEET = process.env.SHEET_URL ?? "http://localhost:5174/app";
const SITE = process.env.SITE_URL ?? LANDING;
const TX = "https://shannon-explorer.somnia.network/tx/0xb785b4f03a6f0fcc68be476ad4dd617dd667ef21d6d3fac1531d91cb1116afd3";
const OUT = "film";
const W = 1440, H = 900;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until the page actually has content. Fixed sleeps guess; this checks.
 *  The Somnia explorer takes ~14s to paint and ~22s to settle, so a 4s sleep
 *  filmed a blank white page. */
async function untilPainted(page: Page, minChars = 400, timeoutMs = 40_000) {
  const t0 = Date.now();
  for (;;) {
    const n = await page.evaluate(() => (document.body?.innerText ?? "").trim().length).catch(() => 0);
    if (n >= minChars) { process.stdout.write(`  painted (${n} chars, ${((Date.now() - t0) / 1000).toFixed(1)}s)\n`); return; }
    if (Date.now() - t0 > timeoutMs) { process.stdout.write(`  ! never painted after ${timeoutMs / 1000}s\n`); return; }
    await wait(500);
  }
}

/** Roll for `secs` of PAINTED footage, after setup.
 *
 *  The browser shows white while it navigates and loads, so those frames are
 *  unusable. Counting them toward the window left the landing segment with 5s
 *  of real footage for 17s of narration. So: hold the full window after setup,
 *  record how long setup took, and let the cut trim it away. What survives is
 *  exactly `secs` of painted picture. */
const setupTimes: Record<string, number> = {};
async function holdAfterSetup(name: string, startedAt: number, secs: number) {
  const spent = (Date.now() - startedAt) / 1000;
  setupTimes[name] = +spent.toFixed(2);
  process.stdout.write(`  setup ${spent.toFixed(1)}s (trimmed), rolling ${secs}s of picture\n`);
  await wait(secs * 1000);
}

/** Captions are injected AFTER the page settles, so their clock starts when
 *  the shot actually begins rather than when navigation did. */
/**
 * Fire the real interactions, timed to when the cursor ARRIVES rather than when
 * it sets off. A click that lands before the cursor gets there reads as the page
 * acting on its own; landing after it reads as the cursor causing it.
 *
 * Failures are logged and swallowed: a selector can vanish between planning and
 * filming, and losing one interaction is better than losing the segment.
 */
function scheduleActions(page: Page, moves: Move[]): NodeJS.Timeout[] {
  const timers: NodeJS.Timeout[] = [];
  for (const m of moves) {
    if (!m.click && m.type === undefined) continue;
    timers.push(setTimeout(async () => {
      try {
        await page.evaluate(() => (window as unknown as { __ptrPress?: () => void }).__ptrPress?.());
        const el = page.locator(m.sel).first();
        if (m.type !== undefined) { await el.click({ timeout: 2500 }); await el.fill(m.type as string, { timeout: 2500 }); }
        else { await el.click({ timeout: 2500 }); }
        process.stdout.write(`    acted on ${m.sel}\n`);
      } catch (e) {
        process.stdout.write(`    action skipped (${m.sel}): ${((e as Error).message.split("\n")[0] ?? "").slice(0, 60)}\n`);
      }
    }, m.at * 1000 + TRAVEL_MS));
  }
  return timers;
}

async function captions(page: Page, name: string) {
  const cues = CUES[name];
  if (cues?.length) {
    try {
      await page.evaluate(CAPTION_RUNTIME.replace("__CUES__", JSON.stringify(cues)));
      process.stdout.write(`  captions: ${cues.length} cues injected\n`);
    } catch (e) { process.stdout.write(`  captions FAILED: ${(e as Error).message.slice(0, 90)}\n`); }
  }
  const moves = MOVES[name];
  if (moves?.length) {
    try {
      await page.evaluate(POINTER_RUNTIME.replace("__MOVES__", JSON.stringify(moves)));
      const ok = await page.evaluate(() => !!document.getElementById("__ptr"));
      const acts = moves.filter((m) => m.click || m.type !== undefined).length;
      const zooms = moves.filter((m) => m.zoom !== undefined).length;
      process.stdout.write(`  pointer: ${moves.length} moves, ${acts} actions, ${zooms} zooms, element ${ok ? "present" : "MISSING"}\n`);
      scheduleActions(page, moves);
    } catch (e) { process.stdout.write(`  pointer FAILED: ${(e as Error).message.slice(0, 90)}\n`); }
  } else {
    process.stdout.write(`  pointer: no moves for ${name}\n`);
  }
}

async function segment(name: string, secs: number, go: (p: Page) => Promise<void>) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: `${OUT}/${name}`, size: { width: W, height: H } },
    deviceScaleFactor: 1,
    // The Somnia explorer is light-themed by default and flashed a full white
    // frame at the end of the film. It honours prefers-color-scheme.
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  // Recording starts with the context, so the first frames were about:blank
  // white. Paint the ground before navigating anywhere.
  await page.goto("data:text/html,<body style=\"margin:0;background:#08090b\"></body>");
  const startedAt = Date.now();
  console.log(`\n▸ ${name}`);
  await go(page);
  await captions(page, name);
  await holdAfterSetup(name, startedAt, secs);
  await ctx.close();     // flushes the video
  await browser.close();
}

/** Films a title card. Same machinery as any other segment, so it inherits the
 *  trimming, manifest and mixing without special cases. */
async function cardSegment(c: Card) {
  await segment(c.name, c.secs, async (p) => {
    await p.setContent(cardHTML(c), { waitUntil: "domcontentloaded" });
    await wait(900);            // let the webfont land before the animation reads
  });
}

async function main() {
  if (existsSync("film/timing.json")) console.log("Sizing segments to film/timing.json");
  else console.log("No film/timing.json: using planned windows. Run npm run voice first.");

  // Only clear the SEGMENT directories. Wiping all of film/ destroyed
  // narration.mp3 and voice/ that a previous step had produced.
  mkdirSync(OUT, { recursive: true });
  for (const name of [...Object.keys(CUES), ...CARDS.map((c) => c.name)])
    rmSync(`${OUT}/${name}`, { recursive: true, force: true });

  // Every segment films the SAME running app at a different focus. There is no
  // second surface and no marketing page — the thing being demonstrated is the
  // thing on screen, which is the only way the "nothing is mocked" claim can be
  // made on camera.
  //
  // scrollTo is driven directly rather than with scrollIntoView({behavior:
  // "smooth"}): a per-frame scroll fights the browser's own easing toward a
  // target that has already moved, and the result is a shot that does not move
  // at all and then lurches.
  const FOCUS_FN = `
    window.__focus = (sel, block) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const doc = document.documentElement;
      const prev = doc.style.scrollBehavior;
      doc.style.scrollBehavior = 'auto';
      const y = el.getBoundingClientRect().top + scrollY - innerHeight * block;
      const end = Math.max(0, Math.min(doc.scrollHeight - innerHeight, y));
      const from = scrollY, dur = 1400, t0 = performance.now();
      const ease = t => 1 - Math.pow(1 - t, 3);
      const step = now => {
        const k = Math.min(1, (now - t0) / dur);
        scrollTo(0, Math.round(from + (end - from) * ease(k)));
        if (k < 1) requestAnimationFrame(step); else doc.style.scrollBehavior = prev;
      };
      requestAnimationFrame(step);
    };`;

  /** Schedule camera moves that run DURING the roll, not during setup. */
  const choreograph = (steps: Array<[number, string, number]>) =>
    FOCUS_FN + steps.map(([at, sel, block]) =>
      `setTimeout(() => window.__focus(${JSON.stringify(sel)}, ${block}), ${Math.round(at * 1000)});`).join("\n");

  // 1. The question. Held at the top, still, while the narration poses it.
  await segment("01-open", windowFor("01-open", 26), async (p) => {
    await p.goto(LANDING, { waitUntil: "domcontentloaded" });
    await untilPainted(p, 500);
    await wait(1800);
  });

  // 2. The Cover Sheet. The figure, then the equality under it.
  await segment("02-cover", windowFor("02-cover", 44), async (p) => {
    await p.goto(SHEET, { waitUntil: "domcontentloaded" });
    await untilPainted(p, 500);
    await wait(1500);
  });

  // 3. A structure, drawn as its own payoff.
  await segment("03-structure", windowFor("03-structure", 46), async (p) => {
    await p.goto(SHEET, { waitUntil: "domcontentloaded" });
    await untilPainted(p, 500);
    await wait(1200);
    void p.evaluate(choreograph([[1.0, "#positions .pos:first-child", 0.28]])).catch(() => {});
  });

  // 4. The decision beat. Filmed while the agent is actually working, so a real
  //    capital transfer and a real refusal can land inside the window rather
  //    than being described over a static page.
  await segment("04-decision", windowFor("04-decision", 42), async (p) => {
    await p.goto(SHEET, { waitUntil: "domcontentloaded" });
    await untilPainted(p, 500);
    await wait(1200);
    // The receipt has to be on screen before the cursor is sent to click it,
    // so the page walks down to the first structure ahead of that beat.
    void p.evaluate(choreograph([
      [0.5, ".cover", 0.10],
      [9.5, "#positions .pos:first-child", 0.20],
      [22.0, "#decisions", 0.22],
    ])).catch(() => {});
  });

  // 5. The limits, and the claim again. Back where we started.
  await segment("05-limits", windowFor("05-limits", 38), async (p) => {
    await p.goto(LANDING, { waitUntil: "domcontentloaded" });
    await untilPainted(p, 500);
    await wait(1200);
    void p.evaluate(choreograph([
      [1.0, ".band.plain", 0.16],
      [20.0, ".hero", 0.02],
    ])).catch(() => {});
  });

  for (const c of CARDS) await cardSegment(c);
  writeFileSync(`${OUT}/setup.json`, JSON.stringify(setupTimes, null, 2));
  console.log(`\nSegments in ${OUT}/. Next: npm run film:cut`);
}

main().catch((e) => { console.error(e); process.exit(1); });
