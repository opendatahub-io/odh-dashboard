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

```
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

8. **Create the output directory** if it does not exist:
   ```bash
   mkdir -p packages/$ARGUMENTS/docs/
   ```

9. **Write the doc** at `packages/$ARGUMENTS/docs/overview.md`:
   - Fill every section with real content (no placeholder text)
   - Interactions section must name the main ODH Dashboard and at least one other dependency
   - Set `Last Updated` to today's date
   - Keep under 500 lines

10. **Update `docs/BOOKMARKS.md`** — append to the correct section:
    - If the package has a user-facing frontend or BFF → add to **Packages > Full Docs**:
      ```
      | [Package Name](../packages/$ARGUMENTS/docs/overview.md) | One-line description |
      ```
    - If tooling-only → add to **Packages > Stubs**:
      ```
      | [Package Name](../packages/$ARGUMENTS/README.md) | One-line description |
      ```
    - Update the `Last Updated` date in BOOKMARKS.md.

## Output

- `packages/$ARGUMENTS/docs/overview.md` — fully-populated package doc
- `docs/BOOKMARKS.md` — updated with the new entry
