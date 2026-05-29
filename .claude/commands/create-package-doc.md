# Create a Package Doc and Register in BOOKMARKS.md

When asked to create documentation for a package, read and follow the full workflow in
`.claude/skills/docs-create-package/SKILL.md`.

## Quick Reference

- **Verify** the package exists at `packages/$ARGUMENTS/` before doing anything.
- **Determine package type first** (before creating any files):
  - Has `frontend/src/` or `bff/` → **full doc** (`packages/$ARGUMENTS/docs/overview.md`)
  - Tooling-only → **stub only** (README.md; no overview.md)
- **Research** only files and directories that exist: README, Makefile, package.json, bff/, frontend/src/.
- **Use** `docs/templates/package-template.md` and follow `docs/guidelines.md` for style.
- **Omit** template sections that don't apply — no "Not applicable" filler.
- **Update** `BOOKMARKS.md`: full-doc packages under **Packages > Full Docs**;
  tooling-only packages under **Packages > Stubs**.
