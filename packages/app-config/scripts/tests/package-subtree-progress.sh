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
SYNC_TARGET_COMMIT="$target"
pin_upstream_sync_target "$baseline" "$target"
update_package_json_commit "$side"
if [ "$(jq -r '.subtree.commit' "$PACKAGE_JSON")" != "$side" ] ||
   [ "$(jq -r '.subtree.syncBase' "$PACKAGE_JSON")" != "$baseline" ] ||
   [ "$(jq -r '.subtree.syncTarget' "$PACKAGE_JSON")" != "$target" ]; then
  echo 'The original sync range was not preserved in package tracking' >&2
  exit 1
fi

# An older side branch can become reachable while conflict resolution is
# paused. Its commit then sorts before the checkpoint in the expanded range.
advanced_fixture="$fixture/advanced"
git init -q -b main "$advanced_fixture"
cd "$advanced_fixture"
git config user.name 'Subtree Test'
git config user.email 'subtree-test@example.com'
git config core.hooksPath /dev/null

printf 'base\n' > base.txt
git add base.txt
GIT_AUTHOR_DATE=2020-01-01T00:00:00Z GIT_COMMITTER_DATE=2020-01-01T00:00:00Z git commit -qm 'base'
advanced_base=$(git rev-parse HEAD)

git switch -qc older_side
printf 'older\n' > older.txt
git add older.txt
GIT_AUTHOR_DATE=2020-01-02T00:00:00Z GIT_COMMITTER_DATE=2020-01-02T00:00:00Z git commit -qm 'older side'
older_side=$(git rev-parse HEAD)

git switch -q main
printf 'main\n' > main.txt
git add main.txt
GIT_AUTHOR_DATE=2020-01-04T00:00:00Z GIT_COMMITTER_DATE=2020-01-04T00:00:00Z git commit -qm 'main change'

git switch -qc first_side "$advanced_base"
printf 'first\n' > first.txt
git add first.txt
GIT_AUTHOR_DATE=2020-01-05T00:00:00Z GIT_COMMITTER_DATE=2020-01-05T00:00:00Z git commit -qm 'first side'
first_side=$(git rev-parse HEAD)

git switch -q main
GIT_AUTHOR_DATE=2020-01-06T00:00:00Z GIT_COMMITTER_DATE=2020-01-06T00:00:00Z git merge -q --no-ff first_side -m 'merge first side'
pinned_target=$(git rev-parse HEAD)

PACKAGE_JSON="$advanced_fixture/package.json"
printf '{"subtree":{"commit":"%s"}}\n' "$advanced_base" > "$PACKAGE_JSON"
SYNC_BASE_COMMIT="$advanced_base"
SYNC_TARGET_COMMIT="$pinned_target"
pin_upstream_sync_target "$advanced_base" "$pinned_target"
update_package_json_commit "$first_side"

GIT_AUTHOR_DATE=2020-01-07T00:00:00Z GIT_COMMITTER_DATE=2020-01-07T00:00:00Z git merge -q --no-ff older_side -m 'merge older side'
advanced_target=$(git rev-parse HEAD)
expanded=$(git rev-list --no-merges --reverse "$advanced_base..$advanced_target")
if [ "$(printf '%s\n' "$expanded" | head -n 1)" != "$older_side" ] ||
   [ -n "$(remaining_upstream_commits "$advanced_base" "$first_side" "$advanced_target")" ]; then
  echo 'Fixture did not reproduce the skipped side commit' >&2
  exit 1
fi

resolve_upstream_target_commit "$(jq -r '.subtree.syncTarget' "$PACKAGE_JSON")" ''
if [ "$TARGET_COMMIT" != "$pinned_target" ] ||
   [ -n "$(remaining_upstream_commits "$advanced_base" "$first_side" "$TARGET_COMMIT")" ]; then
  echo 'Resume did not stay on the original upstream target' >&2
  exit 1
fi
if [ "$(remaining_upstream_commits "$pinned_target" "$pinned_target" "$advanced_target")" != "$older_side" ]; then
  echo 'The later side commit was not left for the next sync' >&2
  exit 1
fi

echo 'Subtree progress regression test passed'
