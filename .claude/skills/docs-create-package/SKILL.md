# Create a Package Doc and Register in BOOKMARKS.md

## Purpose

Scaffold a package doc for any package under `packages/` and register it in `BOOKMARKS.md`.

## Prerequisites

- `docs/guidelines.md` — style and structure rules
- `docs/templates/package-template.md` — the package doc template
- `BOOKMARKS.md` — updated automatically by this skill

## Inputs

```text
$ARGUMENTS — package name (directory name under packages/).
```

## Workflow

1. **Verify** the package exists at `packages/$ARGUMENTS/`.

2. **Determine package type** (before creating any files):
   - Has `frontend/src/` or `bff/` → **full doc**
   - Tooling-only → **stub only** (README.md; no overview.md)

3. **Read** the template (`docs/templates/package-template.md`) and `docs/guidelines.md`.

4. **Research the package** — read only files that exist:
   - `packages/$ARGUMENTS/README.md`
   - `packages/$ARGUMENTS/package.json`
   - `packages/$ARGUMENTS/Makefile`
   - `packages/$ARGUMENTS/bff/` or `packages/$ARGUMENTS/upstream/bff/`
   - `packages/$ARGUMENTS/frontend/src/` (browse structure)

5. **For full-doc packages** — create `packages/$ARGUMENTS/docs/overview.md`:
   - Fill every applicable section with real content
   - Omit template sections that don't apply — no "Not applicable" filler
   - Interactions must name the main ODH Dashboard and at least one other dependency
   - Target under 300 lines (hard limit 500)

6. **Update BOOKMARKS.md**:
   - Full-doc → **Packages > Full Docs**
   - Stub → **Packages > Stubs**

## Output

- `packages/$ARGUMENTS/docs/overview.md` (full-doc packages only)
- `BOOKMARKS.md` updated with the new entry
