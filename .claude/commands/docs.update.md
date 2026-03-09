# Update Documentation from Git Diff

## Purpose

Use this skill after committing code changes to keep area docs accurate and current.
Given a git reference (commit hash, range, or `HEAD`), it reads the diff, identifies which
docs are affected, and updates them to conform to `docs/guidelines.md`.

## Prerequisites

The following files must exist before invoking this skill:

- `docs/guidelines.md` — authoritative style and structure guide
- The relevant area doc (e.g., `frontend/docs/pipelines.md`) — identified from the diff
- The applicable template (e.g., `docs/templates/frontend-template.md`)
- `docs/BOOKMARKS.md` — to verify links after updates

## Inputs

```
$ARGUMENTS — a git reference to diff against. Examples:
  HEAD~1            — last commit
  abc1234           — a specific commit hash
  abc1234..def5678  — a commit range
  HEAD              — all uncommitted changes (staged + unstaged)
```

## Workflow

1. **Read the diff**
   ```bash
   git diff $ARGUMENTS --name-only
   git diff $ARGUMENTS -- <relevant files>
   ```
   Identify all changed source files.

2. **Map changed files to area docs**
   Use this mapping (check `docs/BOOKMARKS.md` for the full index):
   - `frontend/src/pages/pipelines/**` → `frontend/docs/pipelines.md`
   - `frontend/src/pages/notebookController/**` → `frontend/docs/workbenches.md`
   - `frontend/src/pages/projects/**` → `frontend/docs/projects.md`
   - `frontend/src/pages/distributedWorkloads/**` → `frontend/docs/distributed-workloads.md`
   - `frontend/src/pages/lmEval/**` or `packages/gen-ai/**` → `frontend/docs/gen-ai.md`
   - `frontend/src/pages/enabledApplications/**` or `frontend/src/pages/home/**` → `frontend/docs/home-applications.md`
   - `frontend/src/pages/clusterSettings/**` or admin pages → `frontend/docs/admin-settings.md`
   - `backend/src/**` → `backend/docs/overview.md`
   - `packages/model-registry/**` → `packages/model-registry/docs/overview.md`
   - `packages/model-serving/**` → `packages/model-serving/docs/overview.md`
   - `packages/kserve/**` → `packages/kserve/docs/overview.md`
   - `packages/<name>/**` → `packages/<name>/docs/overview.md`

3. **Read each affected doc** and the applicable template.

4. **Read `docs/guidelines.md`** to confirm current style rules.

5. **For each affected doc**:
   a. Identify which sections are impacted by the diff (e.g., a new route → update API Routes table).
   b. Update only the affected sections — do not rewrite unaffected content.
   c. Update the `Last Updated` metadata to today's date.
   d. Verify all template sections are still present after editing.
   e. Keep the file under 500 lines.

6. **Show a diff** of proposed changes and ask for confirmation before writing:
   ```
   The following sections will be updated in <file>:
   - Section: <name> — <reason>
   Proceed? (yes/no)
   ```

7. **Write the updated file** after confirmation.

8. **Verify BOOKMARKS.md** still links to the updated file correctly.

## Output

- Updated area doc file(s) with changed sections and refreshed `Last Updated` date.
- A summary of which sections were changed and why.
