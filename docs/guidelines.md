[Architecture]: architecture.md
[Best Practices]: best-practices.md
[Testing]: testing.md
[AGENTS.md]: ../AGENTS.md
[CONTRIBUTING.md]: ../CONTRIBUTING.md
[BOOKMARKS]: BOOKMARKS.md

# ODH Dashboard Documentation Guidelines

**Last Updated**: 2026-03-10

## Purpose and Audience

These guidelines govern every Markdown file in the repository — `docs/`, `frontend/docs/`,
`backend/docs/`, `packages/*/docs/`, package-level READMEs, ADRs, guides, agent rules, and any
other `.md` file that is part of the project's knowledge base.

They exist for two equal audiences:

- **Human developers** — contributors who need to understand, navigate, and modify the codebase.
- **AI agents** — automated agents reading docs as context before making changes. Docs must be
  precise, unambiguous, and machine-parseable.

All documentation MUST follow these guidelines. When an existing doc conflicts, update the doc —
not the guidelines.

---

## Principles

These principles apply to every document regardless of type.

### 1. Accuracy over completeness

A short, correct doc is better than a long, stale one. Delete outdated content rather than leaving
it with a "TODO: update" marker. If a section cannot be filled accurately, omit it and note why.

### 2. Specificity

Name actual files, directories, components, hooks, functions, environment variables, and CLI
commands. Vague statements like "the config file" or "run the setup script" force readers to
search — save them the effort.

### 3. Single source of truth

Every fact should live in exactly one place. Other docs should link to that place, not duplicate
it. When you find duplicated information, consolidate it and replace the copies with links.

### 4. Navigability

Every doc must be reachable from [BOOKMARKS] or a README in the same directory. Orphan docs are
invisible docs. When you create or move a file, update the relevant index.

### 5. Maintainability

Structure docs so that a code change requires updating at most one or two sentences, not
rewriting entire sections. Prefer tables and lists over prose for content that changes often
(routes, env vars, flags).

### 6. Audience awareness

State who the doc is for and what they should already know. A quick-start guide for new
contributors has different assumptions than an ADR written for the architecture team.

---

## Document Types

The repository contains many kinds of documentation. The table below lists them, their typical
location, and whether a template exists.

| Type | Typical location | Template |
|------|-----------------|----------|
| **Area overview** (frontend) | `frontend/docs/<area>.md` | `docs/templates/frontend-template.md` |
| **Module overview** (backend) | `backend/docs/<module>.md` | `docs/templates/backend-template.md` |
| **Package overview** | `packages/<pkg>/docs/overview.md` | `docs/templates/package-template.md` |
| **README** | Root, package, or sub-directory | None — follow README guidance below |
| **Architecture Decision Record** (ADR) | `packages/<pkg>/docs/adr/NNNN-*.md` | `packages/gen-ai/docs/adr/template.md` |
| **Install / setup guide** | `packages/<pkg>/docs/install.md` | None |
| **Local deployment guide** | `packages/<pkg>/docs/local-deployment-guide.md` | None |
| **Developer guide** | `packages/<pkg>/docs/` or `packages/<pkg>/bff/docs/` | None |
| **Architecture doc** | `docs/architecture.md`, `packages/<pkg>/frontend/docs/architecture.md` | None |
| **Best practices / coding standards** | `docs/best-practices.md`, `docs/code_examples.md` | None |
| **Process doc** (DoD, DoR, PR review, release) | `docs/` | None |
| **Migration guide** | `docs/migration-*.md` | None |
| **Agent rule** | `docs/agent-rules/<rule>.md` | None |
| **Skill / command** | `docs/skills/`, `.claude/commands/` | None |
| **Meta doc** (guidelines, BOOKMARKS, templates) | `docs/` | N/A — guidelines govern themselves |
| **User-facing doc** | `packages/<pkg>/docs/user/` | None |

### When to use a template

Use a template when one exists for your doc type. Templates encode the section structure that
reviewers and agents expect. If no template exists, follow the general structure rules below and
the writing style rules in this document.

### When NOT to create a full doc

- Tooling-only packages (`eslint-config`, `tsconfig`, `jest-config`, `cypress`, `plugin-template`,
  etc.) need only a `README.md` with purpose, install, and usage sections.
- Tiny utilities or scripts need only a comment block or a short README.

---

## Writing Style

### Tone and voice

- Write in **imperative, active voice**: "Use X", "Avoid Y", "Run Z".
- Address the reader as "you" or use third-person for system behaviour ("The backend extracts…").
- Be specific: name actual files, directories, component names, and hook names.
- Do not write "this document covers…" — just cover it. Remove meta-commentary.

### Sentence and line length

- Target 80–100 characters per line in prose. Do not hard-wrap code blocks.
- Keep paragraphs to 5 sentences or fewer. Use bullet lists when enumerating 3+ items.

### Emoji policy

- Use `✅` and `❌` only inside comparison tables (do/don't, pass/fail).
- Do not use emoji in prose, headings, or code blocks.

### Code and commands

- Every shell command MUST be in a fenced bash code block.
- Every file tree MUST be in a fenced `text` code block.
- Inline code uses backticks: `fileName.ts`, `npm run dev`, `DEPLOYMENT_MODE`.
- TypeScript/Go/YAML examples MUST use the correct language fence (`ts`, `go`, `yaml`).

### Callouts

Use blockquotes for important notes: `> **Note**: ...` or `> **Warning**: ...`.
Reserve bold (`**text**`) for the first occurrence of a key term or table headers.

### Tables

Use Markdown tables for structured data (routes, env vars, flags, dependencies). Align columns
for readability in source. Every table must have a header row.

---

## Structure Rules

### Universal sections

These sections are recommended for any substantial doc. Omit a section only when it genuinely
does not apply — do not leave it empty or filled with placeholder text.

1. **Title** — H1. Clear, descriptive name. Not "Overview" or "Documentation".
2. **Metadata** (optional but recommended for maintained docs):
   ```
   **Last Updated**: YYYY-MM-DD
   ```
3. **Overview / Purpose** — 1–5 sentences explaining what the doc covers and who it is for.
4. **Body sections** — organized by the doc type (see type-specific guidance below).
5. **Related Docs** — links to other docs in the repo that the reader may need.

### Type-specific structure guidance

**Area / module / package overviews** — use the corresponding template. Templates define the
required sections and their order. Fill every section with real content. No placeholder text
(`[Description]`, `TODO`, etc.) may remain.

**READMEs** — at minimum include:
- What the package/directory contains and why it exists.
- How to install or set up (if applicable).
- How to run or use it.
- Links to more detailed docs if they exist.

**ADRs** — use the standard MADR (Markdown Any Decision Records) structure. Key sections:
Context and Problem Statement, Decision Drivers, Considered Options, Decision Outcome
(with Positive/Negative Consequences), Implementation. Some packages maintain their own ADR
template (e.g., `packages/gen-ai/docs/adr/template.md`) — use the package's template when one
exists, otherwise follow the standard MADR format.

**Guides** (install, deployment, dev setup) — use numbered steps. Each step should have:
- A short heading or bold label.
- The command(s) to run.
- Expected output or how to verify success.
- Troubleshooting for common failures.

**Process docs** (DoD, DoR, PR review, release) — use checklists where appropriate. State who
is responsible for each step.

**Agent rules** — state the trigger (when this rule applies), the constraints, and concrete
examples of correct and incorrect behavior.

**Architecture docs** — include at least one diagram (text-based file tree, Mermaid, or ASCII).
Describe the data flow, not just the directory structure.

### Section heading style

- H2 (`##`) headings: Title Case.
- H3+ (`###`) headings: Sentence case is acceptable.
- Do not skip heading levels (e.g., H1 → H3 without H2).

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Doc file name | `kebab-case.md` | `local-deployment-guide.md` |
| Package overview doc | always `overview.md` | `packages/autorag/docs/overview.md` |
| README | always `README.md` | `packages/autorag/README.md` |
| ADR file | `NNNN-short-title.md` | `0002-system-architecture.md` |
| Template file | `<type>-template.md` | `frontend-template.md` |
| Agent rule | `kebab-case.md` | `cypress-e2e.md` |
| Skill file | `kebab-case.md` | `create-doc.md` |
| Command file | `<scope>.<action>.md` | `docs.create.md` |

Do NOT use spaces or underscores in doc file names.

---

## Linking Conventions

- Declare cross-doc links as **reference-style links** at the top of the file, before the H1
  title:
  ```
  [Architecture]: ../docs/architecture.md
  [Backend Overview]: ../../backend/docs/overview.md
  ```
- Within the doc body, use `[Link Text]` (the reference). This keeps prose readable and links
  maintainable in one place.
- Use **relative paths** for all intra-repo links. Never hardcode `https://github.com/...` for
  files that live in the repo.
- BOOKMARKS.md entries use relative paths from the `docs/` directory.

---

## Metadata

### Last Updated

Include a `**Last Updated**: YYYY-MM-DD` line after the H1 title for any doc that is actively
maintained and expected to evolve with the codebase. This helps readers gauge freshness.

Omit it for stable reference docs that rarely change (e.g., ADR decisions, process definitions).

### Template reference

For docs created from a template, include the template name and version:
```
**Last Updated**: 2026-03-10 | **Template**: frontend-template v1
```

---

## Quality Checklist

Before merging a doc, verify:

- [ ] No placeholder text remains (`[Description]`, `TODO`, `TBD`, `FIXME`).
- [ ] All links resolve (no broken relative paths).
- [ ] Code blocks use the correct language fence.
- [ ] File and directory references match the actual repo structure.
- [ ] The doc is reachable from BOOKMARKS.md or a parent README.
- [ ] The `Last Updated` date is current (if the doc uses one).
- [ ] The doc is under 500 lines (target 300 or fewer for overviews). Split large docs into
      linked sub-pages rather than creating monoliths.

---

## Glossary

| Term | Definition |
|------|-----------|
| **BFF** | Backend-for-Frontend — a Go HTTP server in a package that serves the package's frontend assets, handles auth, and proxies Kubernetes/external API calls. |
| **Module Federation** | Webpack 5 feature used to load packages as micro-frontends into the main ODH Dashboard at runtime. Each package exposes a remote entry. |
| **PatternFly (PF)** | The primary React component library used in the main dashboard and federated packages. v6 is current. |
| **Material UI (MUI)** | Secondary UI library used in Kubeflow deployment mode (e.g., packages/maas). |
| **SSAR** | SelfSubjectAccessReview — Kubernetes API used to check user permissions without relying on Group API. |
| **Extension Point** | A specification defining where the dashboard can be extended (type, properties contract). |
| **Extension** | A concrete instance implementing an Extension Point specification. |
| **OdhDashboardConfig** | The custom Kubernetes CR (`kind: OdhDashboardConfig`) that stores feature flags and dashboard settings. |
| **kube-rbac-proxy** | Authentication gateway replacing the OpenShift OAuth Proxy as of OpenShift 4.19+. Injects auth headers via Envoy filter. |
| **Standalone mode** | Package deployment where the BFF serves both assets and APIs; used for local development. |
| **Federated mode** | Package deployed as a micro-frontend loaded by the main ODH Dashboard via Module Federation. |
| **Kubeflow mode** | Package deployed within Kubeflow Dashboard; uses Material UI instead of PatternFly. |
| **Turbo** | The monorepo task runner (`npx turbo run <task>`) used to run build/test/lint across all packages. |
| **Contract test** | A test that validates the frontend's HTTP expectations against the BFF's OpenAPI schema using the `@odh-dashboard/contract-tests` framework. |
| **ADR** | Architecture Decision Record — a document capturing an important architectural choice, its context, and consequences. |
