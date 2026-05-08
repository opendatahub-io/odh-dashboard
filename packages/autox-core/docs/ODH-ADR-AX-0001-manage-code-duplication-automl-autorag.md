# Create `autox-core` Package to Address AutoML/AutoRAG Code Duplication

|                |            |
| -------------- | ---------- |
| Date           | 2026-04-24 |
| Scope          | AutoX (AutoML/AutoRAG) |
| Status         | Approved |
| Authors        | [daniduong](@daniduong) |
| Supersedes     | N/A |
| Superseded by: | N/A |
| Tickets        | [RHOAIENG-59342](https://redhat.atlassian.net/browse/RHOAIENG-59342) |
| Other docs:    | |

## What

This ADR defines the strategy for managing code duplication between AutoML and AutoRAG packages, which share approximately 80% of their codebase while maintaining distinct product identities.

## Why

AutoML and AutoRAG are deployed as separate packages in a monorepo, each containing a UI layer and Backend-for-Frontend (BFF). While the packages are ~80% identical, they must maintain distinct identities including behavior, autonomy, and deployment independence.

The current code duplication is impacting the team's ability to deliver in future releases. Bug fixes and feature additions must be applied twice, increasing development time and testing burden. This technical debt requires **immediate de-duplication** to maintain sustainable development velocity.

Without a clear strategy, we face either high maintenance burden from duplication or risk of inappropriate coupling that erodes product boundaries.

## Goals

* Maximize reuse of shared logic across UI and BFF layers
* Preserve clear product identity boundaries for AutoML and AutoRAG
* Maintain independent CI/CD pipelines per package
* Support gradual divergence as products evolve
* Keep future changes safe and predictable

## Non-Goals

* Merging AutoML and AutoRAG into a single deployable product
* Changing the existing deployment model
* Implementing runtime feature-flagging as the primary differentiation mechanism

## How

### BFF Layer

Create `autox-core/bff` as a shared services library:

**What gets shared**: Common Kubernetes, Pipelines, and storage logic as reusable service-layer functions organized by domain (`kubernetes/`, `pipelines/`, `s3/`)

**What stays separate**: Each product maintains its own HTTP handlers and product-specific orchestration logic

**Architecture**: Clean boundaries with services → clients

### UI Layer

Create `autox-core/ui` as a shared library of composable primitives:

**What gets shared**: Low-level hooks, components, and utilities that products compose into features

**What stays separate**: Each product maintains its own pages, routes, navigation, and feature composition logic

**Architecture**: Primitives → features → pages composition hierarchy. Configure as Module Federation shared singleton.

### Local Development

* **BFF**: Go workspaces for seamless cross-package development
* **UI**: npm workspaces for seamless cross-package development

**Note**: `autox-core` can be maintained either in the current monorepo or in a separate repository. Both approaches are viable options.

### Package Structure

```
packages/autox-core/
├── services/
│   ├── kubernetes/             # Kubernetes integration
│   │   ├── models.go           # Domain models (Namespace, Secret, RequestIdentity)
│   │   ├── client.go           # K8s client interface
│   │   ├── factory.go          # Unified factory (handles static vs token auth)
│   │   ├── service.go          # KubernetesService (business logic)
│   │   ├── validators.go       # Input validation (namespace format, RBAC checks)
│   │   └── errors.go           # Custom errors (NotFoundError, ForbiddenError)
│   │
│   ├── pipelines/              # Kubeflow Pipelines integration
│   │   ├── models.go           # Domain models (PipelineRun, Pipeline, DSPA)
│   │   ├── client.go           # HTTP client for KFP API
│   │   ├── service.go          # PipelinesService (discovery, caching, CRUD)
│   │   ├── discovery.go        # DSPA discovery, pipeline discovery with LRU cache
│   │   ├── validators.go       # Request validation
│   │   └── errors.go           # Custom errors
│   │
│   ├── s3/
│   │   └── ...
│   │
│   └── common/                 # Shared utilities
│       ├── errors/             # Base error types and helpers
│       ├── validation/         # Generic validators (DNS-1123, URLs)
│       └── cache/              # LRU cache implementation
│
└── ui/
    ├── components/             # Shared UI primitives
    ├── hooks/                  # Shared hooks
    ├── layouts/                # Shared layouts
    ├── utils/                  # Validation, formatting, helpers
    └── types/                  # Shared TypeScript types
```

### Usage

Each product owns its identity through configuration, feature flags, and orchestration logic. The shared `autox-core` library remains identity-agnostic and exposes extension points rather than product-specific conditional logic.

**Extension patterns**:
* **Simple operations**: Products call autox-core services directly from handlers
* **Complex operations**: Products create domain services that compose autox-core primitives with product-specific validation and orchestration
* **UI**: Products compose shared hooks/components with product-specific behavior

### Boundary Enforcement

**Automated**:
* Architecture unit tests block imports from `automl/*` or `autorag/*` into `autox-core`
* Linting rules (Go: `golangci-lint depguard`, TypeScript: ESLint `no-restricted-imports`) configured as errors in CI
* PRs violating boundary rules are blocked from merging

**Manual**:
* All `autox-core` changes require Dashboard Purple Team approval
* Code reviews verify additions are genuinely shared, not product-specific

**Extraction Priority**:
* Migration follows a phased approach: pipelines (~8303 LoC) → s3 (~6056 LoC) → kubernetes (~4245 LoC)
* Priority determined by combination of code volume and autox exclusivity to maximize consolidation impact

## Alternatives

### Alternative 1: Runtime Composition / Feature-Flag Driven Single Codebase

**Approach**: Deploy a single unified codebase where both products are controlled at runtime via feature flags, runtime configuration, and conditional UI/BFF behavior.

**Pros**:
* Zero duplication
* Fastest initial development velocity
* Easy to share fixes instantly across both products
* Simplifies shared logic by default

**Cons**:
* Weakens distinct identity requirement structurally
* Risk of hidden coupling via runtime branching
* Harder debugging due to conditional logic paths
* Deployment independence becomes artificial or reduced
* Can evolve into a flag-heavy monolith where product identities blur over time

**Rejected because**: This approach conflicts with the core requirement to maintain distinct product identities. Over time, runtime branching leads to tangled conditional logic that makes it difficult to diverge products safely. The structural separation provided by the recommended approach makes boundaries explicit and enforceable.

### Alternative 2: Shared Platform API + Module Federation Remote UI Architecture

**Approach**: Introduce a separately deployed platform API service that handles cross-cutting concerns (auth, logging, telemetry, shared orchestration), while each product maintains its own BFF. UI components are shared via a new Module Federation remote that both products load at runtime.

**Pros**:
* Strong separation between platform and product concerns
* Enables reuse of UI components without duplication
* Preserves independent BFF evolution
* Scales well across multiple teams
* Encourages platform engineering maturity

**Cons**:
* High system complexity (API + new federated remote + runtime integration)
* More moving parts in CI/CD and deployment
* New Module Federation remote introduces runtime dependency coupling
* Harder local development experience
* Versioning and compatibility management overhead
* Additional dependency surface requiring teams to integrate platform API clients and configure remote loading
* Violates Module Federation best practices: federated modules should not have hard dependencies on other federated modules for core functionality. Cross-module consumption should only be used for optional enhancements, not required features.

**Rejected because**: While this approach offers architectural flexibility, it introduces significant operational and integration complexity that is not justified by current scale. The overhead of maintaining a separate platform API service, creating and deploying a new Module Federation remote for shared UI, and coordinating versioning across multiple deployment units outweighs the benefits for two products. Additionally, creating a federated remote that both products depend on for core functionality violates Module Federation architectural principles around module independence. This approach should be reconsidered if ODH adds more similar products or if team boundaries require stronger runtime isolation.

### Comparison Summary

| Criterion | Shared Libraries (Chosen) | Runtime Composition | Platform API + Federation |
|-----------|---------------------------|---------------------|---------------------------|
| Code duplication | Low | Lowest | Low (UI only) |
| Identity separation | Strong | Weak | Strong |
| Deployment independence | High | Medium | High |
| System complexity | Medium | Low → Medium | High |
| Runtime risk | Low | Medium | Medium–High |
| Long-term maintainability | High | Medium | Medium |
| Organizational overhead | Low | Low | High |

## Security and Privacy Considerations

The `autox-core` shared library consolidates authorization and secret-handling logic, reducing duplication of security-critical code while requiring safeguards against shared-library vulnerabilities.

**Key requirements**:
* Authorization logic must be identity-agnostic to prevent privilege escalation across products
* Logs and error messages must redact tokens, credentials, and secret content
* Products maintain integration tests exercising `autox-core` auth code with their policies; CI blocks changes that break product tests

## Risks

**Medium risk: Shared layer accumulation of product-specific logic**

Without strict governance, the `autox-core` library may gradually accumulate product-specific logic disguised as shared utilities.

**Mitigation**: Dashboard Purple Team owns `autox-core` and must approve all changes. Automated CI tests block imports from product packages.

## Stakeholder Impacts

| Group                     | Key Contacts          | Date       | Impacted? |
| ------------------------- | --------------------- | ---------- | --------- |
| Dashboard Purple Team     | @daniduong, @chrjones | 2026-04-24 | Yes       |

## References

* [RHOAIENG-59342](https://redhat.atlassian.net/browse/RHOAIENG-59342) - Jira ticket tracking this work

## Reviews

| Reviewed by                   | Date       | Notes |
| ----------------------------- | ---------- | ------|
|                               |            |       |
