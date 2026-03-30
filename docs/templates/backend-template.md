[Guidelines]: ../guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Architecture]: ../architecture.md

# [Module / Topic Name]

**Last Updated**: YYYY-MM-DD | **Template**: backend-template v1

## Overview

[1–3 sentences: what this module/topic covers, what problem it solves, and who needs to understand it.]

## Architecture

```text
[File tree of the key source files for this module]
backend/src/
├── [module]/
│   ├── [handler].ts
│   └── [util].ts
└── routes/
    └── [route-file].ts
```

[1–2 paragraphs describing the architectural approach and key design decisions.]

## API Routes

| Method | Path | Handler File | Description |
|--------|------|-------------|-------------|
| `GET` | `/api/[path]` | `backend/src/routes/[file].ts` | [Description] |
| `POST` | `/api/[path]` | `backend/src/routes/[file].ts` | [Description] |

[Note which routes use the service account (proxy on behalf of user) vs direct user token.]

## Middleware

| Middleware | File | Position in chain | Purpose |
|-----------|------|------------------|---------|
| [MiddlewareName] | `backend/src/[path].ts` | [before/after auth] | [Purpose] |

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `VAR_NAME` | [Description] | `default-value` | Yes / No |

[Reference to `.env.local.example` for full variable list.]

## Kubernetes Integration

**Resource models used**:
- [`[ResourceKind]`]([link]) — [how it's used]

**SDK calls**:
```ts
// Example k8s call pattern
k8sGetResource({ model: ResourceModel, queryOptions: { name, ns } });
```

**SSAR patterns** (permission checks):
```ts
// Example SSAR check
checkAccess({ group, resource, verb });
```

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this module] |

## Quick Start

```bash
# Start backend in development mode
cd backend
npm run start:dev
# Backend available at http://localhost:8080
```

[Any module-specific setup steps or cluster requirements.]

## Testing

```bash
# Run backend unit tests
npm run test:unit -- --testPathPattern="backend"
```

Location: `backend/src/__tests__/`

[Describe what is and isn't covered by automated tests for this module.]

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
