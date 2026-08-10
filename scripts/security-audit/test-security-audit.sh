#!/usr/bin/env bash
# Fixture tests for scripts/security-audit/*. Run: ./scripts/security-audit/test-security-audit.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
SCRIPTS=scripts/security-audit
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "PASS: $*"; }

# --- encode-audit-path: no collision between a/b and a.b ---
A=$("$SCRIPTS/encode-audit-path.sh" 'a/b')
B=$("$SCRIPTS/encode-audit-path.sh" 'a.b')
[[ "$A" != "$B" ]] || fail "SAFE_DIR collision a/b vs a.b ($A)"
[[ "$A" == 'a__b' ]] || fail "expected a__b got $A"
pass "encode-audit-path distinct"

# --- npm error JSON is not clean ---
echo '{"error":{"code":"ENOAUDIT","summary":"registry down"}}' > "$TMP/npm-err.json"
OUT=$("$SCRIPTS/summarize-npm-audit.sh" . prod "$TMP/npm-err.json")
echo "$OUT" | jq -e '.status == "error"' >/dev/null || fail "npm error JSON should be status=error"
echo "$OUT" | jq -e '.findings | length == 0' >/dev/null || fail "npm error should have no findings"
pass "npm error JSON → error"

# --- npm clean report ---
echo '{"auditReportVersion":2,"vulnerabilities":{}}' > "$TMP/npm-ok.json"
OUT=$("$SCRIPTS/summarize-npm-audit.sh" . prod "$TMP/npm-ok.json")
echo "$OUT" | jq -e '.status == "ok"' >/dev/null || fail "empty vulns should be ok"
pass "npm empty vulns → ok"

# --- npm major bucket ---
cat > "$TMP/npm-major.json" <<'EOF'
{
  "auditReportVersion": 2,
  "vulnerabilities": {
    "foo": {
      "name": "foo",
      "severity": "high",
      "isDirect": true,
      "via": [{"url": "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz", "title": "x"}],
      "fixAvailable": {"name": "foo", "version": "2.0.0", "isSemVerMajor": true},
      "effects": [],
      "range": "<2.0.0",
      "nodes": []
    }
  }
}
EOF
OUT=$("$SCRIPTS/summarize-npm-audit.sh" packages/x/frontend prod "$TMP/npm-major.json")
echo "$OUT" | jq -e '.findings[0].bucket == "major"' >/dev/null || fail "expected major bucket"
pass "npm major bucket"

# --- govulncheck keeps findings when error overlay set ---
printf '%s\n' \
  '{"osv":{"id":"GO-2024-TEST","affected":[{"ranges":[{"type":"SEMVER","events":[{"introduced":"0"},{"fixed":"1.2.3"}]}]}]}}' \
  '{"finding":{"osv":"GO-2024-TEST"}}' \
  > "$TMP/go.json"
OUT=$("$SCRIPTS/summarize-govulncheck.sh" packages/maas/bff "$TMP/go.json" "govulncheck failed (exit 1)")
echo "$OUT" | jq -e '.status == "error"' >/dev/null || fail "go overlay should be error"
echo "$OUT" | jq -e '.findings | length == 1' >/dev/null || fail "go should keep findings on error"
echo "$OUT" | jq -e '.findings[0].fixVersion == "1.2.3"' >/dev/null || fail "go fixed version missing"
pass "govulncheck error keeps findings"

# --- render: expected dir gap refuses clean ---
mkdir -p "$TMP/arts"
echo '{"dir":".","mode":"prod","status":"ok","error":null,"findings":[]}' > "$TMP/arts/summary-prod.json"
echo '{"dir":".","mode":"devdep","status":"ok","error":null,"findings":[]}' > "$TMP/arts/summary-devdep.json"
# missing go for packages/maas/bff
node "$SCRIPTS/render-security-audit-report.js" \
  --artifacts-dir "$TMP/arts" \
  --expected-npm '["."]' \
  --expected-go '["packages/maas/bff"]' \
  --out-dir "$TMP/out1" \
  --run-url https://example.test/run/1 \
  --scanned-at 2026-08-10T00:00:00Z
jq -e '.clean == false' "$TMP/out1/meta.json" >/dev/null || fail "missing go summary must not be clean"
jq -e '.counts.errors >= 1' "$TMP/out1/meta.json" >/dev/null || fail "expected reconcile errors"
pass "missing expected dir → not clean"

# --- render: npm error payload via summarizer then render ---
mkdir -p "$TMP/arts2"
"$SCRIPTS/summarize-npm-audit.sh" . prod "$TMP/npm-err.json" > "$TMP/arts2/summary-prod-root.json"
"$SCRIPTS/summarize-npm-audit.sh" . devdep "$TMP/npm-ok.json" > "$TMP/arts2/summary-devdep-root.json"
node "$SCRIPTS/render-security-audit-report.js" \
  --artifacts-dir "$TMP/arts2" \
  --expected-npm '["."]' \
  --expected-go '[]' \
  --out-dir "$TMP/out2" \
  --run-url https://example.test/run/2
jq -e '.clean == false' "$TMP/out2/meta.json" >/dev/null || fail "npm scanner error must not be clean"
pass "npm scanner error → not clean"

# --- matchDependabotPr word boundary ---
node -e '
const { matchDependabotPr } = require("./scripts/security-audit/render-security-audit-report.js");
const prs = [
  { number: 1, title: "Update dependency react-router-dom to v6", url: "http://x/1" },
  { number: 2, title: "Update dependency react to v18", url: "http://x/2" },
];
const hit = matchDependabotPr({ name: "react" }, prs);
if (!hit || hit.number !== 2) { console.error("expected react → #2 got", hit); process.exit(1); }
const miss = matchDependabotPr({ name: "lodash" }, prs);
if (miss) { console.error("expected no match", miss); process.exit(1); }
'
pass "Dependabot title word-boundary match"

# --- discover dirs ---
DIRS=$("$SCRIPTS/discover-dependabot-dirs.sh" .github/dependabot.yml)
echo "$DIRS" | jq -e '.npm | length == 9' >/dev/null || fail "expected 9 npm dirs"
echo "$DIRS" | jq -e '.gomod | length == 9' >/dev/null || fail "expected 9 go dirs"
pass "discover 9+9"

echo "All security-audit fixture tests passed."
