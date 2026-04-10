# Create a New Doc from a Prompt

When asked to create new documentation, read and follow the full workflow in
`.claude/skills/docs-create/SKILL.md`.

## Quick Reference

- **Parse** `$ARGUMENTS` to identify the subject, doc type, and any files/packages mentioned.
- **Select a template** if one exists: `docs/templates/frontend-template.md`,
  `docs/templates/backend-template.md`, or `docs/templates/package-template.md`. For ADRs, check the package's own `docs/adr/`
  directory. All other types: follow `docs/guidelines.md` directly.
- **Research** the subject by reading relevant source files before writing.
- **Determine the output path** by doc type (e.g., `frontend/docs/<area>.md`,
  `packages/<name>/docs/overview.md`, `.claude/rules/<rule>.md`).
- No placeholder text (`TODO`, `TBD`, `[Description]`) may remain in the final doc.
- Omit template sections that don't apply — no "Not applicable" filler.
