# Dashboard Module Controller

## Purpose

The Dashboard Module Controller (`dashboard-operator/`) is a standalone Kubernetes operator that manages the full lifecycle of the ODH Dashboard application. It is co-located in the monorepo because the controller is tightly coupled to Dashboard frontend/backend versions and manifest layouts.

As part of the modular architecture initiative (RHAISTRAT-1064), each component transitions from being managed directly by the central ODH Operator to having its own module controller. The Dashboard Module Controller replaces the prior approach where the ODH Operator's `internal/controller/components/dashboard/` package managed Dashboard resources directly.

## CRD Design

**Kind**: `Dashboard`
**Group**: `components.platform.opendatahub.io`
**Version**: `v1alpha1`
**Scope**: Cluster (not namespaced)
**Singleton**: Enforced via CEL validation (`metadata.name == 'default'`)

### Spec Fields

| Field | Type | Purpose |
|-------|------|---------|
| `managementState` | `Managed\|Removed` | Lifecycle intent from orchestrator |
| `gateway` | `GatewaySpec` | Ingress domain for Route/Ingress |
| `components` | `map[string]ComponentAvailability` | DSC component availability snapshot, projected by orchestrator |
| `modules` | `map[string]ModuleOverride` | Per-module enable/disable overrides (tri-state) |
| `observability` | `ObservabilitySpec` | Perses proxy service configuration |

### Status Fields

| Field | Type | Purpose |
|-------|------|---------|
| `phase` | `Ready\|NotReady` | Overall controller health |
| `conditions` | `[]Condition` | `Ready`, `ProvisioningSucceeded`, `Degraded` |
| `observedGeneration` | `int64` | Last processed spec generation |
| `url` | `string` | Externally-reachable dashboard URL |
| `moduleStatuses` | `map[string]ModuleStatus` | Per-module deployment state |
| `releases` | `[]ComponentRelease` | Deployed component versions |

### Platform Utilities Integration

The CRD embeds types from `odh-platform-utilities/api/common`:
- `ManagementSpec` (inline in spec) — standardized lifecycle intent
- `Status` (inline in status) — phase, conditions, observedGeneration
- `ComponentReleaseStatus` (inline in status) — release version tracking
- Implements the `PlatformObject` interface for generic condition management

## Reconciliation Pipeline

The controller follows a sequential pipeline on each reconcile:

```
1. Fetch CR            → return nil for NotFound (deleted)
2. Read operator config → dashboard-operator-config ConfigMap (optional)
3. Apply kustomize params → merge computed + image params into manifests
4. Render manifests    → kustomize engine with namespace injection
5. Deploy via SSA      → deploy.NewDeployer with field ownership + apply ordering
6. Extract URL         → list Routes by label, check admission status
7. Resolve modules     → two-pass dependency resolution, populate moduleStatuses
8. Update status       → conditions, phase, URL, moduleStatuses, releases
```

### Error Handling

- **Transient errors**: return `(Result{}, err)` — controller-runtime requeues with backoff
- **Expected-missing state** (e.g., Route not admitted): return `(Result{RequeueAfter: 10s}, nil)`
- **Status always updated**: conditions are set before returning errors so the CR reflects failure reasons

## Manifest Management

Manifests are stored at a configurable base path (`--manifests-base-path` flag), with platform-specific overlays:

| Platform | Overlay |
|----------|---------|
| SelfManagedRhoai | `/rhoai` |
| ManagedRhoai | `/not-supported` |
| OpenDataHub | `/odh` |

The rendering pipeline:
1. **Kustomize params** computed from Dashboard spec (gateway domain, section title) and `RELATED_IMAGE_*` env vars
2. **Kustomize engine** renders manifests with namespace injection
3. **SSA deployer** applies all resources with `dashboard-operator` as field owner

## Module Registry and Dependency Resolution

### Module Registry

A static map compiled into the controller binary defining each module's properties:

| Module | Type | Container | Port | Dependencies |
|--------|------|-----------|------|--------------|
| modelRegistry | BFF | model-registry-ui | 8043 | modelregistry |
| genAi | BFF | gen-ai-ui | 8143 | (none) |
| mlflow | BFF | mlflow-ui | 8343 | mlflowoperator |
| mlflowEmbedded | Embedded | — | — | mlflowoperator, module:mlflow |
| maas | BFF | maas-ui | 8243 | (none) |
| evalHub | BFF | eval-hub-ui | 8443 | (none) |
| automl | BFF | automl-ui | 8543 | (none) |
| autorag | BFF | autorag-ui | 8643 | (none) |
| perses | ProxyService | — | — | (observability spec) |

Dependencies prefixed with `module:` are inter-module dependencies resolved in Pass 2; others are DSC component dependencies checked in Pass 1.

### Two-Pass Resolution Algorithm

**Pass 1** — Evaluate each module independently:
1. Check `spec.modules[name].state` override: `Disabled` → immediately disabled; `Enabled` → bypasses DSC component checks
2. For `perses`: check `spec.observability.enabled` instead of components
3. Check required DSC components via `spec.components`: `Managed`/`Unmanaged` = available, `Removed`/missing = unavailable
4. If all checks pass: tentatively mark as deployed

**Pass 2** — Resolve inter-module dependencies:
- For each module with `RequiredModules` (e.g., mlflowEmbedded requires mlflow): verify the required module resolved to `Deployed`
- If any required module is not deployed, downgrade to `NotDeployed`
- Bounded iteration prevents infinite loops from dependency cycles

### Override Semantics

| Override State | DSC Components | Inter-Module Deps |
|---------------|----------------|-------------------|
| `Enabled` | Bypassed | Still enforced |
| `Disabled` | Skipped | Skipped |
| (absent) | Checked | Checked |

## Operator ConfigMap

The controller reads an optional `dashboard-operator-config` ConfigMap for internal flags:

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `reconcileInterval` | duration | `0` (no periodic requeue) | Override default requeue interval (minimum 5s) |

A missing or malformed ConfigMap never blocks reconciliation.

## Directory Structure

```
dashboard-operator/
├── api/v1alpha1/
│   ├── dashboard_types.go          # CRD types + kubebuilder markers
│   ├── dashboard_types_test.go     # PlatformObject interface tests
│   ├── groupversion_info.go        # API group registration
│   └── zz_generated.deepcopy.go    # Generated DeepCopy methods
├── cmd/manager/
│   └── main.go                     # Entry point: flags, scheme, platform detection
├── internal/
│   ├── controller/
│   │   ├── dashboard_reconciler.go # Reconcile loop
│   │   ├── actions.go              # Manifest sets, kustomize params, URL extraction
│   │   ├── support.go              # Platform config, image resolution
│   │   ├── modules.go              # Module registry + dependency resolution
│   │   ├── config.go               # Operator ConfigMap reader
│   │   └── *_test.go               # Unit tests for each file
│   └── webhook/
│       ├── dashboard_webhook.go    # Singleton validation webhook
│       └── dashboard_webhook_test.go
├── config/
│   ├── crd/bases/                  # Generated CRD YAML
│   ├── rbac/role.yaml              # ClusterRole permissions
│   ├── manager/manager.yaml        # Deployment manifest
│   └── webhook/                    # Webhook configuration
├── Dockerfile                      # Multi-stage Go build
├── Makefile                        # Build, test, generate, lint targets
└── go.mod                          # Go module (separate from monorepo npm)
```

## Development Workflow

```bash
cd dashboard-operator

# Build
make build

# Run tests with race detector
make test

# Lint (golangci-lint v2)
make lint

# After modifying api/v1alpha1/ types:
make generate    # Regenerate DeepCopy methods
make manifests   # Regenerate CRD YAML

# Format
make fmt
```

### CI

The GitHub workflow `.github/workflows/dashboard-operator-tests.yml` runs lint, build, and test on any change under `dashboard-operator/`.

### Container Image

Built from `dashboard-operator/Dockerfile` and pushed to `quay.io/opendatahub/dashboard-operator:latest`.

## Relationship to BFFs

The operator controller is distinct from BFF (Backend-for-Frontend) services:

| Aspect | Operator Controller | BFF Services |
|--------|-------------------|--------------|
| Language | Go + controller-runtime | Go + httprouter |
| Pattern | Reconciler (watch + react) | HTTP handlers (request/response) |
| Lifecycle | Long-running, leader-elected | Request-scoped |
| API | Kubernetes CRD | REST/OpenAPI |
| Location | `dashboard-operator/` | `packages/*/bff/` |
| Build | Standalone binary | Per-package binary |

The operator manages the deployment of BFF containers as part of the Dashboard pod, but does not interact with BFF HTTP APIs at runtime.
