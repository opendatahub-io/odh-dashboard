#!/usr/bin/env bash
# Unit tests for classify-prior-threads.sh
# Run: bash .claude/skills/preflight/scripts/tests/classify-prior-threads.test.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLASSIFY="$SCRIPT_DIR/../classify-prior-threads.sh"

pass=0
fail=0

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

echo "=== classify-prior-threads.sh tests ==="

# ---------- Test 1: Empty input ----------
echo "Test 1: Empty input returns empty arrays"
result=$(echo '[]' | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
other_count=$(echo "$result" | jq '.other_threads | length')
assert_eq "preflight_threads empty" "0" "$pf_count"
assert_eq "other_threads empty" "0" "$other_count"

# ---------- Test 2: Non-preflight thread passes through ----------
echo "Test 2: Non-preflight thread goes to other_threads"
input='[{
  "author": "user1",
  "path": "src/foo.tsx",
  "line": 10,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "This could be improved",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
other_count=$(echo "$result" | jq '.other_threads | length')
assert_eq "no preflight threads" "0" "$pf_count"
assert_eq "one other thread" "1" "$other_count"

# ---------- Test 3: Preflight thread with no replies ----------
echo "Test 3: Preflight thread with no replies → no_reply"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "_🟡 Minor_ · _Style review_\n\n**Use PF token instead of hardcoded color.**",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "disposition is no_reply" "no_reply" "$disposition"

# ---------- Test 4: Preflight thread with author reply ----------
echo "Test 4: Preflight thread with author reply → author_replied"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 2,
  "first_comment": "_🟠 Major_ · _Claude review_\n\n**Missing null check.**",
  "replies": [{"author": "prauthor", "body": "This is intentional, the value is guaranteed non-null here."}]
}]'
result=$(echo "$input" | "$CLASSIFY" --pr-author prauthor)
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "disposition is author_replied" "author_replied" "$disposition"

# ---------- Test 5: Bot-only reply treated as no_reply ----------
echo "Test 5: Preflight thread with bot-only reply → no_reply"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 2,
  "first_comment": "_🔴 Critical_ · _RBAC review_\n\n**Missing SSAR check.**",
  "replies": [{"author": "some-bot[bot]", "body": "Automated response"}]
}]'
result=$(echo "$input" | "$CLASSIFY" --pr-author prauthor)
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "disposition is no_reply (bot reply ignored)" "no_reply" "$disposition"

# ---------- Test 6: Non-author human reply ----------
echo "Test 6: Preflight thread with non-author human reply → reviewer_replied"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 2,
  "first_comment": "_🟡 Minor_ · _Claude review_\n\n**Consider using const.**",
  "replies": [{"author": "reviewer1", "body": "I agree with this suggestion"}]
}]'
result=$(echo "$input" | "$CLASSIFY" --pr-author prauthor)
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "disposition is reviewer_replied" "reviewer_replied" "$disposition"

# ---------- Test 7: Mixed threads ----------
echo "Test 7: Mixed threads are correctly separated"
input='[
  {
    "author": "github-actions[bot]",
    "path": "src/a.tsx",
    "line": 10,
    "is_coderabbit": false,
    "comment_count": 1,
    "first_comment": "_🟡 Minor_ · _Style review_\n\n**Issue A**",
    "replies": []
  },
  {
    "author": "human-reviewer",
    "path": "src/b.tsx",
    "line": 20,
    "is_coderabbit": false,
    "comment_count": 1,
    "first_comment": "Please fix this typo",
    "replies": []
  },
  {
    "author": "github-actions[bot]",
    "path": "src/c.tsx",
    "line": 30,
    "is_coderabbit": false,
    "comment_count": 2,
    "first_comment": "_🔴 Critical_ · _Claude review_\n\n**Security issue**",
    "replies": [{"author": "prauthor", "body": "Fixed in latest commit"}]
  }
]'
result=$(echo "$input" | "$CLASSIFY" --pr-author prauthor)
pf_count=$(echo "$result" | jq '.preflight_threads | length')
other_count=$(echo "$result" | jq '.other_threads | length')
pf_dispositions=$(echo "$result" | jq -r '[.preflight_threads[].disposition] | join(",")')
assert_eq "two preflight threads" "2" "$pf_count"
assert_eq "one other thread" "1" "$other_count"
assert_eq "dispositions correct" "no_reply,author_replied" "$pf_dispositions"

# ---------- Test 8: Nit severity recognized ----------
echo "Test 8: Nit severity is recognized as preflight"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 5,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "_🧹 Nit_ · _Style review_\n\n**Prefer const.**",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
assert_eq "nit recognized as preflight" "1" "$pf_count"

# ---------- Test 9: Nitpick variant recognized ----------
echo "Test 9: Nitpick variant is recognized as preflight"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 5,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "_🧹 Nitpick_ · _Claude review_\n\n**Minor style issue.**",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
assert_eq "nitpick recognized as preflight" "1" "$pf_count"

# ---------- Test 10: Without --pr-author ----------
echo "Test 10: Without --pr-author, human replies → reviewer_replied"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 2,
  "first_comment": "_🟡 Minor_ · _Claude review_\n\n**Use const.**",
  "replies": [{"author": "anyone", "body": "Not applicable"}]
}]'
result=$(echo "$input" | "$CLASSIFY")
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "disposition is reviewer_replied without --pr-author" "reviewer_replied" "$disposition"

# ---------- Test 11: CodeRabbit threads are not preflight ----------
echo "Test 11: CodeRabbit threads are not preflight"
input='[{
  "author": "coderabbitai[bot]",
  "path": "src/foo.tsx",
  "line": 10,
  "is_coderabbit": true,
  "comment_count": 1,
  "first_comment": "## Suggestion\nConsider using a more descriptive name.",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
other_count=$(echo "$result" | jq '.other_threads | length')
assert_eq "not a preflight thread" "0" "$pf_count"
assert_eq "goes to other_threads" "1" "$other_count"

# ---------- Test 12: Author reply takes precedence over reviewer reply ----------
echo "Test 12: Author reply takes precedence when both author and reviewer replied"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 3,
  "first_comment": "_🟡 Minor_ · _Style review_\n\n**Use const.**",
  "replies": [
    {"author": "reviewer1", "body": "Good point"},
    {"author": "prauthor", "body": "Not applicable here"}
  ]
}]'
result=$(echo "$input" | "$CLASSIFY" --pr-author prauthor)
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "author_replied takes precedence" "author_replied" "$disposition"

# ---------- Test 13: non_bot_replies correctly filters bots ----------
echo "Test 13: non_bot_replies excludes bot authors"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 3,
  "first_comment": "_🟡 Minor_ · _Style review_\n\n**Use const.**",
  "replies": [
    {"author": "dependabot[bot]", "body": "auto reply"},
    {"author": "human-user", "body": "real reply"}
  ]
}]'
result=$(echo "$input" | "$CLASSIFY")
non_bot_count=$(echo "$result" | jq '.preflight_threads[0].non_bot_replies | length')
assert_eq "one non-bot reply" "1" "$non_bot_count"

# ---------- Test 14: path and line preserved in output ----------
echo "Test 14: path and line are preserved in classified output"
input='[{
  "author": "github-actions[bot]",
  "path": "frontend/src/components/Foo.tsx",
  "line": 99,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "_🟠 Major_ · _RBAC review_\n\n**Missing permission check.**",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
path=$(echo "$result" | jq -r '.preflight_threads[0].path')
line=$(echo "$result" | jq '.preflight_threads[0].line')
assert_eq "path preserved" "frontend/src/components/Foo.tsx" "$path"
assert_eq "line preserved" "99" "$line"

# ---------- Test 15: --pr-author with missing value exits with error ----------
echo "Test 15: --pr-author with missing value exits with error"
if echo '[]' | "$CLASSIFY" --pr-author 2>/dev/null; then
  echo "  ✗ should have exited with error"
  fail=$((fail + 1))
else
  echo "  ✓ exits with error for missing --pr-author value"
  pass=$((pass + 1))
fi

# ---------- Test 16: Null first_comment treated as non-preflight ----------
echo "Test 16: Null first_comment treated as non-preflight"
input='[{
  "author": "user1",
  "path": "src/foo.tsx",
  "line": 10,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": null,
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
other_count=$(echo "$result" | jq '.other_threads | length')
assert_eq "null first_comment not preflight" "0" "$pf_count"
assert_eq "null first_comment goes to other" "1" "$other_count"

# ---------- Test 17: Null replies treated as empty ----------
echo "Test 17: Null replies treated as empty array"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "_🟡 Minor_ · _Style review_\n\n**Use const.**",
  "replies": null
}]'
result=$(echo "$input" | "$CLASSIFY")
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
non_bot_count=$(echo "$result" | jq '.preflight_threads[0].non_bot_replies | length')
assert_eq "null replies → no_reply" "no_reply" "$disposition"
assert_eq "null replies → 0 non_bot_replies" "0" "$non_bot_count"

# ---------- Test 18: Null author in reply handled gracefully ----------
echo "Test 18: Null author in reply handled gracefully"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 2,
  "first_comment": "_🟡 Minor_ · _Style review_\n\n**Use const.**",
  "replies": [{"author": null, "body": "some reply"}]
}]'
result=$(echo "$input" | "$CLASSIFY")
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
non_bot_count=$(echo "$result" | jq '.preflight_threads[0].non_bot_replies | length')
assert_eq "null author reply is non-bot" "1" "$non_bot_count"
assert_eq "null author → reviewer_replied" "reviewer_replied" "$disposition"

# ---------- Test 19: Missing replies key treated as empty ----------
echo "Test 19: Missing replies key treated as empty array"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "_🟠 Major_ · _Claude review_\n\n**Missing check.**"
}]'
result=$(echo "$input" | "$CLASSIFY")
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "missing replies → no_reply" "no_reply" "$disposition"

# ---------- Test 20: Badge mid-text does NOT match as preflight ----------
echo "Test 20: Badge pattern mid-text is not classified as preflight"
input='[{
  "author": "user1",
  "path": "src/foo.tsx",
  "line": 10,
  "is_coderabbit": false,
  "comment_count": 1,
  "first_comment": "I noticed the comment had _🟡 Minor_ · _Style review_ badge in it",
  "replies": []
}]'
result=$(echo "$input" | "$CLASSIFY")
pf_count=$(echo "$result" | jq '.preflight_threads | length')
other_count=$(echo "$result" | jq '.other_threads | length')
assert_eq "mid-text badge not preflight" "0" "$pf_count"
assert_eq "mid-text badge goes to other" "1" "$other_count"

# ---------- Test 21: Bot PR author reply classified as author_replied ----------
echo "Test 21: Bot PR author reply is author_replied, not no_reply"
input='[{
  "author": "github-actions[bot]",
  "path": "src/foo.tsx",
  "line": 42,
  "is_coderabbit": false,
  "comment_count": 2,
  "first_comment": "_🟡 Minor_ · _Style review_\n\n**Use const.**",
  "replies": [{"author": "renovate[bot]", "body": "This dependency is pinned intentionally"}]
}]'
result=$(echo "$input" | "$CLASSIFY" --pr-author 'renovate[bot]')
disposition=$(echo "$result" | jq -r '.preflight_threads[0].disposition')
assert_eq "bot pr-author reply → author_replied" "author_replied" "$disposition"

echo ""
echo "=== Results: $pass passed, $fail failed ==="
[ "$fail" -eq 0 ] || exit 1
