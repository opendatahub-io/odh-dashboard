# Create a New Doc from a Prompt

## Purpose

Use this skill to generate a new documentation file from a natural language description.
It identifies the doc type, selects a template if one exists, reads relevant source files,
and writes a doc conforming to `docs/guidelines.md`.

## Prerequisites

The following file must exist before invoking this skill:

- `docs/guidelines.md` — authoritative style and structure guide

Templates are used when they exist for the identified doc type:

- `docs/templates/frontend-template.md` — for frontend area docs
- `docs/templates/backend-template.md` — for backend module docs
- `docs/templates/package-template.md` — for package docs

Some packages maintain their own templates (e.g., ADR templates in `packages/<pkg>/docs/adr/`).
For doc types without a template, follow the general structure rules in `docs/guidelines.md`.

## Inputs

```text
$ARGUMENTS — a natural language description of what to document. Examples:
  "Document the Pipelines area — Kubeflow Pipelines integration, DAG viewing, run management"
  "Create a backend doc for the authentication middleware chain"
  "Document the AutoML package — its BFF, deployment modes, and Kubeflow integration"
  "Write a local deployment guide for the gen-ai package"
  "Create an ADR for the caching strategy in the mlflow BFF"
  "Write a README for the new feature-store package"
  "Document the contract test framework setup and usage"
  "Create a migration guide for the PatternFly v5 to v6 upgrade"
```

## Workflow

1. **Parse the description** from `$ARGUMENTS`. Identify:
   - The subject (e.g., "Pipelines", "caching strategy", "contract test framework")
   - The doc type — one of: area overview, backend module, package overview, README,
     ADR, guide (install/deployment/dev setup/migration), architecture doc, agent rule,
     or general reference doc
   - Any specific files, directories, or packages mentioned

2. **Select the template** (if one exists for the doc type):
   - Frontend area → `docs/templates/frontend-template.md`
   - Backend module → `docs/templates/backend-template.md`
   - Package overview → `docs/templates/package-template.md`
   - ADR → check if the target package has an ADR template in `packages/<pkg>/docs/adr/`;
     if not, follow the MADR format described in `docs/guidelines.md`
   - All other types → no template; follow `docs/guidelines.md` structure rules

3. **Read the template** (if selected) to get the required section structure.

4. **Read `docs/guidelines.md`** for style rules and general structure guidance.

5. **Research the subject** — read relevant source files to gather accurate content:
   - Frontend area: `frontend/src/pages/<area>/`, `frontend/src/concepts/<area>/`
   - Backend module: `backend/src/routes/`, `backend/src/`, `docs/architecture.md`
   - Package: `packages/<name>/README.md`, `packages/<name>/bff/`,
     `packages/<name>/frontend/src/`, `packages/<name>/Makefile`,
     `packages/<name>/package.json`
   - Guide: the relevant package or directory, existing related guides
   - ADR: the code implementing the decision, related ADRs in the same directory
   - README: the directory's contents and purpose
   - Agent rule: existing rules in `docs/agent-rules/` for style reference,
     the relevant test framework or tooling code
   - Architecture doc: the source code being described, existing architecture docs

6. **Determine the output path** based on doc type and subject:
   - Frontend area: `frontend/docs/<area-name>.md`
   - Backend module: `backend/docs/<module-name>.md`
   - Package overview: `packages/<name>/docs/overview.md`
   - ADR: `packages/<name>/docs/adr/NNNN-<short-title>.md`
   - Install guide: `packages/<name>/docs/install.md`
   - Deployment guide: `packages/<name>/docs/local-deployment-guide.md`
   - Dev setup guide: `packages/<name>/frontend/docs/dev-setup.md` or `docs/dev-setup.md`
   - Migration guide: `docs/migration-<topic>.md`
   - README: `<directory>/README.md`
   - Agent rule: `docs/agent-rules/<rule-name>.md`
   - Architecture doc: `<directory>/docs/architecture.md` or `docs/architecture.md`
   - General reference: `docs/<topic>.md`

7. **Write the doc** following the template (if one was selected) or the guidelines:
   - No placeholder text (`[Description]`, `TODO`, `TBD`, etc.) may remain
   - For overview docs, the Interactions section must name at least 1 concrete dependency
   - Set `Last Updated` to today's date (for doc types that use it)
   - Keep under 500 lines (target 300 or fewer)
   - For guides: use numbered steps with commands, expected output, and troubleshooting
   - For ADRs: fill Context, Decision Drivers, Considered Options, Decision Outcome
   - For READMEs: include purpose, setup/install, usage, and links to detailed docs

8. **Remind** the user to:
   - Add an entry to `docs/BOOKMARKS.md` if the doc should be indexed there
   - Update the parent directory's README if one exists
   - Verify all relative links resolve correctly

## Output

- A new doc file at the determined path.
- A suggested BOOKMARKS.md entry (for doc types that belong in the index).
