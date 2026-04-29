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

## CI

Checks the status of CI checks on the PR.

| Context | How to check |
|---|---|
| PR synced | ⏭️ read from `gh pr checks --json name,bucket,link` — report any failures |
| PR not synced | ➖ "CI ran on different code — see local checks below" |
| No PR | ➖ "no PR — CI hasn't run" |

## Lint

Checks that code passes lint rules.

| Context | How to check |
|---|---|
| PR synced | ⏭️ if CI lint check passed |
| PR not synced | `npm run lint` on affected packages |
| No PR | `npm run lint` on affected packages |

Only lint affected packages — detect from `git diff --name-only origin/$base_branch | cut -d'/' -f1-2 | sort -u`.

## Type Check

Checks TypeScript compilation.

| Context | How to check |
|---|---|
| PR synced | ⏭️ if CI type-check passed |
| PR not synced | `npm run type-check` on affected packages |
| No PR | `npm run type-check` on affected packages |

## Unit Tests

Runs unit tests on affected packages.

| Context | How to check |
|---|---|
| PR synced | ⏭️ if CI unit tests passed |
| PR not synced | `npm run test-unit` on affected packages |
| No PR | `npm run test-unit` on affected packages |

## Reviews

Checks for unresolved review feedback.

| Context | How to check |
|---|---|
| PR (any) | Fetch threads via `fetch-review-threads.sh`. Check `reviewDecision`. Unresolved critical/major CR or human threads → ❌ |
| No PR | Results from Step 2 local review |

## Jira

Checks that the work is tracked in Jira.

| Context | How to check |
|---|---|
| PR (any) | Extract key from PR title/body: `grep -oE 'RHOAIENG-[0-9]+'` |
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
5. Jira URL (`issues.redhat.com/browse/`) present → ✅/❌
6. If PR touches `.tsx`/`.css`/`.scss` files, check for image/gif links → ⚠️ if missing

Empty Description → ❌. Other missing sections → ⚠️.
