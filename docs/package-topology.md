# Package Topology and Import Rules

Rules governing the dependency hierarchy and import boundaries for all packages in the
ODH Dashboard monorepo.

> **Aligned**: July 2, 2026. Attendees: Andy Stoneberg, Christian Vogt,
> Lucas Fernandez Aragon, Andrew Ballantyne, Paulo Rego.

---

## 1. Package Layers

Packages fall into distinct layers. A package may only have runtime dependencies on
packages in its own layer or below — never above.

| Layer | What lives here | Packages |
|-------|-----------------|----------|
| **Core shared libraries** | Extension framework, shared UI, K8s types, pure utilities. | `k8s-core`, `plugin-core`, `ui-core`, `app-config`, `foundation` (not yet extracted) |
| **Feature packages** | Domain-specific frontend functionality and backend infrastructure. Depend on core shared libraries and the app shell. | `model-serving`, `kserve`, `notebooks`, `gen-ai`, `model-registry`, `core-bff`, etc. |
| **App shell** | Shared framework (masthead, sidebar, routing, error boundary) that distributions extend. | `distributions/base/` |
| **Distributions** | Concrete, deployable dashboard variants. Composition roots that wire everything together. | `distributions/rhaii/`, `distributions/rhoai/` (future) |

Dependencies flow downward. The diagram below shows the full picture — arrows point
from consumer to dependency:

```text
  Distributions (composition roots)
  ─────────────────────────────────
  distributions/rhaii/       distributions/rhoai/ (future)
            │                        │
            └───────────┬────────────┘
                        │
       ┌────────────────┼──────────────────┐
       ▼                ▼                  ▼
  ┌──────────┐   ┌──────────┐      ┌────────────┐
  │model-    │   │ gen-ai   │      │  core-bff  │
  │serving   │   └────┬─────┘      └─────┬──────┘
  │ (hub)    │        │                  │         Feature
  ├──────────┤        │                  │         Packages
  │▲ ▲ ▲    │        │                  │         & Backend
  ││ │ │    │        │                  │         Infrastructure
  │kserve   │        │                  │
  │nim-srv  │        │                  │
  │llmd-srv │        │                  │
  └────┬─────┘        │                  │
       └──────────────┼──────────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   App Shell  │
              │  dist/base/  │
              └──────┬───────┘
                     │
       ┌─────────────┼─────────────┐
       ▼             ▼             ▼
  ┌──────────┐ ┌───────────┐ ┌──────────┐
  │ ui-core  │ │plugin-core│ │app-config│   Core Shared
  └────┬─────┘ └─────┬─────┘ └──────────┘   Libraries
       │             │
       └──────┬──────┘
              ▼
        ┌───────────┐
        │  k8s-core  │
        └─────┬─────┘
              ▼
        ┌───────────┐
        │foundation │  (not yet extracted — zero @odh-dashboard/* deps)
        └───────────┘
```

> **Note**: Tooling packages (`eslint-config`, `jest-config`, `tsconfig`) are outside
> the layer hierarchy. They are devDependencies only and never imported at runtime.

---

## 2. The Serving Hub-and-Spoke

Model serving and its related packages follow a hub-and-spoke pattern. Model-serving
is the hub; `kserve`, `nim-serving`, `llmd-serving`, and `model-serving-backport` are
spokes.

Evidence:
- Every spoke declares `reliantAreas` targeting model-serving areas
- Every spoke registers zero standalone routes — all extensions target model-serving extension points
- The dependency is purely unidirectional: spokes depend on hub, hub has zero dependencies on spokes

This is the only group of feature packages with cross-feature runtime imports today.
No other feature packages import from sibling features.

---

## 3. Import Rules

### Rule 1: Layer boundary

Feature packages may depend on core shared libraries. They must not depend on the app
shell or on distributions. Core shared libraries must not depend on feature packages.

### Rule 2: Type-only imports across features

`import type { ... }` across feature packages is always permitted. Type imports are
erased at compile time and create no runtime dependency or bundle impact.

### Rule 3: Hub-and-spoke runtime imports

Feature packages in a hub-and-spoke group may have runtime imports from each other,
provided:
- The dependency is declared in `package.json` `dependencies`
- Direction is spoke-to-hub (spokes import from the hub, not the reverse)
- Hub-to-spoke needs should use extension points instead of direct imports

If a similar hub-and-spoke pattern emerges in other feature areas, the same rules apply.

### Rule 4: Cross-feature runtime imports are blocked

If a feature package needs runtime code from an unrelated feature package, that code
must be extracted to a core shared library or a domain-scoped `*-shared` package.

### Rule 5: When a domain-scoped `*-shared` package is justified

When a hub exports everything its spokes need, a separate shared package adds no value.
Spokes should import directly from the hub.

> *"If all these things always depend on model-serving being enabled, then I don't see
> why model-serving can't be the one exporting that API."* — Christian Vogt

A domain-scoped shared package (e.g., `model-serving-shared`) becomes justified when a
package **outside** the hub-and-spoke group needs a runtime import of domain-specific
code that currently lives in the hub. That cross-group dependency is the signal — not
the number of shared items or the desire for tidiness.

---

## 4. Enforcement

The existing `import/no-extraneous-dependencies` ESLint rule catches undeclared
dependencies. Automated enforcement of layer and import direction rules is a separate
effort. PR reviewers enforce these rules using this document as reference.

---

## 5. Core Library Stack

| Package | Litmus test | Scope |
|---------|-------------|-------|
| **foundation** | "Is it a pure type or generic utility with no framework dependency?" | Pure TypeScript types and stateless utilities (e.g., `genRandomChars`). Zero `@odh-dashboard/*` runtime deps. Not yet extracted as a standalone package. |
| **k8s-core** | "Does it describe a K8s resource type or domain-specific utility?" | K8s resource types and stateless utilities that operate on them. Contains both vanilla K8s and OpenShift types (see [Section 6](#6-openshift-specific-types)). |
| **plugin-core** | "Does it need to know how the plugin system works?" | Extension points, plugin store, discovery hooks (`useExtensions`, `useResolvedExtensions`), code ref resolution (`LazyCodeRefComponent`), feature areas (`SupportedArea`, `useIsAreaAvailable`). |
| **ui-core** | "Does it just render data using shared UI patterns?" | Shared React components (tables, resource display, form helpers), shared utilities (formatting, validation), and extension renderers (`ExtensibleDetailTabs`, `ExtensibleActions`). |
| **app-config** | "Does it run only at build time?" | Build-time tooling: webpack configuration, Module Federation setup, dev server infrastructure. If it runs in the browser at runtime, it does not belong here. |

### Where does this code go?

Use the decision flow below when extracting code from `@odh-dashboard/internal` or
deciding where new shared code belongs:

```text
START: Does this code require OpenShift APIs at runtime?
│
├─ YES → stays in RHOAI host (frontend/) or behind a platform-detection guard
│
└─ NO (platform-neutral at runtime):
   │
   Is it a pure type, enum, or stateless function with no framework dependency?
   │
   ├─ YES: Does it describe a K8s resource or API concept?
   │  ├─ YES ──────────────────────────────────────────────→ k8s-core
   │  └─ NO: Used across multiple packages?
   │     ├─ YES ───────────────────────────────────────────→ foundation
   │     └─ NO ────────────────────────────────────────────→ stays in consuming package
   │
   └─ NO (has runtime behavior or framework dependencies):
      │
      Does it operate on K8s types and remain stateless?
      ├─ YES ──────────────────────────────────────────────→ k8s-core
      │
      └─ NO: Is it plugin infrastructure (extension discovery, loading, filtering)?
         ├─ YES ───────────────────────────────────────────→ plugin-core
         │
         └─ NO: Is it a React component, hook, or UI utility?
            ├─ YES: Is it domain-specific (tied to one feature area)?
            │  ├─ YES ─────────────────────────────────────→ stays in the feature package
            │  └─ NO (domain-agnostic, used broadly):
            │     Does it contain platform-specific strings?
            │     ├─ YES → parameterize first, then ───────→ ui-core
            │     └─ NO ───────────────────────────────────→ ui-core
            │
            └─ NO: Is it build/config tooling (webpack, MF, dev server)?
               ├─ YES ────────────────────────────────────→ app-config
               └─ NO ─────────────────────────────────────→ stays in RHOAI host (frontend/)
```

### plugin-core vs ui-core

These remain separate. Merging would force every distribution (which only needs the
plugin framework) to take a dependency on shared React UI components it never uses.

- 10 packages use plugin-core only (including all 3 distributions)
- 13 packages use both plugin-core and ui-core
- 0 packages use ui-core only

The litmus test: *"Does it need to know how the plugin system works?"* If yes,
plugin-core. If it just renders data, ui-core.

`LazyCodeRefComponent` belongs in plugin-core — it bridges the plugin store to a
rendered component and is consumed directly by `distributions/base/`. Extension
rendering components like `ExtensibleDetailTabs` and `ExtensibleActions` belong in
ui-core — they consume extension data but their job is rendering PatternFly layout.

---

## 6. OpenShift-Specific Types

Core shared libraries must be **platform-neutral at runtime**. OpenShift-specific
runtime behavior (API calls, resource creation, platform-aware branching) stays in the
RHOAI host or behind platform-detection guards.

OpenShift-specific **types** (e.g., `ProjectKind`, `TemplateKind`) are acceptable in
`k8s-core` because they have no runtime footprint — RHAII can import them and never
instantiate them. If `k8s-core` ever gains runtime functions that call OpenShift-specific
APIs, those must be split out (e.g., into an `oc-core` package that layers on top of
`k8s-core`).

Hardcoded platform strings like "find your resources in OpenShift" in shared components
should be parameterized or removed from core packages.

---

## 7. Cypress Test Boundaries

- Feature-specific test specs live inside the feature package (`packages/<pkg>/cypress/`),
  not in the central `packages/cypress/` directory
- Each package's `cypress/` directory can be declared as its own npm workspace
- Test specs must not import application source code — duplicate UI cues or use
  `data-testid` selectors instead
- `packages/cypress/` remains the shared test infrastructure: page objects, commands,
  utilities, fixtures
- The dependency is unidirectional: feature tests import shared infrastructure, never
  the reverse
