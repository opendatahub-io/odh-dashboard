# autox-core/ui

Shared frontend library consumed by the `automl` and `autorag` packages. Extracted
to eliminate the near-total structural duplication between their `frontend/src/app/`
trees (both generated from the same mod-arch-starter template). Not independently
deployable — no BFF, no standalone app, no build step. See `../services/AGENTS.md`
for the equivalent Go-side architecture; this document mirrors its "autox-core
first" philosophy for the frontend.

## autox-core First

When implementing any new AutoML/AutoRAG UI feature, identify the product-agnostic
parts and build those here first. Add product-specific logic in the consuming
package (automl, autorag) only if it's genuinely needed.

Why: if a capability is built directly in one product package when it could be
generic, the other product will eventually need it too, leading to copy-paste
divergence and inconsistent bug fixes (this is exactly how automl and autorag ended
up with ~20 near-identical files each before this package existed).

## Layered Architecture

```
Primitive -> Feature (autox-core) -> Feature (product) -> Layout -> Page
```

### Primitive

Stateless, hookless, fully controlled via props. Fulfills exactly one
visual/interaction task. Gets all of its data from props — never calls a hook or
fetches data itself. Lives in `components/primitive/`.

Examples: `ManageColumnsModal`, `StopRunModal`, `DeleteRunModal`,
`PipelineVisualization`, tree-view leaf components.

Why: a component with zero hooks and zero business logic is trivially portable —
to another team, to `@odh-dashboard/ui-core`, to `mod-arch-shared`, or to PatternFly
itself — without anyone needing to untangle it from AutoX-specific data-fetching
first.

### Feature (autox-core)

Combines primitives with product-agnostic business logic and hooks. Fulfills
exactly one business need. Gets its data from its own hooks, not from props.

Product-specific customization is injected through exactly two mechanisms, both
supplied by a product-feature wrapper:

- **Strategy object** — a plain data/behavior parameterization (e.g. a `resolveStatuses`
  function, an icon map, a set of stage-id vocabulary) passed as a prop.
- **Named slot / render-prop** — a `React.ReactNode` or render-callback prop for
  injecting product-specific UI into a fixed layout position.

An autox-core feature must never receive fully-resolved product data as a plain
prop in place of calling its own hook — that would silently violate "features get
data from hooks" and make the component's data-fetching behavior inconsistent
depending on who's calling it. If a product needs to supply different data, it does
so by giving the feature a different strategy object, not by pre-fetching on its
behalf.

Lives in `components/feature/`.

Examples: `TopologyVis` (tree view + stage-status resolution behind a strategy
object), `Leaderboard` (`SortableLeaderboardTable`; column definitions/formatters
via strategy), `PipelineRunsTable` (column set/actions hook via strategy),
`ConnectionModal`.

### Feature (product — automl/autorag)

Only created when real product-specific behavior exists. A product-feature wrapper
that's a pure pass-through with no actual customization should not exist — the page
should import the autox-core feature directly instead. Lives in each product
package's own `components/`.

Why: boilerplate wrapper components with no logic just add an extra file and an
extra layer of indirection to read through, for no benefit.

### Layout

Named-slot composition (e.g. `<ResultsLayout header={<Header />} drawer={<Panel />} />`),
consistent with the existing `ApplicationsPage`/`CatalogPageLayout` precedent
elsewhere in the dashboard. Owns cross-cutting page-shell concerns: loading/error
state branching, analytics tracking-once guards, breadcrumb/header composition.
Lives in `layouts/`.

Example: `ResultsLayout` — extracted from the ~90%-identical shell logic in
`AutomlResultsPage`/`AutoragResultsPage` (namespace validation, two-tier
error handling, results-viewed tracking guard, header action row, `StopRunModal`
wiring).

### Page

Lives in the product package (`automl`/`autorag`). Hook-driven conditionals only
(loading/empty/error), wires a layout + feature components together, and should
read almost entirely like markup — minimal-to-no props of its own.

## Cross-Feature State

Features should be mostly self-encapsulating. For the exceptions where sibling
feature components need to coordinate (e.g. selecting a topology node highlights a
leaderboard row), escalate in this order and justify why the previous tier wasn't
sufficient before reaching for the next one:

1. Layout-level context
2. Page-level context
3. Global state (zustand) — last resort

## `api/` and `hooks/`

- `api/<domain>/*` — raw HTTP/k8s fetch functions, no React, no hooks.
- `hooks/<domain>/*` — React Query hooks wrapping the `api/` layer, plus other
  reusable hooks. Mirrors `api/` 1:1 by domain name (e.g. `api/k8s/` <->
  `hooks/k8s/`).
- `hooks/common/` — generic, non-domain-specific hooks (e.g. `useNotification`).
  Has no `api/common/` counterpart.

## Scope Boundary (autox-core/ui vs. ui-core / mod-arch-shared)

`@odh-dashboard/ui-core` (in-repo, consumed dashboard-wide) and `mod-arch-shared`
(external npm package) already provide generic, zero-AutoX-vocabulary primitives
(`TableBase`, `ApplicationsPage`, tracking helpers, etc.).

For this extraction, everything pulled out of automl/autorag lands in
`autox-core/ui` first — **including** pieces that happen to have zero AutoX-specific
vocabulary (e.g. `ManageColumnsModal`, the `UIError` framework). Promoting those
further into `ui-core`/`mod-arch-shared` is an intentionally **deferred** follow-up,
not part of this effort, to keep the migration boundary simple. If you're adding a
brand-new primitive with no AutoX-specific vocabulary going forward, consider
whether it belongs directly in `ui-core` instead of here.

## Consuming autox-core/ui

`autox-core` (this whole package, Go + frontend) follows the same
raw-source-workspace pattern as `ui-core`/`k8s-core`/`plugin-core`: no build step,
no `dist/`, `package.json#exports` points straight at `./ui/src/**/*.ts(x)`.
Already wired as a `dependency` in both `packages/automl/package.json` and
`packages/autorag/package.json`, and auto-discovered by
`packages/app-config`'s `BaseOdhFederationPlugin` for Module Federation
`shared: { singleton: true }` deduping — no manual Module Federation config needed
in either consumer.

```
import { ResultsLayout } from '@odh-dashboard/autox-core/ui/layouts';
import { Leaderboard } from '@odh-dashboard/autox-core/ui/components/feature';
import { StopRunModal } from '@odh-dashboard/autox-core/ui/components/primitive';
```

## Rollout Approach

This package was populated by extracting near-duplicate and similar-shape code
from `packages/automl/frontend/src/app/` and `packages/autorag/frontend/src/app/`
in a single large PR, internally sequenced so the tree stayed buildable at each
step: primitives -> api/hooks -> feature layer -> layouts -> rewire automl ->
rewire autorag -> verify -> docs.

Where AutoRAG had organically evolved a more correct/robust version of shared logic
than AutoML (e.g. `ConnectionModal`'s retry-lock UX, `DeleteRunModal`'s
race-condition fix, `ManageColumnsModal`'s accessibility fix), that version was
promoted as the canonical shared implementation and AutoML inherited the fix as
part of the migration, rather than extracting only the lowest common denominator.
