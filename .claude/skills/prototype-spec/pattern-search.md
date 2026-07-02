# Step 6: Find patterns + review design

Prefer direct search and file reads. For comprehensive searches across many directories (e.g., finding all existing patterns for a complex feature area), an **Explore agent** in background is acceptable — it can search in parallel while you continue with other analysis.

## Step 6a: Determine target context

Before searching, determine WHERE the feature will be implemented:

```bash
# If the ticket targets a federated package, check its dependencies:
cat packages/<name>/frontend/package.json | grep -c 'mod-arch-core'
```

| Target | Shared utilities | Import prefix |
|--------|-----------------|---------------|
| `frontend/src/` (host app) | `@odh-dashboard/internal` | `#~/` |
| `packages/<library-plugin>/` (model-serving, kserve, etc.) | `@odh-dashboard/internal` | `@odh-dashboard/internal/...` |
| `packages/<federated>/frontend/` (gen-ai, automl, autorag, eval-hub, maas, mlflow, etc.) | **`mod-arch-core`** for API/hooks/utilities + `@odh-dashboard/internal` for shared types/components | `mod-arch-core/...` and `@odh-dashboard/internal/...` |

**Key distinction for federated packages:** `mod-arch-core` provides infrastructure (API client, `useFetchState`, `useNamespaces`, `useNotification`, error handling, K8s client). `@odh-dashboard/internal` provides shared UI components and types. Federated packages use BOTH — check the target package's existing imports.

## Step 6b: Search for patterns

**For host app or library plugin features:**
```text
frontend/src/concepts/         -- domain modules (types, hooks, context)
frontend/src/components/       -- shared components and PF wrappers
frontend/src/utilities/        -- utility functions and hooks
frontend/src/hooks/            -- global hooks
frontend/src/api/              -- API layer (28 K8s resource files in api/k8s/)
frontend/src/pages/            -- page components
frontend/src/routes/           -- route definitions
```

**For federated package features, also check:**
```text
packages/<name>/frontend/src/  -- the package's own components and patterns
mod-arch-core (in node_modules) -- hooks: useFetchState, useNamespaces,
                                   useNotification, useSettings, useAPIState
```

**For cross-domain features**, check sibling packages' exported APIs via `package.json` exports. Import via `@odh-dashboard/<package>/<export-path>` — never internal modules.

For each major element: find a similar existing component, note its pattern, recommend following it.

## Step 6c: Backend location guidance

If the prototype implies new API calls:

| API type | Where to build |
|----------|---------------|
| Package-specific | `packages/<name>/bff/` (Go, httprouter) |
| Shared cross-package | `distributions/core-bff/` (Go, replacing Fastify) |
| K8s resource CRUD | Existing `/api/k8s` passthrough — no new endpoint |
| Avoid | `backend/` (legacy Fastify — being replaced) |

## Step 6d: Review prototype for design issues

### PF MCP validation (if available)

If the `patternfly-docs` MCP server is configured, query it for each PF component:

```text
searchPatternFlyDocs({ searchQuery: "<ComponentName>" })
usePatternFlyDocs({ name: "<ComponentName>" })
```

Or via MCP resources (stable across versions):
```text
ReadMcpResourceTool(server: "patternfly-docs", uri: "patternfly://schemas/<ComponentName>")
```

Returns current props, types, deprecation status. Falls back to manual checks if unavailable.

### Manual checks (always apply)

1. **Inline styles** — inline with PF tokens (`var(--pf-t--*)`) is acceptable. Inline with hardcoded values → flag it. Priority: PF props > layout components > utility classes > inline with tokens > SCSS.

2. **Wrong PF component choices** — raw `<table>` vs PF `Table`, `<div>` flexbox vs `Flex`/`Stack`.

3. **Hardcoded values** — colors, spacing, fonts should use PF tokens.

4. **Missing accessibility** — buttons without `aria-label`, tables without `aria-label`, forms without labels.

5. **Custom CSS overriding PF** — `!important` overrides should use component variables.

6. **Deprecated PF components** — PF MCP detects these automatically. Otherwise check: `Chip`/`ChipGroup` → `Label`/`LabelGroup`, `TextContent` → `Content`, old v5 APIs.

7. **Missing edge cases** — loading, error, empty states.

8. **Inconsistencies with odh-dashboard patterns** — different modal footer, empty state, table structure from what the dashboard uses.

Flag issues — don't silently fix them.

### PF token translation

Prototypes use PF v6 **global** tokens (`--pf-v6-global--*`). odh-dashboard uses PF v6 **semantic** tokens (`--pf-t--*`). Common translations:

| Prototype token | odh-dashboard token |
|---|---|
| `--pf-v6-global--BorderColor--100` | `--pf-t--global--border--color--default` |
| `--pf-v6-global--Color--200` | `--pf-t--global--text--color--subtle` |
| `--pf-v6-global--spacer--md` | `--pf-t--global--spacer--md` |
| `--pf-v6-global--FontSize--sm` | `--pf-t--global--font--size--sm` |

When the spec references prototype styles, always note the translation.

### Rules references

Read before recommending implementation:
- `.claude/rules/css-patternfly.md` — PF v6 styling, wrapper components, token usage
- `.claude/rules/react.md` — React patterns, hooks conventions
- `.claude/rules/conventions.md` — TypeScript, naming, file organization
