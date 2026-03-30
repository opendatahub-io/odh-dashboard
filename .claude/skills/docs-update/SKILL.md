# Update Documentation from Git Diff

## Purpose

Use this skill after code changes to keep documentation accurate and current.
It identifies which docs are affected and updates them to conform to `docs/guidelines.md`.

## Prerequisites

- `docs/guidelines.md` — authoritative style and structure guide
- `BOOKMARKS.md` — indexes frontend area docs, backend docs, and package docs (not all docs in the repo)

## Inputs

```text
$ARGUMENTS (optional) — flags, a git reference, or a natural language description.

Flags:
  --no-cache          Skip git diff entirely; re-read source code and rewrite every
                      section of all targeted docs from scratch as if they were freshly
                      generated. Combine with a scope filter to limit which docs are
                      refreshed (see examples below).

Positional / descriptive arguments (after flags):
  HEAD~1              — last commit
  abc1234             — a specific commit hash
  abc1234..def5678    — a commit range
  HEAD                — all uncommitted changes (staged + unstaged)
  "updated the auth middleware to support BYO OIDC"
  (empty)             — agent determines scope from current uncommitted changes

Combined examples:
  --no-cache                           — full refresh of ALL indexed docs
  --no-cache backend                   — full refresh of backend docs only
  --no-cache packages/model-registry   — full refresh of model-registry package docs only
  --no-cache frontend/docs/pipelines.md — full refresh of a single doc
  HEAD~3                               — diff-based update for the last 3 commits
```

If `$ARGUMENTS` has no flags and is empty, default to `HEAD` (all uncommitted staged +
unstaged changes, plus new untracked files).
If the positional part is not a valid git reference, treat it as a description and ask the
user which files or areas changed, or inspect recent commits to determine scope.

## Workflow

### A. `--no-cache` mode (full refresh)

Use this path when `--no-cache` is present in `$ARGUMENTS`.

1. **Determine target docs**
   - If a scope filter follows `--no-cache` (path or keyword), resolve it to the matching
     doc(s) using the mapping table in step B-2.
   - If no scope filter is given, collect every doc listed in `BOOKMARKS.md` (frontend areas, backend, and packages).

2. **Read `docs/guidelines.md`** for style rules.

3. **For each target doc**:
   a. Read the doc.
   b. If the doc was created from a template, read the template
      (`docs/templates/frontend-template.md`, `docs/templates/backend-template.md`, or
      `docs/templates/package-template.md`).
   c. **Read the source code** the doc describes — the same directories/files you would
      research when creating the doc from scratch (READMEs, route files, Makefiles,
      package.json, BFF directories, frontend source trees, etc.).
   d. Rewrite **every section** of the doc using the current source code as the single
      source of truth. Do not preserve stale content — treat this as regenerating the doc
      while keeping its existing structure and template.
   e. Update the `Last Updated` metadata to today's date.
   f. For template-based docs, verify all template sections are present.
   g. Keep the file under 500 lines.

4. **Show a summary** of proposed changes and ask for confirmation before writing:
   ```text
   The following docs will be fully refreshed (--no-cache):
   - <file>: All sections rewritten from current source
   Proceed? (yes/no)
   ```

5. **Write the updated files** after confirmation.

6. **Verify BOOKMARKS.md** still links to all updated files correctly.

### B. Diff-based mode (default)

Use this path when `--no-cache` is **not** present.

1. **Determine the change scope**
   - If `$ARGUMENTS` is a git reference (or empty → default `HEAD`):
     ```bash
     git diff $ARGUMENTS --name-only
     git ls-files --others --exclude-standard
     git diff $ARGUMENTS -- <relevant files>
     ```
     Merge the output of both commands — `git diff --name-only` covers tracked changed files;
     `git ls-files --others --exclude-standard` covers new untracked files not yet staged.
   - If `$ARGUMENTS` is a description, identify the affected source directories from context
     and list changed files manually or by inspecting recent commits.

   Identify all changed source files.

2. **Map changed files to affected docs**
   A code change can affect multiple doc types. Check each category:

   **Template-based overview docs** (check `BOOKMARKS.md` for the index of frontend area, backend, and package docs):
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
   - Changes to test frameworks or patterns → check `.claude/rules/` and `docs/testing.md`
   - Changes to webpack/Module Federation config → check `docs/module-federation.md`
   - Changes to auth or middleware → check `docs/architecture.md`
   - Changes to a package's README-documented behavior → check `packages/<name>/README.md`

   If no mapping is obvious, search `BOOKMARKS.md` (for indexed docs) and nearby READMEs for references to the changed files.

3. **Read each affected doc**.
   If the doc was created from a template, also read the applicable template
   (`docs/templates/frontend-template.md`, `docs/templates/backend-template.md`, or
   `docs/templates/package-template.md`).

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
   ```text
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
