[Guidelines]: ../guidelines.md
[BOOKMARKS]: ../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md

# [Area Name]

**Last Updated**: YYYY-MM-DD | **Template**: frontend-template v1

## Overview

[1–3 sentences: what this area does, who uses it, and what user workflows it enables.]

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| [Nav label] | `/path` | `FLAG_NAME` or None |

[Describe how users reach this area: left navigation, project tabs, direct URL, etc.]

## Architecture

```text
[File tree of the key source files for this area]
frontend/src/pages/[area]/
├── [PageComponent].tsx
├── [SubComponent]/
└── utils/
```

[1–2 paragraphs describing the structural approach: page → concept → API call flow.]

## State Management

**Contexts used**:
- [`[ContextName]`]([relative path]) — [what state it holds]

**Key hooks**:
- `[useHookName]` in `[file path]` — [what it fetches/manages]

**Data flow**: [brief description of how data moves from API → hook → component]

## PatternFly Component Usage

| Component | Usage in this area |
|-----------|--------------------|
| `[PFComponent]` | [how it's used] |

[Note any PF overrides from `frontend/src/concepts/dashboard/` that apply here.]

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this area] |

## Quick Start

```bash
# Start the main dashboard frontend pointing at a remote cluster
cd frontend
oc login <cluster-url>
npm run start:dev:ext
# Navigate to http://localhost:4010[/route]
```

[Any area-specific setup steps, feature flags to enable, or test data requirements.]

## Testing

### Unit Tests

Location: `frontend/src/pages/[area]/__tests__/`

```bash
npm run test:unit -- --testPathPattern="[area]"
```

### Cypress Mock Tests

Location: `packages/cypress/cypress/tests/mocked/[area]/`

```bash
npm run test:cypress-ci -- --spec "**/[area]/**"
```

### Cypress E2E Tests

Location: `packages/cypress/cypress/tests/e2e/[area]/`

```bash
npm run cypress:run -- --spec "**/[area]/**"
```

## Cypress Test Coverage

[Describe which user flows are covered by Cypress mock tests vs E2E tests. Note any gaps.]

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| [Package/Area name] | Package / Frontend Area / Backend Route | [What this area needs from it] |

[Describe the primary data flows between this area and its dependencies.]

## Known Issues / Gotchas

- [Known issue or caveat with context]
- [Deprecated path or pattern to avoid, with the preferred alternative]

## Related Docs

- [Guidelines] — documentation style guide
- [BOOKMARKS] — full doc index
- [Backend Overview] — backend architecture reference
