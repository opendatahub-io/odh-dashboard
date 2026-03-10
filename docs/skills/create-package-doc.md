# Create a Package Doc and Register in BOOKMARKS.md

## Purpose

Use this skill to scaffold a complete package doc for any package under `packages/` and
automatically register it in `docs/BOOKMARKS.md`. Use this when adding a new package or when
a package needs its first structured doc.

## Prerequisites

The following files must exist before invoking this skill:

- `docs/guidelines.md` — authoritative style and structure guide
- `docs/templates/package-template.md` — the package doc template
- `docs/BOOKMARKS.md` — will be updated automatically by this skill

## Inputs

```text
$ARGUMENTS — the package name (directory name under packages/). Examples:
  autorag
  model-registry
  my-new-package
```

## Workflow

1. **Resolve the package path**: `packages/$ARGUMENTS/`

2. **Verify the package exists**:
   ```bash
   ls packages/$ARGUMENTS/
   ```
   If the directory does not exist, stop and report an error.

3. **Read the package template**: `docs/templates/package-template.md`

4. **Read `docs/guidelines.md`** for style rules.

5. **Research the package** by reading:
   - `packages/$ARGUMENTS/README.md` (if exists)
   - `packages/$ARGUMENTS/CONTRIBUTING.md` (if exists)
   - `packages/$ARGUMENTS/bff/` (if exists — check for Go BFF)
   - `packages/$ARGUMENTS/frontend/src/` (browse structure)
   - `packages/$ARGUMENTS/Makefile` (for deployment mode commands)
   - `packages/$ARGUMENTS/package.json` (for scripts and dependencies)

6. **Determine BFF status**:
   - If `packages/$ARGUMENTS/bff/` or `packages/$ARGUMENTS/upstream/bff/` exists → document the BFF
   - Otherwise → write "Not applicable — this package has no BFF." in that section

7. **Determine deployment modes** from Makefile scripts:
   - `make dev-start` → Standalone
   - `make dev-start-kubeflow` → Kubeflow
   - `make dev-start-federated` → Federated

8. **Determine package type** — decide before creating any files:
   - If the package has a user-facing frontend (`frontend/src/`) or BFF (`bff/`) → **full doc**
   - If tooling-only (no frontend, no BFF) → **stub only** (README.md, no overview.md)

9. **For full-doc packages only** — create `packages/$ARGUMENTS/docs/overview.md`:
   ```bash
   mkdir -p packages/$ARGUMENTS/docs/
   ```
   - Fill every section with real content (no placeholder text)
   - Interactions section must name the main ODH Dashboard and at least one other dependency
   - Set `Last Updated` to today's date
   - Keep under 500 lines

10. **Update `docs/BOOKMARKS.md`** — append to the correct section:
    - Full-doc package → add to **Packages > Full Docs**:
      ```markdown
      | [Package Name](../packages/$ARGUMENTS/docs/overview.md) | One-line description |
      ```
    - Tooling-only package → add to **Packages > Stubs**:
      ```markdown
      | [Package Name](../packages/$ARGUMENTS/README.md) | One-line description |
      ```
    - Update the `Last Updated` date in BOOKMARKS.md.

## Output

- `packages/$ARGUMENTS/docs/overview.md` — fully-populated package doc (full-doc packages only)
- `docs/BOOKMARKS.md` — updated with the new entry
