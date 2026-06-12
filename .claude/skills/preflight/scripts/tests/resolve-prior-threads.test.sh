#!/usr/bin/env bash
# Unit tests for resolve-prior-threads.sh
# Run: bash .claude/skills/preflight/scripts/tests/resolve-prior-threads.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOLVE="$SCRIPT_DIR/../resolve-prior-threads.sh"

pass=0
fail=0
tmpdir=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $test_name"
    pass=$((pass + 1))
  else
    echo "  ✗ $test_name"
    echo "    expected: $expected"
    echo "    actual:   $actual"
    fail=$((fail + 1))
  fi
}

setup_git_repo() {
  tmpdir=$(mktemp -d)
  cd "$tmpdir"
  git init -q
  git config user.email "test@test.com"
  git config user.name "Test"

  # Create mock gh script that records calls
  mkdir -p "$tmpdir/bin"
  cat > "$tmpdir/bin/gh" << 'MOCK_GH'
#!/usr/bin/env bash
echo "$@" >> "$GH_CALL_LOG"
echo '{}'
MOCK_GH
  chmod +x "$tmpdir/bin/gh"
  export PATH="$tmpdir/bin:$PATH"
  export GH_CALL_LOG="$tmpdir/gh_calls.log"
  : > "$GH_CALL_LOG"
}

teardown() {
  if [ -n "$tmpdir" ] && [ -d "$tmpdir" ]; then
    rm -rf "$tmpdir"
  fi
}

trap teardown EXIT

echo "=== resolve-prior-threads.sh tests ==="

# ---------- Test 1: Empty preflight_threads ----------
echo "Test 1: Empty preflight_threads returns empty arrays"
setup_git_repo
echo "init" > file.txt && git add file.txt && git commit -q -m "init"

input='{"preflight_threads": [], "other_threads": []}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
resolved_count=$(echo "$result" | jq '.resolved | length')
skipped_count=$(echo "$result" | jq '.skipped | length')
assert_eq "resolved empty" "0" "$resolved_count"
assert_eq "skipped empty" "0" "$skipped_count"
teardown

# ---------- Test 2: Thread with author_replied → skipped ----------
echo "Test 2: author_replied disposition is skipped"
setup_git_repo
mkdir -p src && echo "init" > src/foo.tsx
git add -A && git commit -q -m "init"

input='{
  "preflight_threads": [{
    "thread_id": "TID1",
    "database_id": "123",
    "created_at": "2026-01-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": 10,
    "author": "github-actions[bot]",
    "first_comment": "_🟡 Minor_ · _Style review_\n\nUse PF token.",
    "disposition": "author_replied"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
skipped_count=$(echo "$result" | jq '.skipped | length')
skipped_reason=$(echo "$result" | jq -r '.skipped[0].reason')
assert_eq "one skipped" "1" "$skipped_count"
assert_eq "reason is disposition" "disposition: author_replied" "$skipped_reason"
gh_calls=$(cat "$GH_CALL_LOG" | wc -l | tr -d ' ')
assert_eq "no gh api calls" "0" "$gh_calls"
teardown

# ---------- Test 3: Thread with reviewer_replied → skipped ----------
echo "Test 3: reviewer_replied disposition is skipped"
setup_git_repo
mkdir -p src && echo "init" > src/foo.tsx
git add -A && git commit -q -m "init"

input='{
  "preflight_threads": [{
    "thread_id": "TID1",
    "database_id": "123",
    "created_at": "2026-01-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": 10,
    "author": "github-actions[bot]",
    "first_comment": "_🟡 Minor_ · _Style review_\n\nUse PF token.",
    "disposition": "reviewer_replied"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
skipped_reason=$(echo "$result" | jq -r '.skipped[0].reason')
assert_eq "reason is disposition" "disposition: reviewer_replied" "$skipped_reason"
teardown

# ---------- Test 4: Thread with null line → skipped ----------
echo "Test 4: Null line is skipped"
setup_git_repo
mkdir -p src && echo "init" > src/foo.tsx
git add -A && git commit -q -m "init"

input='{
  "preflight_threads": [{
    "thread_id": "TID1",
    "database_id": "123",
    "created_at": "2026-01-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": null,
    "author": "github-actions[bot]",
    "first_comment": "_🟡 Minor_ · _Style review_\n\nGeneral comment.",
    "disposition": "no_reply"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
skipped_reason=$(echo "$result" | jq -r '.skipped[0].reason')
assert_eq "reason is no line anchor" "no line anchor" "$skipped_reason"
teardown

# ---------- Test 5: File not modified since thread → skipped ----------
echo "Test 5: File not modified since thread posted → skipped"
setup_git_repo
mkdir -p src
# Commit file with a timestamp well in the past
echo "line1" > src/foo.tsx
git add -A && GIT_AUTHOR_DATE="2025-01-01T00:00:00Z" GIT_COMMITTER_DATE="2025-01-01T00:00:00Z" git commit -q -m "init"

input='{
  "preflight_threads": [{
    "thread_id": "TID1",
    "database_id": "123",
    "created_at": "2026-06-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": 1,
    "author": "github-actions[bot]",
    "first_comment": "_🟡 Minor_ · _Style review_\n\nUse PF token.",
    "disposition": "no_reply"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
skipped_reason=$(echo "$result" | jq -r '.skipped[0].reason')
assert_eq "reason is not modified" "file not modified since thread posted" "$skipped_reason"
teardown

# ---------- Test 6: File deleted → resolved ----------
echo "Test 6: File deleted → resolved"
setup_git_repo
mkdir -p src
echo "content" > src/foo.tsx
git add -A && GIT_AUTHOR_DATE="2025-01-01T00:00:00Z" GIT_COMMITTER_DATE="2025-01-01T00:00:00Z" git commit -q -m "add file"
git rm -q src/foo.tsx
GIT_AUTHOR_DATE="2026-06-02T00:00:00Z" GIT_COMMITTER_DATE="2026-06-02T00:00:00Z" git commit -q -m "delete file"

input='{
  "preflight_threads": [{
    "thread_id": "TID_DEL",
    "database_id": "456",
    "created_at": "2026-06-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": 1,
    "author": "github-actions[bot]",
    "first_comment": "_🔴 Critical_ · _Claude review_\n\nSecurity issue.",
    "disposition": "no_reply"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
resolved_count=$(echo "$result" | jq '.resolved | length')
resolved_reason=$(echo "$result" | jq -r '.resolved[0].reason')
assert_eq "one resolved" "1" "$resolved_count"
assert_eq "reason is file deleted" "file deleted" "$resolved_reason"
# Should have called gh api twice (reply + resolve)
gh_calls=$(wc -l < "$GH_CALL_LOG" | tr -d ' ')
assert_eq "gh api called (reply + resolve)" "true" "$([ "$gh_calls" -ge 2 ] && echo true || echo false)"
teardown

# ---------- Test 7: Line modified → resolved ----------
echo "Test 7: Line modified after thread → resolved"
setup_git_repo
mkdir -p src

# Create file with multiple lines, commit before thread
for i in $(seq 1 20); do echo "line $i" >> src/foo.tsx; done
git add -A && GIT_AUTHOR_DATE="2025-12-01T00:00:00Z" GIT_COMMITTER_DATE="2025-12-01T00:00:00Z" git commit -q -m "initial"

# Modify line 10 after the thread was posted
sed -i.bak '10s/.*/modified line 10/' src/foo.tsx && rm -f src/foo.tsx.bak
git add -A && GIT_AUTHOR_DATE="2026-06-03T00:00:00Z" GIT_COMMITTER_DATE="2026-06-03T00:00:00Z" git commit -q -m "fix line 10"

input='{
  "preflight_threads": [{
    "thread_id": "TID_MOD",
    "database_id": "789",
    "created_at": "2026-06-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": 10,
    "author": "github-actions[bot]",
    "first_comment": "_🟠 Major_ · _RBAC review_\n\nMissing SSAR check.",
    "disposition": "no_reply"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
resolved_count=$(echo "$result" | jq '.resolved | length')
resolved_reason=$(echo "$result" | jq -r '.resolved[0].reason')
assert_eq "one resolved" "1" "$resolved_count"
assert_eq "reason contains line modified" "true" "$(echo "$resolved_reason" | grep -q 'line modified' && echo true || echo false)"
teardown

# ---------- Test 8: Line NOT in modified hunk → skipped ----------
echo "Test 8: Different line modified → thread skipped"
setup_git_repo
mkdir -p src

for i in $(seq 1 20); do echo "line $i" >> src/foo.tsx; done
git add -A && GIT_AUTHOR_DATE="2025-12-01T00:00:00Z" GIT_COMMITTER_DATE="2025-12-01T00:00:00Z" git commit -q -m "initial"

# Modify line 1 but thread is on line 15
sed -i.bak '1s/.*/modified line 1/' src/foo.tsx && rm -f src/foo.tsx.bak
git add -A && GIT_AUTHOR_DATE="2026-06-03T00:00:00Z" GIT_COMMITTER_DATE="2026-06-03T00:00:00Z" git commit -q -m "fix line 1"

input='{
  "preflight_threads": [{
    "thread_id": "TID_NOTHUNK",
    "database_id": "101",
    "created_at": "2026-06-01T00:00:00Z",
    "path": "src/foo.tsx",
    "line": 15,
    "author": "github-actions[bot]",
    "first_comment": "_🟡 Minor_ · _Style review_\n\nUse PF token.",
    "disposition": "no_reply"
  }],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
skipped_count=$(echo "$result" | jq '.skipped | length')
skipped_reason=$(echo "$result" | jq -r '.skipped[0].reason')
assert_eq "one skipped" "1" "$skipped_count"
assert_eq "reason is not in hunk" "line not in modified hunk" "$skipped_reason"
teardown

# ---------- Test 9: Mixed threads → correct resolution ----------
echo "Test 9: Mixed threads — resolved + skipped correctly"
setup_git_repo
mkdir -p src

for i in $(seq 1 20); do echo "line $i" >> src/foo.tsx; done
echo "other content" > src/bar.tsx
git add -A && GIT_AUTHOR_DATE="2025-12-01T00:00:00Z" GIT_COMMITTER_DATE="2025-12-01T00:00:00Z" git commit -q -m "initial"

# Modify line 5 of foo.tsx
sed -i.bak '5s/.*/modified line 5/' src/foo.tsx && rm -f src/foo.tsx.bak
git add -A && GIT_AUTHOR_DATE="2026-06-03T00:00:00Z" GIT_COMMITTER_DATE="2026-06-03T00:00:00Z" git commit -q -m "fix foo line 5"

input='{
  "preflight_threads": [
    {
      "thread_id": "TID_A", "database_id": "201",
      "created_at": "2026-06-01T00:00:00Z",
      "path": "src/foo.tsx", "line": 5,
      "author": "github-actions[bot]",
      "first_comment": "_🟡 Minor_ · _Style review_\n\nIssue on line 5.",
      "disposition": "no_reply"
    },
    {
      "thread_id": "TID_B", "database_id": "202",
      "created_at": "2026-06-01T00:00:00Z",
      "path": "src/bar.tsx", "line": 1,
      "author": "github-actions[bot]",
      "first_comment": "_🟠 Major_ · _Claude review_\n\nIssue on bar.",
      "disposition": "no_reply"
    },
    {
      "thread_id": "TID_C", "database_id": "203",
      "created_at": "2026-06-01T00:00:00Z",
      "path": "src/foo.tsx", "line": 18,
      "author": "github-actions[bot]",
      "first_comment": "_🔴 Critical_ · _RBAC review_\n\nDifferent line.",
      "disposition": "author_replied"
    }
  ],
  "other_threads": []
}'
result=$(echo "$input" | "$RESOLVE" owner repo 1)
resolved_count=$(echo "$result" | jq '.resolved | length')
skipped_count=$(echo "$result" | jq '.skipped | length')
assert_eq "one resolved (foo line 5)" "1" "$resolved_count"
assert_eq "two skipped (bar unmodified + foo author_replied)" "2" "$skipped_count"
teardown

# ---------- Summary ----------
echo ""
echo "=== Results: $pass passed, $fail failed ==="
[ "$fail" -eq 0 ] || exit 1
