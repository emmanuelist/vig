#!/usr/bin/env bash
# Reports whether .env is populated. Prints lengths and prefixes ONLY —
# never a whole credential. Do not "simplify" this with ${VAR:-...},
# which expands to the value itself when the variable is set.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "STATUS: .env missing"; exit 1; }
set -a; . ./.env; set +a

show() {
  local name="$1" val="${!1-}"
  if [ -z "$val" ]; then printf '  %-20s EMPTY\n' "$name"
  else printf '  %-20s set — %d chars, starts %s…\n' "$name" "${#val}" "${val:0:4}"; fi
}

echo "Credentials"
show ALPACA_API_KEY
show ALPACA_SECRET_KEY
echo "Identifiers"
printf '  %-20s %s\n' ALPACA_ACCOUNT_ID "${ALPACA_ACCOUNT_ID:-EMPTY}"
echo "Safety"
if [ -n "${ALPACA_LIVE_TRADE:-}" ]; then
  printf '  %-20s \033[31mSET — routes to LIVE MONEY, unset it\033[0m\n' ALPACA_LIVE_TRADE
else
  printf '  %-20s unset (correct)\n' ALPACA_LIVE_TRADE
fi
