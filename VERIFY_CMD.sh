# minitok verification gate
# Windows users need Git Bash or WSL to run this gate.
set -euo pipefail
if command -v npm >/dev/null 2>&1; then
  npm test
  npm run lint
elif command -v pytest >/dev/null 2>&1; then
  pytest -q
else
  echo "No supported verifier found: install npm or pytest" >&2
  exit 127
fi
