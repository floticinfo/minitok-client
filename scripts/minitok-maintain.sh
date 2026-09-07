#!/usr/bin/env sh
set -eu
case "${1:-}" in
  update) npm install -g @flotic/minitok@latest ;;
  uninstall) npm uninstall -g @flotic/minitok ;;
  rollback) test -n "${2:-}" && npm install -g "@flotic/minitok@$2" ;;
  *) echo "Usage: minitok-maintain update | uninstall | rollback VERSION"; exit 2 ;;
esac
