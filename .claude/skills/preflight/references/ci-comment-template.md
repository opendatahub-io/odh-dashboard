# Preflight Report Template

Used for terminal output and PR review in `--ci` mode. Everything is posted as a **single PR review** — inline comments on files + the report as the review summary body. No standalone PR comments.

## What Goes Where

| Severity | Inline comment on file | Review summary body |
|----------|------------------------|---------------------|
| 🔴 Critical | Yes | Counted in review row |
| 🟠 Major | Yes | Counted in review row |
| 🟡 Minor | Yes | Counted in review row |
| 🧹 Nit | **No** | Yes (expandable section) |

## Review Summary Body

The review `body` field contains the full preflight report. Format:

```markdown
## Preflight Agent Report

**Verdict:** <emoji> <READY | READY WITH WARNINGS | NOT READY>
**Commit:** [`<short SHA>`](https://github.com/OWNER/REPO/commit/<full SHA>)

<details>
<summary>Checks</summary>

| Check | Status | Details |
|-------|--------|---------|
| Conflicts | ✅ | Mergeable, up to date |
| CI | ⏭️ | 39 passed |
| Lint | ⏭️ | Covered by CI |
| Type Check | ⏭️ | Covered by CI |
| Unit Tests | ⏭️ | Covered by CI |
| Jira | ❌ | No Jira key found |
| Test Coverage | ⚠️ | No test files added |
| PR Body | ⚠️ | Minimal — missing template sections |
| Review | 🟡 3 minor · 🧹 2 nits | See inline comments + nits below |

</details>

<details>
<summary>🧹 Nitpick comments (2)</summary>

<details>
<summary>frontend/src/app/navigation/NavItem.tsx (1)</summary>

`27`: _🧹 Nit_ · _Style review_

**Prefer `const` over `let` for variables that are never reassigned.**

</details>

<details>
<summary>frontend/src/app/navigation/FlatNavSection.tsx (1)</summary>

`55`: _🧹 Nit_ · _Claude review_

**Unnecessary else after early return.**

</details>

</details>

<details>
<summary>Fixes applied (3 files changed)</summary>

- `FlatNavSection.tsx` — replaced hardcoded colors with PF tokens, fixed `==` to `===`
- `NavSidebar.tsx` — replaced `<div onClick>` with PF `<Button variant="link">`
- `useNavLayout.ts` — replaced module-level mutable state with React Context

</details>

---
*Automated by ODH Dashboard Agent*
```

**Rules:**
- Only include check rows that were evaluated
- Status emojis: ✅ passed · ❌ failed · ⚠️ warning · ⏭️ covered by CI · ➖ n/a
- **Commit** must be a clickable link
- **Checks** go in a collapsible `<details>` section
- **Nits** go in a collapsible `<details>` section, grouped by file with nested `<details>`
- **Fixes** (if `--fix` mode) go in a collapsible `<details>` section listing what changed
- Only include sections that have content (no empty collapsibles)
- **Footer** is just `*Automated by ODH Dashboard Agent*` — no link

## Inline Review Comments (Critical, Major, Minor only — NOT Nits)

Format for each inline comment:

```markdown
_<severity badge>_ · _<reviewer source>_

**<Short title.>**

<Description. Use `code` formatting for identifiers.>
```

If the review produced a concrete suggested fix, include it:

```markdown
<details>
<summary>Suggested fix</summary>

```diff
- <old code>
+ <new code>
```

</details>
```

**Severity badges:**

| Badge | When |
|-------|------|
| `🔴 Critical` | Security, data loss, crash |
| `🟠 Major` | Bug, incorrect behavior, missing guard |
| `🟡 Minor` | Code quality, naming, style |

**Reviewer source** — tag which reviewer(s) flagged the issue:

| Source | When |
|--------|------|
| `Claude review` | Found by `/review` |
| `Style review` | Found by `/style-review` |
| `RBAC review` | Found by `/rbac-review` |
| `Jira Eval review` | Found by `/jira-eval-review` |
| `CodeRabbit` | Found by CodeRabbit (PR or CLI) |
| `Claude review, Style review` | Found by multiple reviewers |

**Rules for inline comments:**
- Only include `Suggested fix` when the review actually produced a concrete code change — do NOT fabricate diffs
- Do NOT post inline comments for Nits — those go in the review summary only
- Only post for findings with specific file + line
- Always include the reviewer source tag

## Submitting the Review

Post as a **single PR review** with inline comments AND the summary body:

1. Use the **Write tool** to create `preflight-review.json` in the workspace root.
2. Post with: `gh api repos/OWNER/REPO/pulls/PR/reviews --input preflight-review.json`

The `body` field is the full report. The `comments` array has the inline findings.

```json
{
  "event": "COMMENT",
  "body": "## Preflight Agent Report\n\n**Verdict:** ...\n\n<details>...",
  "comments": [
    {
      "path": "src/components/Foo.tsx",
      "line": 42,
      "body": "_🟠 Major_ · _Style review_\n\n**Use PF token instead of hardcoded color.**\n\n..."
    }
  ]
}
```

## Recalculating After Fixes

When `--fix` is passed, the checks table in the review summary must reflect the state **after** fixes are applied. Re-run lint and type-check on changed files after fixing and use those results in the table. Do NOT post the pre-fix results table.
