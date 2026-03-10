# Update Documentation from Git Diff

## Purpose

Use this skill after code changes to keep documentation accurate and current.
It identifies which docs are affected and updates them to conform to `docs/guidelines.md`.

## Prerequisites

- `docs/guidelines.md` — authoritative style and structure guide
- `docs/BOOKMARKS.md` — to verify links after updates

## Inputs

```
$ARGUMENTS (optional) — a git reference to diff against, or a natural language description
of what changed. Examples:
  HEAD~1            — last commit
  abc1234           — a specific commit hash
  abc1234..def5678  — a commit range
  HEAD              — all uncommitted changes (staged + unstaged)
  "updated the auth middleware to support BYO OIDC"
  (empty)           — agent determines scope from current uncommitted changes
```

If `$ARGUMENTS` is empty, default to `HEAD` (all uncommitted staged + unstaged changes).
If it is not a valid git reference, treat it as a description and ask the user which files
or areas changed, or inspect recent commits to determine scope.

## Workflow

1. **Determine the change scope**
   - If `$ARGUMENTS` is a git reference (or empty → default `HEAD`):
     ```bash
     git diff $ARGUMENTS --name-only
     git diff $ARGUMENTS -- <relevant files>
     ```
   - If `$ARGUMENTS` is a description, identify the affected source directories from context
     and list changed files manually or by inspecting recent commits.

   Identify all changed source files.

2. **Map changed files to affected docs**
   A code change can affect multiple doc types. Check each category:

   **Template-based overview docs** (check `docs/BOOKMARKS.md` for the full index):
   - `frontend/src/pages/pipelines/**` → `frontend/docs/pipelines.md`
   - `frontend/src/pages/notebookController/**` → `frontend/docs/workbenches.md`
   - `frontend/src/pages/projects/**` → `frontend/docs/projects.md`
   - `frontend/src/pages/distributedWorkloads/**` → `frontend/docs/distributed-workloads.md`
   - `frontend/src/pages/lmEval/**` or `packages/gen-ai/**` → `frontend/docs/gen-ai.md`
   - `frontend/src/pages/enabledApplications/**` or `frontend/src/pages/home/**` → `frontend/docs/home-applications.md`
   - `frontend/src/pages/clusterSettings/**` or admin pages → `frontend/docs/admin-settings.md`
   - `backend/src/**` → `backend/docs/overview.md`
   - `packages/<name>/**` → `packages/<name>/docs/overview.md`

   **Other docs that may need updating**:
   - Changes to env vars, config, or deployment → check `packages/<name>/docs/install.md`,
     `local-deployment-guide.md`, `frontend/docs/dev-setup.md`, or `docs/dev-setup.md`
   - Changes to BFF handlers or OpenAPI specs → check `packages/<name>/bff/docs/` and
     any related ADRs in `packages/<name>/docs/adr/`
   - Changes to test frameworks or patterns → check `docs/agent-rules/` and `docs/testing.md`
   - Changes to webpack/Module Federation config → check `docs/module-federation.md`
   - Changes to auth or middleware → check `docs/architecture.md`
   - Changes to a package's README-documented behavior → check `packages/<name>/README.md`

   If no mapping is obvious, search `docs/BOOKMARKS.md` and nearby READMEs for references
   to the changed files.

3. **Read each affected doc**.
   If the doc was created from a template, also read the applicable template
   (`docs/templates/frontend-template.md`, `backend-template.md`, or `package-template.md`).

4. **Read `docs/guidelines.md`** to confirm current style rules.

5. **For each affected doc**:
   a. Identify which sections are impacted by the diff (e.g., a new route → update API Routes
      table; a new env var → update Environment Variables table; a renamed file → update
      Architecture tree).
   b. Update only the affected sections — do not rewrite unaffected content.
   c. Update the `Last Updated` metadata to today's date (if the doc uses one).
   d. For template-based docs, verify all template sections are still present after editing.
   e. Keep the file under 500 lines.

6. **Show a summary** of proposed changes and ask for confirmation before writing:
   ```
   The following docs will be updated:
   - <file>: Section "<name>" — <reason>
   - <file>: Section "<name>" — <reason>
   Proceed? (yes/no)
   ```

7. **Write the updated files** after confirmation.

8. **Verify BOOKMARKS.md** still links to all updated files correctly.

## Output

- Updated doc file(s) with changed sections and refreshed `Last Updated` date.
- A summary of which sections were changed and why.
