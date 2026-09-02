/**
 * Freeze the current account state into a committed snapshot.
 *
 * The Cover Sheet is a view onto a locally running agent; a deployed copy has
 * no agent behind it and no SSE stream to read. Rather than ship a page that
 * sits on "not connected", the build carries a snapshot of real account state
 * and the interface says plainly that it is one, with the time it was taken.
 *
 * A snapshot presented as live would be the one dishonesty this project cannot
 * afford, so `live: false` travels inside the payload and the surfaces key
 * their status off it rather than off whether a fetch happened to succeed.
 *
 *   npm run snapshot
 */
import { readFileSync, writeFileSync } from "node:fs";

const state = JSON.parse(readFileSync("web/state.json", "utf8"));

writeFileSync("web/snapshot.json", JSON.stringify({
  ...state,
  live: false,
  capturedAt: new Date().toISOString(),
}, null, 2));

const n = state.positions?.length ?? 0;
console.log(`snapshot: ${n} structure${n === 1 ? "" : "s"}, $${Number(state.reserved).toLocaleString()} reserved, taken ${new Date().toISOString()}`);
