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

Invoke `/ci-status-review` with the PR metadata and sync state from Step 1. It collects raw state through the existing `preflight/scripts/analyze-ci.sh`, interprets CI applicability, and delegates failed-test classification to `/ci-flake-classifier`.

Use its per-check and overall statuses directly in the preflight table. When its report says CI does not apply to the local checkout, run the relevant local commands identified in its `Local follow-up` section and report their results separately. Do not duplicate CI interpretation or flake-classification criteria here.

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

### RBAC Review

| Context | How to check |
|---|---|
| Ran in Step 2 | Results from `/rbac-review` invocation |
| Not run | ➖ "not run" |

Report: `RBAC (local)` as the source. Any critical findings → ❌. Warnings only → ⚠️. None or info only → ✅.

### Jira PR Review

Compares the Jira product ask with the PR and evaluates code changes against explicit acceptance criteria using `/jira-pr-review`. This is separate from the basic Jira check (which only verifies a key is present).

| Context | How to check |
|---|---|
| Ran in Step 2 | Results from `/jira-pr-review` invocation. Verdicts: PASS, PARTIAL, MISS, SKIP. |
| Not run | ➖ "not run" |
| No Jira key found | ➖ "no Jira key" |
| Jira MCP unavailable | ➖ "Jira MCP unavailable" |
| Issue has no acceptance criteria | ➖ "no acceptance criteria" |

**Prerequisites:** Requires both a Jira issue key (extracted in Step 1) and a working Jira MCP connection. In CI mode, the `mcp-atlassian` server provides Jira access via GitHub Actions secrets. Locally, the developer's existing Jira MCP authentication is used.

**How to invoke:** Pass the Jira issue key and current PR number (if available) to `/jira-pr-review`. The skill validates the target issue, compares the product ask, evaluates the code changes against each criterion, and returns per-criterion verdicts.

**Status mapping:** All PASS → ✅. Any PARTIAL → ⚠️. Any MISS → ❌. All SKIP → ➖.

Report: `Jira PR (local)` as the source. Include the product-ask result and criterion verdict summary (e.g., "aligned; 5/5 criteria satisfied").

## Jira

Checks that the work is tracked in Jira.

| Context | How to check |
|---|---|
| PR (any) | Extract key from PR title/body: `grep -oE '[A-Z][A-Z0-9]+-[0-9]+'` |
| No PR | Extract from branch name or recent commits |

If key found: ✅. If Jira MCP or JIRA_TOKEN available, verify issue exists and is active. If can't verify: ⚠️ "found key, couldn't verify." No key: ❌.

## Test Impact

Invoke `/test-impact-review` with changed paths and the PR body when available. Use its status and evidence directly; it owns whether a code change has tests, a substantive rationale, or is not applicable.

## PR Body

Invoke `/pr-description-review` for a PR body. It owns the ODH template-completeness checks, including Description, testing, Test Impact, checklist context, Jira linkage, and applicable UI evidence. Use its status and evidence directly.
