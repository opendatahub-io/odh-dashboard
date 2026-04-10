# Create a New Doc from a Prompt

## Purpose

Generate a new documentation file from a natural language description. Identifies the doc
type, selects a template if one exists, reads source files, and writes a doc conforming to
`docs/guidelines.md`.

## Prerequisites

- `docs/guidelines.md` — style and structure rules
- Templates (when applicable): `docs/templates/frontend-template.md`,
  `docs/templates/backend-template.md`, `docs/templates/package-template.md`

## Inputs

```text
$ARGUMENTS — natural language description of what to document.
```

## Workflow

1. **Parse** `$ARGUMENTS` to identify the subject, doc type, and any specific
   files/packages mentioned.

2. **Select template** (if one exists):
   - Frontend area → `docs/templates/frontend-template.md`
   - Backend module → `docs/templates/backend-template.md`
   - Package overview → `docs/templates/package-template.md`
   - ADR → check `packages/<pkg>/docs/adr/` for a template; else use MADR format
   - All other types → follow `docs/guidelines.md` directly

3. **Read** the template (if selected) and `docs/guidelines.md`.

4. **Research the subject** — read relevant source files:
   - Frontend area: `frontend/src/pages/<area>/`, `frontend/src/concepts/<area>/`
   - Backend module: `backend/src/routes/`, `backend/src/`
   - Package: README, bff/, frontend/src/, Makefile, package.json
   - Other types: the relevant source code and any existing related docs

5. **Determine output path**:
   - Frontend area: `frontend/docs/<area-name>.md`
   - Backend module: `backend/docs/<module-name>.md`
   - Package overview: `packages/<name>/docs/overview.md`
   - ADR: `packages/<name>/docs/adr/NNNN-<short-title>.md`
   - Guide: `packages/<name>/docs/<guide-type>.md`
   - README: `<directory>/README.md`
   - Agent rule: `.claude/rules/<rule-name>.md`

6. **Write the doc**:
   - No placeholder text (`[Description]`, `TODO`, `TBD`)
   - Omit template sections that don't apply — no "Not applicable" filler
   - Interactions section must name at least 1 concrete dependency
   - Target under 300 lines (hard limit 500)

7. **Remind** user to verify links and update BOOKMARKS.md if applicable.

## Output

- A new doc file at the determined path.
