/**
 * The Alpaca CLI is Vig's entire execution path.
 *
 * Every read and every write goes through `alpaca`, and every invocation leaves
 * a receipt: the exact argv, the exit code, the parsed response, the duration.
 * Nothing in this project talks to Alpaca any other way. Remove the CLI and the
 * product stops existing — which is the point.
 *
 * Verified against alpaca 0.0.14 (alpha preview) on 2026-09-02.
 */

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { promisify } from "node:util";

const run = promisify(execFile);

const RECEIPTS = "receipts";
const RECEIPT_LOG = `${RECEIPTS}/receipts.jsonl`;

/** Exit codes, per the CLI's documented contract. */
export const EXIT = { OK: 0, ERROR: 1, AUTH: 2 } as const;

export type Receipt = {
  id: string;
  at: string;
  argv: string[];
  exit: number;
  ok: boolean;
  ms: number;
  data: unknown;
  error?: string;
};

/** Thrown when the CLI cannot authenticate. Always fatal — never retried. */
export class AuthError extends Error {}

/** Thrown when the CLI ran but the request failed. May be retryable. */
export class CliError extends Error {
  constructor(message: string, readonly receipt: Receipt) {
    super(message);
  }
}

/**
 * The API key appears in no receipt, no log line and no demo frame.
 * Belt and braces: we never pass secrets as argv (they go via env), but a
 * response could still echo something key-shaped back at us.
 */
function redact(s: string): string {
  return s.replace(/\b(PK|SK)[A-Z0-9]{16,}\b/g, "$1<redacted>");
}

/**
 * Responses larger than this are summarised rather than stored.
 *
 * The receipt log exists to prove what ORDERS we sent and what came back. A
 * market-data read returns the whole option chain — ~560 KB per call — and
 * three underlyings on a sixty-second tick would write about 4.8 GB across the
 * competition and fill the disk mid-run. Order submissions are one to two KB,
 * so they stay under this cap and are kept in full, which is precisely the part
 * that has to be auditable.
 */
const MAX_PAYLOAD = 8 * 1024;

function record(r: Receipt): void {
  mkdirSync(RECEIPTS, { recursive: true });

  let out = r;
  if (r.data !== null && r.data !== undefined) {
    const json = JSON.stringify(r.data);
    if (json.length > MAX_PAYLOAD) {
      out = {
        ...r,
        data: {
          omitted: "payload over cap; argv, exit and duration are the record",
          bytes: json.length,
          keys: typeof r.data === "object" && !Array.isArray(r.data)
            ? Object.keys(r.data as Record<string, unknown>).slice(0, 12)
            : undefined,
          count: Array.isArray(r.data) ? r.data.length : undefined,
        },
      };
    }
  }
  appendFileSync(RECEIPT_LOG, JSON.stringify(out) + "\n");
}

/**
 * Invoke the CLI and return its parsed JSON.
 *
 * `--quiet` is always passed: it suppresses hints and colour, which otherwise
 * contaminate stdout and break parsing.
 */
export async function alpaca<T = unknown>(...args: string[]): Promise<T> {
  const argv = [...args, "--quiet"];
  const id = randomUUID();
  const started = Date.now();

  // ALPACA_LIVE_TRADE is deliberately absent. The CLI defaults to paper and
  // this project has no code path that changes that. See ENGINEERING.md §2.
  const env = {
    ...process.env,
    ALPACA_API_KEY: process.env.ALPACA_API_KEY ?? "",
    ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY ?? "",
  };
  delete (env as Record<string, unknown>).ALPACA_LIVE_TRADE;

  try {
    const { stdout } = await run("alpaca", argv, { env, maxBuffer: 32 << 20 });
    const data = stdout.trim() ? JSON.parse(stdout) : null;
    const receipt: Receipt = {
      id, at: new Date(started).toISOString(), argv,
      exit: EXIT.OK, ok: true, ms: Date.now() - started, data,
    };
    record(receipt);
    return data as T;
  } catch (e) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message: string };
    const exit = err.code ?? EXIT.ERROR;

    // Errors arrive as JSON on stderr. Fall back to the raw text if that
    // ever stops being true — an unparseable error is still an error.
    let message = redact(err.stderr?.trim() || err.message);
    try {
      const parsed = JSON.parse(err.stderr ?? err.stdout ?? "");
      if (parsed?.error) message = redact(String(parsed.error));
    } catch { /* not JSON; keep the raw text */ }

    const receipt: Receipt = {
      id, at: new Date(started).toISOString(), argv,
      exit, ok: false, ms: Date.now() - started, data: null, error: message,
    };
    record(receipt);

    if (exit === EXIT.AUTH) throw new AuthError(message);
    throw new CliError(message, receipt);
  }
}

/**
 * Submit an order twice: once as `--dry-run` to capture the exact request body,
 * then for real. The dry run is the receipt — it is what lets the Cover Sheet
 * prove the collateral covered the trade *before* the trade existed.
 *
 * `--dry-run` still requires auth; it does not reach the order book.
 */
export async function submitWithProof<T = unknown>(args: string[]): Promise<{ preview: unknown; order: T }> {
  const preview = await alpaca(...args, "--dry-run");
  const order = await alpaca<T>(...args);
  return { preview, order };
}
