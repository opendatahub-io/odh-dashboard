[Architecture]: architecture.md
[Best Practices]: best-practices.md
[Testing]: testing.md
[AGENTS.md]: ../AGENTS.md
[CONTRIBUTING.md]: ../CONTRIBUTING.md
[BOOKMARKS]: BOOKMARKS.md

# ODH Dashboard Documentation Guidelines

**Last Updated**: 2026-03-09

## Purpose and Audience

These guidelines govern every Markdown file in the `docs/`, `frontend/docs/`, `backend/docs/`,
and `packages/*/docs/` directories. They exist for two equal audiences:

- **Human developers** — contributors who need to understand, navigate, and modify the codebase.
- **AI agents** — automated agents (Claude, Copilot, etc.) reading docs as context before making
  changes. Docs must be precise, unambiguous, and machine-parseable.

All documentation MUST follow these guidelines. When an existing doc conflicts, update the doc —
not the guidelines.

## Scope

| Directory | Doc type | Template |
|-----------|----------|---------|
| `docs/` | Meta docs (guidelines, BOOKMARKS, templates, skills) | N/A — guidelines govern themselves |
| `frontend/docs/` | Frontend area docs | `docs/templates/frontend-template.md` |
| `backend/docs/` | Backend module docs | `docs/templates/backend-template.md` |
| `packages/<pkg>/docs/` | Package docs | `docs/templates/package-template.md` |

Tooling-only packages (`eslint-config`, `tsconfig`, `jest-config`, `contract-tests`, `cypress`,
`plugin-core`, `plugin-template`, `app-config`) do NOT get a full docs directory — they have a
stub entry in [BOOKMARKS] pointing to their `README.md`.

## Document Types

### Frontend Area Docs

Cover a navigable page group in the main dashboard frontend (`frontend/src/pages/`). Focus on:
the user-facing workflows, React component structure, state management, PatternFly usage, Cypress
coverage, and cross-area interactions.

**Active areas**: Pipelines, Workbenches, Projects, Distributed Workloads, Gen AI, Home/Applications, Admin Settings.

**Deprecated** (doc lives in package, not frontend/docs/): Model Registry, Model Serving, Model Catalog.

### Backend Docs

Cover the Node.js/Express backend (`backend/src/`). Focus on: authentication strategies, routing
patterns, proxy/pass-through architecture, k8s integration, and environment configuration.

### Package Docs

Cover a modular feature package under `packages/`. Focus on: purpose, BFF architecture (Go),
React frontend structure, Module Federation config, deployment modes, OpenAPI spec location,
and interactions with the main dashboard and other packages.

## Writing Style

### Tone and voice

- Write in **imperative, active voice**: "Use X", "Avoid Y", "Run Z".
- Address the reader directly as "you" or use third-person for system behaviour ("The backend
  extracts…").
- Be specific: name actual files, directories, component names, and hook names.
- Do not write "this document covers…" — just cover it. Remove meta-commentary.

### Sentence and line length

- Target 80–100 characters per line in prose. Do not hard-wrap code blocks.
- Keep paragraphs to ≤ 5 sentences. Use bullet lists when enumerating 3+ items.

### Emoji policy

- Use `✅` and `❌` only inside comparison tables (do/don't, pass/fail).
- Do not use emoji in prose, headings, or code blocks.
- Do not use decorative emoji at the start of section headings.

### Code and commands

- Every shell command MUST be in a fenced bash code block.
- Every file tree MUST be in a fenced `text` code block.
- Inline code uses backticks: `fileName.ts`, `npm run dev`, `DEPLOYMENT_MODE`.
- TypeScript/Go/YAML examples MUST use the correct language fence (`` ```ts ``, `` ```go ``, `` ```yaml ``).

### Callouts

Use blockquotes for important notes: `> **Note**: ...` or `> **Warning**: ...`.
Reserve bold (`**text**`) for the first occurrence of a key term or table headers.

## Structure Rules

### Common sections (all doc types)

Every doc MUST have these sections in this order:

1. `# [Title]` — H1 title = area/module/package name
2. Metadata block (inline, not a section) immediately after H1:
   ```
   **Last Updated**: YYYY-MM-DD | **Template**: [template-name] v[version]
   ```
3. `## Overview` — 1–3 sentence purpose statement + audience
4. `## Architecture` — structure diagram (text tree or description), key design decisions
5. `## Key Concepts` — glossary of domain-specific terms used in this doc
6. `## Quick Start` — minimal steps to run / develop this area locally
7. `## Testing` — how to run tests; test types and their locations
8. `## Interactions` — explicit named dependencies (other areas, packages, backend routes)
9. `## Known Issues / Gotchas` — caveats, deprecated paths, common pitfalls
10. `## Related Docs` — links to related docs in this system

### Frontend-specific sections (after Architecture, before Key Concepts)

- `## UI Entry Points` — nav item names, routes (`/path`), feature flags required
- `## State Management` — React contexts, hooks (`useFetchState`, custom hooks), stores
- `## PatternFly Component Usage` — key PF components used; override patterns if any
- `## Cypress Test Coverage` — which Cypress test directories cover this area

### Backend-specific sections (after Architecture, before Key Concepts)

- `## API Routes` — table: Method | Path | Handler File | Description
- `## Middleware` — middleware chain; auth chain position
- `## Environment Variables` — table: Variable | Description | Default | Required
- `## Kubernetes Integration` — Resource models, SDK usage, SSAR patterns

### Package-specific sections (after Overview, before Architecture)

- `## Deployment Modes` — standalone / kubeflow / federated; how to start each
- `## BFF Architecture` — Go BFF structure, OpenAPI spec location, mock flags. Write "Not applicable — this package has no BFF." if no BFF exists.
- `## OpenAPI Specification` — path to YAML file, link to key endpoints. Write "Not applicable." if no BFF.
- `## Module Federation` — Webpack config file path, remote entry name, how the main dashboard loads this package

### Section ordering summary

**Frontend**: Overview → UI Entry Points → Architecture → State Management → PatternFly Component Usage → Key Concepts → Quick Start → Testing → Cypress Test Coverage → Interactions → Known Issues → Related Docs

**Backend**: Overview → Architecture → API Routes → Middleware → Environment Variables → Kubernetes Integration → Key Concepts → Quick Start → Testing → Interactions → Known Issues → Related Docs

**Package**: Overview → Deployment Modes → BFF Architecture → OpenAPI Specification → Module Federation → Architecture → Key Concepts → Quick Start → Environment Variables → Testing → Interactions → Known Issues → Related Docs

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Frontend area doc | `kebab-case.md` | `distributed-workloads.md` |
| Backend doc | `kebab-case.md` | `overview.md` |
| Package doc | always `overview.md` | `packages/autorag/docs/overview.md` |
| Template file | `<type>-template.md` | `frontend-template.md` |
| Skill file (canonical) | `kebab-case.md` | `create-doc.md` |
| Skill file (command) | `docs.<action>.md` | `docs.create.md` |
| Section headings | Title Case for H2; Sentence case acceptable for H3+ | `## Key Concepts`, `### Auth flow` |

Do NOT use spaces or underscores in doc file names.

## Linking Conventions

- Declare all external and cross-doc links as **reference-style links** at the top of the file,
  before the H1 title. Example:
  ```
  [Architecture]: ../docs/architecture.md
  [Backend Overview]: ../../backend/docs/overview.md
  ```
- Within the doc body, use `[Link Text]` (the reference). This keeps prose readable and links
  maintainable in one place.
- Use **relative paths** for all intra-repo links. Never hardcode `https://github.com/...` for
  files that live in the repo.
- BOOKMARKS.md entries use relative paths from the `docs/` directory.

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
| **Deprecation (frontend)** | A frontend page or area that has been moved to a modular package. The `frontend/src/pages/` code may still exist but is no longer the canonical implementation. |
