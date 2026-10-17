#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
source "$SCRIPT_DIR/package-subtree-common.sh"

fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
git init -q -b main "$fixture"
cd "$fixture"
git config user.name 'Subtree Test'
git config user.email 'subtree-test@example.com'
git config core.hooksPath /dev/null

printf 'fork\n' > history.txt
git add history.txt
git commit -qm 'fork'
fork=$(git rev-parse HEAD)

git switch -qc side
printf 'side\n' > side.txt
git add side.txt
git commit -qm 'side change'
side=$(git rev-parse HEAD)

git switch -q main
printf 'already synced\n' >> history.txt
git add history.txt
git commit -qm 'mainline change'
baseline=$(git rev-parse HEAD)

git merge -q --no-ff side -m 'merge side branch'
printf 'new\n' >> history.txt
git add history.txt
git commit -qm 'new change'
target=$(git rev-parse HEAD)

initial=$(remaining_upstream_commits "$baseline" "$baseline" "$target")
remaining=$(remaining_upstream_commits "$baseline" "$side" "$target")
next=$(git rev-parse HEAD)

if [ "$initial" != "$(printf '%s\n%s' "$side" "$next")" ]; then
  echo 'Initial range did not include the side branch and following commit' >&2
  exit 1
fi
if [ "$remaining" != "$next" ]; then
  echo 'Restart replayed commits outside the original sync range' >&2
  exit 1
fi
if remaining_upstream_commits "$baseline" "$fork" "$target" >/dev/null 2>&1; then
  echo 'A checkpoint outside the sync range was accepted' >&2
  exit 1
fi

PACKAGE_JSON="$fixture/package.json"
printf '{"subtree":{"commit":"%s"}}\n' "$baseline" > "$PACKAGE_JSON"
SYNC_BASE_COMMIT="$baseline"
update_package_json_commit "$side"
if [ "$(jq -r '.subtree.commit' "$PACKAGE_JSON")" != "$side" ] ||
   [ "$(jq -r '.subtree.syncBase' "$PACKAGE_JSON")" != "$baseline" ]; then
  echo 'The original baseline was not preserved in package tracking' >&2
  exit 1
fi

echo 'Subtree progress regression test passed'
