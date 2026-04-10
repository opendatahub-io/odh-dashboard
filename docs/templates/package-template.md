[Guidelines]: ../guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Module Federation Docs]: ../module-federation.md

# [Package Name]

**Last Updated**: YYYY-MM-DD | **Template**: package-template v2

## Overview

[1–3 sentences: what this package does, what user problem it solves, and its current maturity level.]

**Package path**: `packages/[package-name]/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | [Mocked clients, no cluster needed] |
| Kubeflow | `make dev-start-kubeflow` | [Material UI theme, live cluster] |
| Federated | `make dev-start-federated` + main dashboard | [PatternFly theme, Module Federation] |

[Which modes apply and any mode-specific behaviour differences worth knowing.]

## Design Intent

[1–3 paragraphs on the architectural approach: why a BFF exists (or not), how data flows from
cluster through BFF to frontend, what the Module Federation remote exposes and how the main
dashboard loads it. Name the remote entry name and the key exposed modules.
Do NOT reproduce file trees or env var tables — describe the design and data flow.]

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this package] |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package via Module Federation in federated mode |
| [Other package] | Package | [What this package needs from it] |
| [k8s resource] | Kubernetes API | [CRUD operations performed] |

## Known Issues / Gotchas

- [Known issue with context and workaround]
- [Deprecated pattern and preferred alternative]
- [Theme constraints, upstream vendoring rules, or other non-obvious traps]

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [BOOKMARKS] — full doc index
