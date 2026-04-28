# [Package Name]

## Overview

- What this package does
- What user problem it solves
- Current maturity level

## Design Intent

- Whether a BFF is used or not, and what alternative services it uses instead
- Key architectural decisions that aren't standard UI → BFF
- Anything out of the ordinary in data flow or integration
- Do NOT reproduce file trees or env var tables

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
