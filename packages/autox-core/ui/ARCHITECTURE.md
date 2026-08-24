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

Stateless, fully controlled via props, with **no business logic, no business
concepts, and no business terminology** — not even in prop names, hardcoded
strings, or imports. Fulfills exactly one visual/interaction task. Lives in
`components/primitive/`.

The litmus test: could this be contributed to PatternFly today, as-is? If a
reviewer with zero knowledge of AutoML/AutoRAG/Experiments/Pipelines couldn't
understand what the component does purely from reading its code, it is not a
primitive.

Concretely, a primitive must **not**:

- Hardcode any AutoX-domain word (Experiment, Pipeline Run, Project, Managed
  Pipelines, etc.) into rendered text, prop names, or type names.
- Import anything from `@odh-dashboard/internal/concepts/*` or any other
  domain-specific internal module.
- Fetch data or read shared app/business state via a hook.

A primitive **may**:

- Use framework-level hooks that don't fetch or own business data —
  `useNavigate`/`useParams` for routing side effects the caller controls via a
  route string prop, or `useState` for purely local UI state (e.g. a modal's
  own open/checked state) that doesn't need to be exposed to callers.
- Depend on `@odh-dashboard/ui-core` — the dashboard's own generic component
  library is the same class of portable, zero-vocabulary dependency a
  primitive here is allowed to build on (e.g. `DashboardModalFooter`,
  `EmptyDetailsView`).

Examples: `ActionableEmptyState` (icon + title + body + one action button —
backs domain wrappers like `NoProjects`/`RunInProgress`), `SpinnerEmptyState`
(spinner + title + description + footer slot — backs `PipelineServerStarting`),
`ConfirmationModal` (modal shell with a submit/cancel footer — backs
`EnableManagedPipelinesModal`), tree-view leaf components.

Why: a component with zero business vocabulary and zero business logic is
trivially portable — to another team, to `@odh-dashboard/ui-core`, to
`mod-arch-shared`, or to PatternFly itself — without anyone needing to untangle
it from AutoX-specific concepts first. A component parameterized only by
`productName` (e.g. an old `InvalidExperiment` that still hardcoded "Experiment
not found") is **not** portable in this sense: the domain concept ("Experiment")
is still baked in, only the product name varies. That component belongs in
Feature (autox-core) instead — see below.

### Feature (autox-core)

Combines primitives with shared AutoX business logic and/or vocabulary
(Experiment, Project, Pipeline Run, Managed Pipelines, etc.), reused across
AutoML and AutoRAG. Fulfills exactly one business need. Lives in
`components/feature/`.

Hooks are optional here, not a defining trait. Use a hook (React Query, etc.)
when the component genuinely needs to fetch data or own shared state. Plenty of
legitimate features are purely presentational domain wrappers around a
primitive with no hooks beyond routing — e.g. `RunInProgress` calls
`useNavigate` only to wire `ActionableEmptyState`'s action button to a
caller-supplied route. What makes a component a feature rather than a
primitive is the AutoX vocabulary it carries, not whether it owns a
data-fetching hook.

Product-specific customization is injected through one of these, supplied by a
product-feature wrapper or a page:

- **Plain data props** (e.g. `productName: string`, an icon component, a route
  string) — the right choice for features with no data-fetching hook of their
  own; there's no hook to bypass.
- **Strategy object** — a plain data/behavior parameterization (e.g. a `resolveStatuses`
  function, an icon map, a set of stage-id vocabulary) passed as a prop.
- **Named slot / render-prop** — a `React.ReactNode` or render-callback prop for
  injecting product-specific UI into a fixed layout position.

For features that *do* own data via a hook, that feature must never receive
fully-resolved product data as a plain prop in place of calling its own hook —
that would silently make the component's data-fetching behavior inconsistent
depending on who's calling it. If a product needs to supply different data to a
hook-owning feature, it does so via a strategy object, not by pre-fetching on
its behalf.

Examples: `InvalidExperiment`/`InvalidPipelineRun`/`NoProjects`/`RunInProgress`
(domain-vocabulary wrappers around `ActionableEmptyState`, no data hooks),
`PipelineServerStarting` (wraps `SpinnerEmptyState`, imports
`pipelinesBaseRoute`), `EnableManagedPipelinesModal` (wraps `ConfirmationModal`,
imports `ManagedPipelinesSettingsSection`), `EmptyExperimentsState` (wraps
ui-core's `EmptyDetailsView`), `TopologyVis` (tree view + stage-status
resolution behind a strategy object), `Leaderboard` (`SortableLeaderboardTable`;
column definitions/formatters via strategy), `PipelineRunsTable` (column
set/actions hook via strategy), `ConnectionModal`.

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
`autox-core/ui` first — **including** pieces that turn out to pass the Primitive
litmus test above (e.g. the `UIError` framework, and any `components/primitive/`
entry such as `ActionableEmptyState`). Promoting those further into
`ui-core`/`mod-arch-shared` is an intentionally **deferred** follow-up, not part
of this effort, to keep the migration boundary simple. If you're adding a
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
import { Leaderboard, RunInProgress } from '@odh-dashboard/autox-core/ui/components/feature';
import { ActionableEmptyState } from '@odh-dashboard/autox-core/ui/components/primitive';
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
