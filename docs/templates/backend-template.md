[Guidelines]: ../guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Architecture]: ../architecture.md

# [Module / Topic Name]

**Last Updated**: YYYY-MM-DD | **Template**: backend-template v2

## Overview

[1–3 sentences: what this module/topic covers, what problem it solves, and who needs to understand it.]

## Design Intent

[1–3 paragraphs explaining the architectural approach and key design decisions. Describe the
call types (service-account vs pass-through), the routing/autoload conventions, middleware
chain, and caching strategy. Do NOT reproduce file trees — describe the patterns.]

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/[path]` | user-token / service-account | [Description] |

[Note which routes use the service account vs the user's bearer token.]

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this module] |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| [Service/Area] | Frontend Area / k8s API / External Service | [What this module needs from it] |

## Known Issues / Gotchas

- [Known issue or caveat with context]
- [Deprecated pattern and preferred alternative]

## Related Docs

- [Guidelines] — documentation style guide
- [Architecture] — full backend architecture reference
- [BOOKMARKS] — full doc index
