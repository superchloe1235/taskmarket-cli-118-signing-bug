#!/usr/bin/env bash
# Applies the one-line fix for @lucid-agents/taskmarket 1.18.0:
#   MARKET_ACTION_MESSAGE_PREFIX = "taskmarket:market:"  ->  "taskmarket:"
# (client must sign "taskmarket:submit:<id>" etc. to match the deployed API)
#
# Usage: ./apply.sh [path-to]dist
#   default: /usr/lib/node_modules/@lucid-agents/taskmarket/dist
set -euo pipefail

DIST="${1:-/usr/lib/node_modules/@lucid-agents/taskmarket/dist}"
CHUNK="$DIST/chunk-75LS6XS6.js"

[ -f "$CHUNK" ] || { echo "not found: $CHUNK"; echo "usage: $0 [path-to]dist"; exit 1; }

# backup once
if [ ! -f "$CHUNK.orig" ]; then
  cp "$CHUNK" "$CHUNK.orig"
  echo "backup created: $CHUNK.orig"
fi

python3 - "$CHUNK" <<'PY'
import sys
p = sys.argv[1]
t = open(p, encoding='utf-8').read()
old = 'MARKET_ACTION_MESSAGE_PREFIX = "taskmarket:market:"'
new = 'MARKET_ACTION_MESSAGE_PREFIX = "taskmarket:"'
n = t.count(old)
if n == 1:
    open(p, 'w', encoding='utf-8').write(t.replace(old, new))
    print('patched OK')
elif n == 0:
    print('nothing to patch (already patched, or not v1.18.0)')
else:
    print(f'unexpected occurrence count: {n}'); raise SystemExit(1)
PY

echo "done. Re-run your taskmarket command (e.g. taskmarket task submit ...)."
echo "Note: re-apply after any CLI reinstall."
