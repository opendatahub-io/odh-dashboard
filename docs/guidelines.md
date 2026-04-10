[Architecture]: architecture.md
[Best Practices]: best-practices.md
[Testing]: testing.md
[AGENTS.md]: ../AGENTS.md
[CONTRIBUTING.md]: ../CONTRIBUTING.md
[BOOKMARKS]: ../BOOKMARKS.md

# ODH Dashboard Documentation Guidelines

**Last Updated**: 2026-04-10

## Core Principles

1. **Accuracy over completeness** — A short, correct doc beats a long, stale one. Delete
   outdated content rather than marking it `TODO`.
2. **Added value only** — Every section must tell the reader something they cannot trivially
   discover by reading the source code. Do not reproduce file trees (use `ls`), enumerate
   every hook (read the code), or list env vars (check `.env.local.example`). Focus on *why*
   and *how things connect*, not *what files exist*.
3. **Single source of truth** — Every fact lives in one place. Link, don't duplicate.
4. **Resilience to churn** — Structure docs so a routine bug fix or file rename does not
   invalidate them. Describe design patterns and data flows, not individual file paths.
   Specific paths are acceptable only in Key Concepts, Interactions, and Known Issues where
   the path itself *is* the knowledge.
5. **Navigability** — Every doc must be reachable from [BOOKMARKS] or a parent README.

## Document Types

| Type | Location | Template |
|------|----------|----------|
| Area overview (frontend) | `frontend/docs/<area>.md` | `docs/templates/frontend-template.md` |
| Module overview (backend) | `backend/docs/<module>.md` | `docs/templates/backend-template.md` |
| Package overview | `packages/<pkg>/docs/overview.md` | `docs/templates/package-template.md` |
| README | Root, package, or sub-directory | None |
| ADR | `packages/<pkg>/docs/adr/NNNN-*.md` | MADR format or package ADR template |
| Guide (install, deploy, dev) | `packages/<pkg>/docs/` | None |
| Agent rule | `.claude/rules/<rule>.md` | None |

Tooling-only packages (`eslint-config`, `tsconfig`, etc.) need only a `README.md`.

## Template Rules

Use templates when one exists for your doc type. Templates define the required sections.

**Omit sections that don't apply** — never include "Not applicable" or empty sections.
If a template section is genuinely irrelevant to the subject, skip it entirely.

No placeholder text (`[Description]`, `TODO`, `TBD`) may remain in a finished doc.

## Writing Style

- Imperative, active voice: "Use X", "Avoid Y".
- Be specific when naming domain concepts, CRDs, feature flags, and API routes. Avoid file paths in prose unless the path itself is the knowledge (see principle 4).
- Paragraphs <= 5 sentences. Bullet lists for 3+ items.
- Fenced code blocks with correct language tags (`bash`, `ts`, `go`, `yaml`, `text`).
- Blockquotes for callouts: `> **Note**: ...` or `> **Warning**: ...`.
- Tables for structured data. Every table needs a header row.
- Reference-style links declared at the top of the file, before the H1:
  ```
  [Architecture]: ../docs/architecture.md
  ```
- Relative paths for all intra-repo links. Never hardcode GitHub URLs.
- H2 headings: Title Case. H3+: Sentence case is acceptable.
- Do not skip heading levels (H1 → H3 without H2).

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Doc file | `kebab-case.md` | `local-deployment-guide.md` |
| Package overview | always `overview.md` | `packages/autorag/docs/overview.md` |
| README | always `README.md` | `packages/autorag/README.md` |
| ADR | `NNNN-short-title.md` | `0002-system-architecture.md` |

## Metadata

For actively maintained docs, include after the H1:

```
**Last Updated**: YYYY-MM-DD | **Template**: <template-name> v<N>
```

Omit for stable docs that rarely change (ADR decisions, process definitions).

## Quality Checklist

- [ ] No placeholder text remains.
- [ ] All links resolve.
- [ ] The doc is reachable from BOOKMARKS.md or a parent README.
- [ ] The `Last Updated` date is current.
- [ ] Under 300 lines (hard limit 500). Split large docs into linked sub-pages.
- [ ] Every section adds value an agent cannot get faster by reading source code.

## Glossary

| Term | Definition |
|------|-----------|
| **BFF** | Backend-for-Frontend — a Go HTTP server that serves frontend assets, handles auth, and proxies k8s/external API calls. |
| **Module Federation** | Webpack 5 feature loading packages as micro-frontends at runtime. |
| **PatternFly (PF)** | Primary React component library (v6). |
| **Material UI (MUI)** | Secondary UI library used in Kubeflow deployment mode. |
| **SSAR** | SelfSubjectAccessReview — k8s API for permission checks without Group API. |
| **Extension Point** | Specification defining where the dashboard can be extended. |
| **Extension** | Concrete instance implementing an Extension Point. |
| **OdhDashboardConfig** | k8s CR (`opendatahub.io/v1alpha`) storing feature flags and settings. |
| **kube-rbac-proxy** | Auth gateway injecting auth headers via Envoy filter (OpenShift 4.19+). |
| **Standalone mode** | BFF serves both assets and APIs; used for local dev. |
| **Federated mode** | Package loaded as micro-frontend via Module Federation. |
| **Kubeflow mode** | Package deployed within Kubeflow Dashboard; uses MUI. |
| **Turbo** | Monorepo task runner (`npx turbo run <task>`). |
| **Contract test** | Validates frontend HTTP expectations against the BFF's OpenAPI schema. |
| **ADR** | Architecture Decision Record — captures an architectural choice and consequences. |
