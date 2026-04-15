# [Area Name]

## Overview

- What this area does
- Who uses it
- What user workflows it enables

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| [Nav label] | `/path` | `FLAG_NAME` or None |

- How users reach this area: nav item, project tab, direct URL, etc.

## Design Intent

- Why the area is structured the way it is
- Page → concept → API call flow
- What context providers own and how data moves from API to UI
- Name the primary context/provider and the dominant data-fetching pattern
- Do NOT enumerate every hook or file — describe the design philosophy

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this area] |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| [Package/Area name] | Package / Frontend Area / Backend Route | [What this area needs from it] |

## Known Issues / Gotchas

- [Known issue or caveat with context]
- [Deprecated path or pattern to avoid, with the preferred alternative]
- [Any non-obvious PF component overrides or theme constraints]
