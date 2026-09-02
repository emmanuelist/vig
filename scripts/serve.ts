/**
 * Serves the Cover Sheet and streams agent state over SSE.
 *
 * The page is a VIEW onto the agent, never a second implementation. The agent
 * writes web/state.json each tick; this watches that file and pushes it. Nothing
 * here computes a number — if a value is on screen, the agent put it there,
 * which is what lets the demo claim the display is not theatre.
 *
 *   npm run serve
 */
import { createServer, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { watch, existsSync } from "node:fs";
import { extname, join } from "node:path";

// 5173 is cleave's. Vig takes 5174 so the two projects can run side by side.
const PORT = Number(process.env.PORT ?? 5174);
const WEB = new URL("../web/", import.meta.url).pathname;
const STATE = join(WEB, "state.json");

const clients = new Set<ServerResponse>();
let state = "{}";

async function reload(): Promise<void> {
  let raw: string;
  try { raw = await readFile(STATE, "utf8"); } catch { return; }

  // state.json is pretty-printed for humans reading the file, but an SSE frame
  // cannot carry raw newlines — every line of a message needs its own `data:`
  // prefix, so a multi-line payload arrives truncated at the first break and
  // fails to parse. Collapse it to one line before sending.
  try { state = JSON.stringify(JSON.parse(raw)); }
  catch { return; }   // a half-written file; the next event will bring a whole one

  const frame = `data: ${state}\n\n`;
  for (const c of clients) { try { c.write(frame); } catch { clients.delete(c); } }
}

if (existsSync(STATE)) await reload();
// The agent rewrites the file wholesale, so a debounce avoids pushing a
// half-written frame that would fail to parse in the page.
let pending: NodeJS.Timeout | undefined;
watch(WEB, (_e, f) => {
  if (f !== "state.json") return;
  clearTimeout(pending);
  pending = setTimeout(reload, 60);
});

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/api/stream") {
    res.writeHead(200, {
      "content-type": "text/event-stream", "cache-control": "no-cache",
      connection: "keep-alive", "x-accel-buffering": "no",
    });
    res.write(`data: ${state}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  // / is the landing page; /app is the Cover Sheet. Both live in web/.
  const route =
    url.pathname === "/" ? "landing.html" :
    url.pathname === "/app" || url.pathname === "/app/" ? "index.html" :
    url.pathname.replace(/^\//, "");
  const file = route;
  try {
    const body = await readFile(join(WEB, file));
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(PORT, () => {
  console.log(`\n  Vig — http://localhost:${PORT}\n`);
});
