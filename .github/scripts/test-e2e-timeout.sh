#!/usr/bin/env bash
# Tests for the dynamic e2e timeout formula used in cypress-e2e-test.yml.
# Run: bash .github/scripts/test-e2e-timeout.sh
set -euo pipefail

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# The jq expression under test — keep in sync with cypress-e2e-test.yml "Build test matrix" step
MAX_TIMEOUT=360
compute_timeout() {
  echo "$1" | jq -c --argjson cap "$MAX_TIMEOUT" '[.[] | {tag: ., timeout: [30 + 7 * (split(" ") | length), $cap] | min}]'
}

# --- Single tag: 30 + 7*1 = 37 ---
OUT=$(compute_timeout '["@ci-dashboard-regression-tags"]')
echo "$OUT" | jq -e '.[0].timeout == 37' >/dev/null || fail "single tag should be 37, got $(echo "$OUT" | jq '.[0].timeout')"
echo "$OUT" | jq -e '.[0].tag == "@ci-dashboard-regression-tags"' >/dev/null || fail "tag value mismatch"
pass "single tag (@ci-dashboard-regression-tags) -> 37 min"

# --- Single label-based tag: 30 + 7*1 = 37 ---
OUT=$(compute_timeout '["@Pipelines"]')
echo "$OUT" | jq -e '.[0].timeout == 37' >/dev/null || fail "single label tag should be 37, got $(echo "$OUT" | jq '.[0].timeout')"
pass "single label tag (@Pipelines) -> 37 min"

# --- Two tags: 30 + 7*2 = 44 ---
OUT=$(compute_timeout '["@TagA @TagB"]')
echo "$OUT" | jq -e '.[0].timeout == 44' >/dev/null || fail "two tags should be 44, got $(echo "$OUT" | jq '.[0].timeout')"
pass "two tags -> 44 min"

# --- 22 tags (auto-detected consolidation): 30 + 7*22 = 184 ---
TAGS_22=$(printf '@T%d ' $(seq 1 22) | sed 's/ $//')
OUT=$(compute_timeout "[\"$TAGS_22\"]")
echo "$OUT" | jq -e '.[0].timeout == 184' >/dev/null || fail "22 tags should be 184, got $(echo "$OUT" | jq '.[0].timeout')"
pass "22 tags -> 184 min"

# --- Mixed matrix: single + multi-tag entries ---
OUT=$(compute_timeout '["@ci-dashboard-regression-tags", "@TagA @TagB @TagC"]')
echo "$OUT" | jq -e 'length == 2' >/dev/null || fail "mixed matrix should have 2 entries"
echo "$OUT" | jq -e '.[0].timeout == 37' >/dev/null || fail "first entry should be 37"
echo "$OUT" | jq -e '.[1].timeout == 51' >/dev/null || fail "second entry should be 51 (30+7*3), got $(echo "$OUT" | jq '.[1].timeout')"
pass "mixed matrix -> [37, 51]"

# --- Empty array: produces empty array ---
OUT=$(compute_timeout '[]')
echo "$OUT" | jq -e 'length == 0' >/dev/null || fail "empty input should produce empty array"
pass "empty array -> []"

# --- At the cap boundary: 47 tags → 30 + 7*47 = 359 (just under cap) ---
TAGS_47=$(printf '@T%d ' $(seq 1 47) | sed 's/ $//')
OUT=$(compute_timeout "[\"$TAGS_47\"]")
echo "$OUT" | jq -e '.[0].timeout == 359' >/dev/null || fail "47 tags should be 359 (under cap), got $(echo "$OUT" | jq '.[0].timeout')"
pass "47 tags -> 359 min (just under cap)"

# --- Exactly at cap: 48 tags → 30 + 7*48 = 366, capped to 360 ---
TAGS_48=$(printf '@T%d ' $(seq 1 48) | sed 's/ $//')
OUT=$(compute_timeout "[\"$TAGS_48\"]")
echo "$OUT" | jq -e ".[0].timeout == $MAX_TIMEOUT" >/dev/null || fail "48 tags should be capped at $MAX_TIMEOUT, got $(echo "$OUT" | jq '.[0].timeout')"
pass "48 tags -> $MAX_TIMEOUT min (capped)"

# --- Well above cap: 100 tags → 30 + 7*100 = 730, capped to 360 ---
TAGS_100=$(printf '@T%d ' $(seq 1 100) | sed 's/ $//')
OUT=$(compute_timeout "[\"$TAGS_100\"]")
echo "$OUT" | jq -e ".[0].timeout == $MAX_TIMEOUT" >/dev/null || fail "100 tags should be capped at $MAX_TIMEOUT, got $(echo "$OUT" | jq '.[0].timeout')"
pass "100 tags -> $MAX_TIMEOUT min (capped)"

echo ""
echo "All tests passed."
