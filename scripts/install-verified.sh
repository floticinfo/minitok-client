#!/usr/bin/env sh
set -eu
version=${1:-latest}
if [ "${MINITOK_INSTALL_DRY_RUN:-0}" = "1" ]; then echo "installer dry-run: version=$version platform=$(uname -s)"; exit 0; fi
state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/minitok"
mkdir -p "$state_dir"
previous=$(node -p "try{require('@flotic/minitok/package.json').version}catch(e){''}" 2>/dev/null || true)
printf '%s\n' "$previous" > "$state_dir/previous-version"
integrity=$(npm view "@flotic/minitok@$version" dist.integrity --json)
printf '%s\n' "$integrity" > "$state_dir/expected-integrity"
tmp=$(mktemp -d)
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT
npm pack "@flotic/minitok@$version" --pack-destination "$tmp" >/dev/null
archive=$(find "$tmp" -type f -name '*.tgz' | head -n 1)
actual=$(openssl dgst -sha512 -binary "$archive" | openssl base64 -A)
expected=$(printf '%s' "$integrity" | tr -d '"' | sed 's/^sha512-//')
[ "$actual" = "$expected" ] || { echo "Package integrity mismatch" >&2; exit 1; }
if ! npm install -g "@flotic/minitok@$version"; then
  test -n "$previous" && npm install -g "@flotic/minitok@$previous"
  exit 1
fi
installed=$(node -p "require('@flotic/minitok/package.json').version")
if [ "$version" != "latest" ] && [ "$installed" != "$version" ]; then
  test -n "$previous" && npm install -g "@flotic/minitok@$previous"
  exit 1
fi
printf '%s\n' "$installed" > "$state_dir/installed-version"
printf '%s\n' "verified" > "$state_dir/install-status"
