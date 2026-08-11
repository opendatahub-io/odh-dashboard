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

# --- govulncheck: OSV severity array must not abort jq ---
printf '%s\n' \
  '{"osv":{"id":"GO-2024-SEV","severity":[{"type":"CVSS_V3","score":"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"}],"affected":[{"ranges":[{"type":"SEMVER","events":[{"introduced":"0"},{"fixed":"1.9.1"},{"fixed":"1.10.0"}]}]}]}}' \
  '{"finding":{"osv":"GO-2024-SEV"}}' \
  > "$TMP/go-sev.json"
OUT=$("$SCRIPTS/summarize-govulncheck.sh" packages/maas/bff "$TMP/go-sev.json")
echo "$OUT" | jq -e '.status == "ok"' >/dev/null || fail "severity array should still summarize"
echo "$OUT" | jq -e '.findings[0].severity == "unknown"' >/dev/null || fail "expected unknown severity for CVSS array"
echo "$OUT" | jq -e '.findings[0].fixVersion == "1.9.1"' >/dev/null || fail "expected lowest semver fixed 1.9.1, got $(echo "$OUT" | jq -r '.findings[0].fixVersion')"
pass "govulncheck severity array + semver sort"

# --- aggregate EXTRA_ERRS join (mirrors workflow snippet) ---
EXTRA_ERRS=("npm-audit job result=failure" "govulncheck job result=cancelled")
ERR_TEXT=$(printf '%s; ' "${EXTRA_ERRS[@]}")
ERR_TEXT=${ERR_TEXT%; }
AGG=$(jq -n \
  --arg dir "." \
  --arg mode "aggregate" \
  --arg error "$ERR_TEXT" \
  '{dir:$dir, mode:$mode, status:"error", error:$error, findings:[]}')
echo "$AGG" | jq -e '.status == "error"' >/dev/null || fail "aggregate must be error"
echo "$AGG" | jq -e '.error | contains("npm-audit") and contains("govulncheck")' >/dev/null \
  || fail "aggregate error text missing job results"
pass "aggregate EXTRA_ERRS → error status"

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

# --- matchDependabotPr word boundary + safe advisory URLs ---
node -e '
const { matchDependabotPr, advisoryLinks } = require("./scripts/security-audit/render-security-audit-report.js");
const prs = [
  { number: 1, title: "Update dependency react-router-dom to v6", url: "http://x/1" },
  { number: 2, title: "Update dependency react to v18", url: "http://x/2" },
];
const hit = matchDependabotPr({ name: "react" }, prs);
if (!hit || hit.number !== 2) { console.error("expected react → #2 got", hit); process.exit(1); }
const miss = matchDependabotPr({ name: "lodash" }, prs);
if (miss) { console.error("expected no match", miss); process.exit(1); }
const bad = advisoryLinks(["javascript:alert(1)", "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz"]);
if (!bad.includes("GHSA-xxxx-yyyy-zzzz") || bad.includes("javascript:")) {
  console.error("expected safe advisory links, got", bad); process.exit(1);
}
'
pass "Dependabot title match + safe advisory URLs"

# --- discover dirs (contract, not hardcoded counts) ---
DIRS=$("$SCRIPTS/discover-dependabot-dirs.sh" .github/dependabot.yml)
echo "$DIRS" | jq -e '.npm | length > 0' >/dev/null || fail "expected at least one npm dir"
echo "$DIRS" | jq -e '.gomod | length > 0' >/dev/null || fail "expected at least one gomod dir"
echo "$DIRS" | jq -e '[.npm[], .gomod[]] | all(startswith("/") | not)' >/dev/null \
  || fail "dirs must be repo-relative (no leading /)"
echo "$DIRS" | jq -e '[.npm[], .gomod[]] | all(. != "")' >/dev/null \
  || fail "empty dir entry emitted"
pass "discover emits normalized repo-relative dirs"

# --- discover: '/' normalizes to '.' ---
cat > "$TMP/dependabot.yml" <<'EOF'
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule: { interval: weekly }
  - package-ecosystem: gomod
    directory: "/svc"
    schedule: { interval: weekly }
EOF
NORM=$("$SCRIPTS/discover-dependabot-dirs.sh" "$TMP/dependabot.yml")
echo "$NORM" | jq -e '.npm == ["."] and .gomod == ["svc"]' >/dev/null \
  || fail "expected root '/' → '.' and '/svc' → 'svc', got $NORM"
pass "discover normalizes directories"

echo "All security-audit fixture tests passed."
