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

Examples: `InvalidExperiment`/`InvalidPipelineRun`/`InvalidProject`/`NoProjects`/`RunInProgress`
(domain-vocabulary wrappers around `ActionableEmptyState`, no data hooks),
`PipelineServerStarting` (wraps `SpinnerEmptyState`, imports
`pipelinesBaseRoute`), `EnableManagedPipelinesModal` (wraps `ConfirmationModal`,
imports `ManagedPipelinesSettingsSection`), `EmptyExperimentsState` (wraps
ui-core's `EmptyDetailsView`), `TopologyVis` (tree view + stage-status
resolution behind a strategy object), `Leaderboard` (`SortableLeaderboardTable`;
column definitions/formatters via strategy), `PipelineRunsTable` (column
set/actions hook via strategy), `ConnectionModal`, `ProjectSelectorNavigator`
(namespace persistence with product routing/tracking callbacks), `SecretSelector`
(secret-list fetching and generic required-key validation; secret type vocabulary is
supplied by the consuming product).

`ConnectionModal` is an AutoX feature because it owns connection-type selection, Secret assembly,
and the retry-lock state machine. Its flat outcome and error callbacks keep product tracking,
failure presentation, and retry wording in AutoML/AutoRAG while the shared feature owns the form,
Secret creation, duplicate-submit protection, and created-Secret reuse.

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

## AutoX API Context

`context/AutoXApiContext.tsx` provides dependency injection for shared AutoX API
clients. Each consuming product must place `AutoXApiProvider` at its application
boundary, above any autox-core feature or hook that reads it. The product owns
the URL prefix and BFF version it passes to the provider. `AutoXApiProvider`
constructs the shared K8s, S3, and Pipelines clients through the factories in
`api/`; product providers must not assemble or inject those clients.

The context is intentionally API-only: `useAutoXApi()` returns `k8s`, `s3`, and
`pipelines` as top-level values. It does not know the product identity, URL
configuration, product pages, product provider wrappers, or product-specific data
schemas. It must not import types or implementations from `hooks/**`.

## `api/` and `hooks/`

- `api/<domain>/*` — raw HTTP/k8s fetch functions, no React, no hooks.
- `hooks/<domain>/*` — React Query hooks wrapping the `api/` layer, plus other
  reusable hooks. Mirrors `api/` 1:1 by domain name (e.g. `api/k8s/` <->
  `hooks/k8s/`).
- `hooks/common/` — generic, non-domain-specific hooks (e.g. `useNotification`).
  Has no `api/common/` counterpart.

Raw network access belongs only in `api/`. The context provider constructs the
URL-bound shared clients; product `app/api` modules may construct clients for
non-context consumers, but must not supply the context. Hooks call the context
clients and add React state/query behavior. Neither context nor hooks should
duplicate raw fetch logic.

## Known Issues: Peer Dependency Version Skew

`packages/autox-core` has no `node_modules` of its own for its context-sensitive
peer dependencies (`react`, `@tanstack/react-query`, `zod`, etc.) — same as
`react-router`/`mod-arch-core` before it. Any bare import of one of these from
`ui/src/**` resolves via Node's directory walk-up, which can land on a
**different, unrelated version** hoisted at the monorepo root instead of the
version AutoML/AutoRAG actually use. Two concrete manifestations hit so far:

- **`react-router`/`mod-arch-core` (jest only)**: root's hoisted copy differs
  from AutoML/AutoRAG's own nested copy → dual React Context instances at test
  runtime. Fixed via `moduleNameMapper` in both products' `jest.config.js` (see
  git history on those files). Does not affect production webpack builds:
  `resolve.symlinks: false` in both products' webpack config makes the bundler
  resolve `autox-core`'s files as if physically nested under the *consuming*
  product's own `node_modules`, picking up the correct local copy.
- **`@tanstack/react-query`/`zod` (type-checking + potential runtime
  correctness)**: root's hoisted copies are pinned to an **unrelated older
  major version** (`@tanstack/react-query@^4.44.0`, `zod@^3.25.76`), needed by
  the main dashboard `frontend` app and `packages/observability`'s
  `@perses-dev/*` peer graph — nothing to do with AutoX. `autox-core` itself
  declares the correct `^5.90.20` / `^4` ranges as `peerDependencies`, but
  peer-only declarations don't get a local install for `autox-core`'s own
  tooling to resolve against.
  - `tsc` compiling a consumer's full program (e.g. AutoML's) that transitively
    includes an `autox-core` file with such an import will resolve it against
    root's wrong major version, causing real type errors — or, if the
    generic surface is complex enough (e.g. `@tanstack/react-query`'s
    `refetchInterval`/`placeholderData` combined with an *additional*,
    unresolved generic type parameter of our own), can make `tsc` **run out
    of memory** entirely rather than error cleanly.
  - **Fix applied**: `autox-core/package.json` also declares
    `@tanstack/react-query` and `zod` as `devDependencies`, pinned to the
    **exact** version string AutoML/AutoRAG currently resolve (not a range —
    a range lets npm pick an independent, possibly different patch version
    for `autox-core`'s own nested copy, which reintroduces the same problem
    one patch level down). This gives `autox-core` its own physically
    separate module instance, but confirmed empirically safe as long as the
    version is exactly aligned: zod v4 doesn't use JS `#private`/TS `private`
    class fields for its public API (confirmed via inspection), so its types
    are compared **structurally** by `tsc`, not nominally — two separately
    loaded instances of the *identical* version type-check as compatible.
    `instanceof z.ZodError` across the two instances was also confirmed to
    work correctly at runtime (zod implements this robustly across module
    instances).
  - **This is a maintenance trap, not a permanent fix**: if AutoML/AutoRAG's
    own resolved patch version of `zod` or `@tanstack/react-query` ever drifts
    from `autox-core`'s pinned `devDependency` (e.g. an unrelated `npm update`
    bumps one product's lockfile but not the pin here), the exact-match
    invariant silently breaks and the OOM/type-mismatch failure mode can
    reappear with no obvious link to its actual cause. **Whenever you bump
    `zod` or `@tanstack/react-query` in AutoML's or AutoRAG's own
    `package.json`, update the matching exact-pinned `devDependency` version
    here too.**
  - Real root cause (not fixed, out of scope): `packages/observability`'s
    `@perses-dev/*` chain and the main `frontend` app are pinned to
    `zod@^3`/`@tanstack/react-query@^4`, which conflicts with `autox-core`'s
    `peerDependency` ranges at the root `npm install` resolution level (a
    plain `npm install` after adding any new dependency to `autox-core`
    reliably reproduces an `ERESOLVE` error over this, requiring
    `--legacy-peer-deps` to bypass). Fixing this for real means either
    upgrading `frontend`/`observability` off zod v3 / react-query v4, or
    accepting a `--legacy-peer-deps` lockfile rewrite repo-wide — both
    explicitly out of scope for this package's own work and require separate,
    deliberate sign-off (same class of blocker already on record for
    `ManageColumnsModal`'s `@patternfly/react-component-groups`/
    `@patternfly/react-drag-drop` dependencies, see git history).

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
