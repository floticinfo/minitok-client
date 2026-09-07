#!/usr/bin/env sh
set -eu
command -v node >/dev/null || { echo "Node.js is required." >&2; exit 1; }
npm install -g @flotic/minitok@latest
echo "minitok installed. Run: minitok gui"
