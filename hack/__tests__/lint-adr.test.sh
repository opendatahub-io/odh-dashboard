#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HACK="$(cd "$SCRIPT_DIR/.." && pwd)"
FIX="$SCRIPT_DIR/fixtures"

pass=0
fail=0

run_linter() {
  local script="$1"
  local scenario="$2"
  local code=0
  ADR_DIR="$FIX/$scenario" node "$HACK/$script" >/dev/null 2>&1 || code=$?
  echo "$code"
}

assert_eq() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $label"
    pass=$((pass + 1))
  else
    echo "  ✗ $label"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    fail=$((fail + 1))
  fi
}

check() {
  local scenario="$1"
  local expect_status="$2"
  local expect_numbers="$3"
  local expect_frontmatter="$4"

  echo "$scenario:"
  local actual_status
  local actual_numbers
  local actual_frontmatter
  actual_status=$(run_linter lint-adr-status "$scenario")
  actual_numbers=$(run_linter lint-adr-numbers "$scenario")
  actual_frontmatter=$(run_linter lint-adr-frontmatter "$scenario")

  assert_eq "lint-adr-status" "$expect_status" "$actual_status"
  assert_eq "lint-adr-numbers" "$expect_numbers" "$actual_numbers"
  assert_eq "lint-adr-frontmatter" "$expect_frontmatter" "$actual_frontmatter"
}

echo "=== ADR Linter Tests ==="
echo ""

check "valid" 0 0 0
check "invalid-status-value" 1 0 1
check "malformed-yaml" 0 0 1
check "missing-title" 0 0 1
check "missing-status" 0 0 1
check "status-mismatch" 0 0 1
check "bad-filename" 0 1 0
check "duplicate-number" 0 1 0
check "missing-frontmatter" 0 0 1

echo ""
echo "=== Results: $pass passed, $fail failed ==="
[ "$fail" -eq 0 ] || exit 1
