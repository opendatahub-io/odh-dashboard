# Check Definitions

Each check runs in one of three contexts based on what's available. A check reports one status:

- ✅ **passed**
- ❌ **failed** — with details
- ⚠️ **warning** — passed with caveats
- ⏭️ **covered** — CI already ran this on the exact same commit
- ➖ **not applicable** — doesn't apply to this context

## Conflicts

Checks whether the branch can merge cleanly and is up to date.

| Context | How to check |
|---|---|
| PR synced | `mergeable` field from PR metadata |
| PR not synced | `mergeable` from PR + warn "local out of sync" |
| No PR | `git rev-list --count HEAD..origin/$base_branch` — 0 is ✅, >0 is ⚠️ |

## CI / Build / Lint / Type Check / Unit Tests

These checks are all discovered dynamically via `analyze-ci.sh`:

```bash
${CLAUDE_SKILL_DIR}/scripts/analyze-ci.sh "$owner" "$repo" "$pr_number"
```

The script returns three things:
- **pr_checks**: status of every CI check on the PR (name, bucket, link, timestamps)
- **failures**: for failed/cancelled checks, the job logs
- **local_workflows**: what CI workflows exist in `.github/workflows/` and what commands they run

**How to use this data:**

| Context | What to do |
|---|---|
| PR synced | Read `pr_checks`. Each check with `bucket: "pass"` → ⏭️. Each with `bucket: "fail"` → ❌ (use the failure logs). Each with `bucket: "pending"` → ⚠️ "still running". Report each check by name. |
| PR not synced | PR checks don't apply to this code. Read `local_workflows` to understand what CI *would* run, then run the equivalent commands locally on affected packages. |
| No PR | Same as not synced — read `local_workflows`, run locally. |

Don't hardcode check names. Let the script discover what exists and report what it finds. The LLM interprets which checks map to lint, type-check, tests, build, etc. from the workflow names and job commands.

## Reviews

Reviews are reported as separate rows in the results table, each with its source.

### CodeRabbit Reviews

| Context | How to check |
|---|---|
| PR (any) | Fetch threads via `fetch-review-threads.sh`, filter to `is_coderabbit == true`. Parse severity from comment body. |
| No PR + CR CLI ran | Results from Step 2 CodeRabbit CLI review |
| No PR + CR CLI not ran | ➖ "not run" |

Report: `CodeRabbit (PR)` or `CodeRabbit (local)` as the source. Unresolved critical/major → ❌. Minor only → ⚠️. None → ✅.

### Human Reviews

| Context | How to check |
|---|---|
| PR (any) | Fetch threads via `fetch-review-threads.sh`, filter to `is_coderabbit == false`. Also check `reviewDecision` from PR metadata. |
| No PR | ➖ "no PR — no human reviews" |

Report: `Human (PR)` as the source. Any unresolved threads → ❌. `CHANGES_REQUESTED` → ❌. `APPROVED` + no threads → ✅. `REVIEW_REQUIRED` → ⚠️.

### Style Review

| Context | How to check |
|---|---|
| PR + style review exists | Check if `/style-review` was run on the PR (look for style review threads) |
| No PR + style ran | Results from Step 2 style review |
| Not run | ➖ "not run" |

Report: `Style (local)` as the source.

### Claude Review

| Context | How to check |
|---|---|
| Ran in Step 2 | Results from `/review` invocation |
| Not run | ➖ "not run" |

Report: `Claude (local)` as the source.

## Jira

Checks that the work is tracked in Jira.

| Context | How to check |
|---|---|
| PR (any) | Extract key from PR title/body: `grep -oE '[A-Z][A-Z0-9]+-[0-9]+'` |
| No PR | Extract from branch name or recent commits |

If key found: ✅. If Jira MCP or JIRA_TOKEN available, verify issue exists and is active. If can't verify: ⚠️ "found key, couldn't verify." No key: ❌.

## Test Coverage

Checks whether test files were added or updated alongside code changes.

| Context | How to check |
|---|---|
| PR (any) | `gh pr diff "$pr_number" --name-only` — look for `.test.`, `.spec.`, `.cy.` files |
| No PR | `git diff --name-only origin/$base_branch` — same pattern |

Test files present → ✅. No test files but "Test Impact" section in PR body explains why → ✅. Neither → ⚠️. Skip entirely if only non-code files changed.

## PR Body

Checks that the PR description follows the template.

| Context | How to check |
|---|---|
| PR (any) | Check against `.github/pull_request_template.md` — see subsections below |
| No PR | ➖ "no PR body yet" |

### Subsections to check:
1. `## Description` has real content (not just HTML comments) → ✅/❌
2. `## How Has This Been Tested?` has content → ✅/⚠️
3. `## Test Impact` has content → ✅/⚠️
4. Checklist: count `- [x]` vs `- [ ]` → report ratio
5. Jira URL (link to an issue tracker like `issues.redhat.com/browse/` or `atlassian.net/browse/`) present → ✅/❌
6. If PR touches `.tsx`/`.css`/`.scss` files, check for image/gif links → ⚠️ if missing

Empty Description → ❌. Other missing sections → ⚠️.
