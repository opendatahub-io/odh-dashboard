# Create a New Area Doc from a Prompt

## Purpose

Use this skill to generate a new area doc from a natural language description.
It selects the correct template, reads relevant source files, and writes a fully-populated doc
conforming to `docs/guidelines.md`. After creation, it reminds you to add a BOOKMARKS entry.

## Prerequisites

The following files must exist before invoking this skill:

- `docs/guidelines.md` — authoritative style and structure guide
- `docs/templates/frontend-template.md` — for frontend area docs
- `docs/templates/backend-template.md` — for backend module docs
- `docs/templates/package-template.md` — for package docs
- `docs/BOOKMARKS.md` — to add the new entry after creation

## Inputs

```
$ARGUMENTS — a natural language description of the area to document. Examples:
  "Document the Pipelines area — Kubeflow Pipelines integration, DAG viewing, run management"
  "Create a backend doc for the authentication middleware chain"
  "Document the AutoML package — its BFF, deployment modes, and Kubeflow integration"
```

## Workflow

1. **Parse the description** from `$ARGUMENTS`. Identify:
   - The area name (e.g., "Pipelines", "Authentication", "AutoML")
   - The doc type: frontend area / backend module / package
   - Any specific files or directories mentioned

2. **Select the template**:
   - Frontend area → `docs/templates/frontend-template.md`
   - Backend module → `docs/templates/backend-template.md`
   - Package → `docs/templates/package-template.md`

3. **Read the template** to get the required section structure.

4. **Read `docs/guidelines.md`** for style rules and section order.

5. **Research the area** — read relevant source files:
   - Frontend: `frontend/src/pages/<area>/`, `frontend/src/concepts/<area>/`
   - Backend: `backend/src/routes/`, `backend/src/`, `docs/architecture.md`
   - Package: `packages/<name>/README.md`, `packages/<name>/bff/`, `packages/<name>/frontend/src/`

6. **Determine the output path**:
   - Frontend: `frontend/docs/<area-name>.md`
   - Backend: `backend/docs/<module-name>.md`
   - Package: `packages/<name>/docs/overview.md`

7. **Write the doc** using the template structure, filling every section with real content from step 5.
   - No placeholder text (`[Description]`, `TODO`, etc.) may remain
   - Interactions section must name ≥1 concrete dependency
   - Set `Last Updated` to today's date
   - Keep under 500 lines (target ≤ 300)

8. **Remind** the user to add an entry to `docs/BOOKMARKS.md`:
   ```
   - [<Area Name>](<relative-path>) — <one-line description>
   ```
   Add it to the correct section (Frontend Areas / Backend / Packages > Full Docs).

## Output

- A new area doc file at the determined path.
- A suggested BOOKMARKS.md entry for manual addition (or use `/docs.package` which does this automatically).
