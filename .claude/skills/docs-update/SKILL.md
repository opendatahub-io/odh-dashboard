# Update Documentation from Git Diff

## Purpose

Update docs to reflect code changes. Identifies affected docs via BOOKMARKS.md and updates
only the sections that changed.

## Prerequisites

- `docs/guidelines.md` — style and structure rules
- `BOOKMARKS.md` — index of all maintained docs (source of truth for file-to-doc mapping)

## Inputs

```text
$ARGUMENTS (optional):
  --no-cache [scope]   Full rewrite from source. Scope: path, keyword, or omit for all.
  HEAD~1, abc1234, abc..def   Git reference for diff-based update.
  (empty)              Defaults to HEAD (uncommitted changes + untracked files).
```

## Workflow

### A. `--no-cache` mode (full refresh)

1. **Resolve target docs**: If a scope filter is given, match it against BOOKMARKS.md entries.
   Otherwise, collect every doc listed in BOOKMARKS.md.
2. **Read `docs/guidelines.md`** and the relevant template for each doc.
3. **For each doc**: read the doc, read the source code it describes, rewrite every section
   from current source. Keep under 300 lines (hard limit 500).
4. **Show summary** and ask for confirmation before writing.
5. **Verify BOOKMARKS.md** links still resolve.

### B. Diff-based mode (default)

1. **Determine changed files**:
   ```bash
   git diff $ARGUMENTS --name-only
   git ls-files --others --exclude-standard
   ```

2. **Map changed files to docs** using BOOKMARKS.md as the source of truth:
   - Read BOOKMARKS.md to get all indexed doc paths and their descriptions.
   - For each changed file, determine which doc covers that area:
     - `frontend/src/pages/<area>/**` or `frontend/src/concepts/<area>/**` → the frontend
       area doc listed in BOOKMARKS.md whose description matches `<area>`.
     - `backend/src/**` → `backend/docs/overview.md`.
     - `packages/<name>/**` → `packages/<name>/docs/overview.md`.
   - Also check non-indexed docs if the change affects env vars, deployment config,
     OpenAPI specs, webpack/MF config, or auth middleware — search nearby READMEs and
     `docs/` directories for references to the changed files.

3. **For each affected doc**:
   a. Read the doc and its template (if template-based).
   b. Read `docs/guidelines.md`.
   c. Identify which sections are impacted by the diff.
   d. Update only affected sections — do not rewrite unaffected content.
   e. Keep under 300 lines (hard limit 500).

4. **Show summary** of proposed changes and ask for confirmation:
   ```text
   The following docs will be updated:
   - <file>: Section "<name>" — <reason>
   Proceed? (yes/no)
   ```

5. **Write** after confirmation. **Verify BOOKMARKS.md** links still resolve.

## Output

- Updated doc file(s) with changed sections.
- Summary of which sections changed and why.
