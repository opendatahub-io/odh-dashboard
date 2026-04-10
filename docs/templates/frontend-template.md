[Guidelines]: ../guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md

# [Area Name]

**Last Updated**: YYYY-MM-DD | **Template**: frontend-template v2

## Overview

[1–3 sentences: what this area does, who uses it, and what user workflows it enables.]

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| [Nav label] | `/path` | `FLAG_NAME` or None |

[How users reach this area: nav item, project tab, direct URL, etc.]

## Design Intent

[1–3 paragraphs explaining *why* the area is structured the way it is: the page → concept →
API call flow, what context providers own, how data moves from the API to the UI. Name the
primary context/provider (e.g., `PipelinesContext`) and the dominant data-fetching pattern.
Do NOT enumerate every hook or file — describe the design philosophy.]

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this area] |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| [Package/Area name] | Package / Frontend Area / Backend Route | [What this area needs from it] |

[Describe the primary data flows between this area and its dependencies.]

## Known Issues / Gotchas

- [Known issue or caveat with context]
- [Deprecated path or pattern to avoid, with the preferred alternative]
- [Any non-obvious PF component overrides or theme constraints]

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
