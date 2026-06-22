# AGENTS.md — Dashboard Module Controller

This document provides guidance for AI agents working on the Dashboard Module Controller (`dashboard-operator/`).

## Overview

The Dashboard Module Controller is a standalone Kubernetes operator that manages the full lifecycle of the ODH Dashboard application. It reconciles a cluster-scoped `Dashboard` CRD, rendering and deploying manifests via SSA (Server-Side Apply), detecting the cluster platform (ODH, RHOAI self-managed, RHOAI managed), and reporting granular health status.

This is **not** a BFF — it is a controller-runtime operator. For Go BFF conventions, see `.claude/rules/bff-go.md`. For operator/controller-runtime patterns, see `.claude/rules/operator-controller.md`.

## Project Structure

```text
dashboard-operator/
├── api/
│   └── v1alpha1/
│       ├── dashboard_types.go          # CRD types (Dashboard kind)
│       ├── groupversion_info.go        # GVK registration
│       └── zz_generated.deepcopy.go    # Generated DeepCopy methods
├── cmd/
│   └── manager/
│       └── main.go                     # Controller entry point
├── charts/
│   └── dashboard/                      # ODH Operator bootstrap chart (CRD, RBAC, Deployment, ConfigMap)
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── crds/
│       └── templates/
├── config/
│   ├── crd/
│   │   ├── bases/                      # Generated CRD YAML (source of truth; synced to charts/dashboard/crds)
│   │   └── kustomization.yaml
│   ├── default/
│   │   └── kustomization.yaml
│   ├── manager/
│   │   ├── manager.yaml                # Deployment manifest
│   │   └── kustomization.yaml
│   └── rbac/
│       ├── role.yaml
│       ├── role_binding.yaml
│       ├── service_account.yaml
│       └── kustomization.yaml
├── internal/
│   └── controller/
│       ├── dashboard_reconciler.go     # Reconcile loop and SetupWithManager
│       ├── actions.go                  # Manifest rendering, URL extraction, status helpers
│       └── support.go                  # Kustomize params, image resolution, platform config
├── Dockerfile                          # Container build (run from repo root)
├── Dockerfile.dockerignore
├── Makefile                            # All build/test/generate targets
├── go.mod
├── go.sum
└── .golangci.yml                       # Linter config (golangci-lint v2)
```

## Development Requirements

- **Go**: >= 1.25 (see `go.mod` for exact toolchain version)
- **controller-gen**: v0.17.2 (auto-installed by Makefile)
- **golangci-lint**: v2.1.0 (auto-installed by Makefile)

## Key Technologies

| Technology | Purpose |
|---|---|
| controller-runtime v0.23 | Kubernetes controller framework |
| controller-gen | CRD and DeepCopy code generation |
| odh-platform-utilities | Shared platform libraries (Tier 1) |
| kustomize (via platform-utilities) | Manifest rendering |
| SSA (Server-Side Apply) | Resource deployment via `pkg/deploy` |
| OpenShift Route API | Dashboard URL extraction |
| golangci-lint v2 | Go linting |

## Common Commands

All commands run from the `dashboard-operator/` directory:

```bash
# Development
make fmt              # Run go fmt
make vet              # Run go vet
make lint             # Run golangci-lint
make lint-fix         # Run golangci-lint with auto-fix
make test             # Run tests with race detector + coverage

# Build
make build            # Build manager binary to bin/manager
make run              # Run controller locally (requires --namespace and --manifests-base-path)

# Code generation (run after modifying api/ types)
make generate         # Generate DeepCopy methods
make manifests        # Generate CRD YAML from kubebuilder markers
make sync-chart-crds  # Copy CRD into charts/dashboard/crds
make chart-validate   # helm lint + template smoke test

# Container
make docker-build     # Build container image (run from repo root)
make docker-push      # Push container image

# Clean
make clean            # Remove build artifacts
```

## CRD Design

The `Dashboard` CRD is **cluster-scoped** and **singleton** (enforced by CEL validation: `metadata.name` must be `default-dashboard`).

### Key Types

| Type | Purpose |
|---|---|
| `Dashboard` | Root CRD type |
| `DashboardSpec` | Desired state: management state, gateway, components, modules, observability |
| `DashboardStatus` | Observed state: conditions, URL, module statuses, releases |
| `GatewaySpec` | Ingress configuration (Route on OpenShift, Ingress on K8s) |
| `ComponentAvailability` | DSC component availability snapshot |
| `ModuleOverride` | Per-module enablement override |
| `ObservabilitySpec` | Perses proxy configuration |
| `ModuleStatus` | Per-module deployment state |

### Platform Utilities Integration

The CRD embeds types from `odh-platform-utilities/api/common`:

- `common.ManagementSpec` — `Managed` / `Removed` state
- `common.Status` — `observedGeneration`, `conditions`, `phase`
- `common.ComponentReleaseStatus` — `releases` array
- `common.Condition` — standard Kubernetes conditions

## Reconciliation Pipeline

The `Reconcile()` method follows this flow:

1. **Fetch** — Get the `Dashboard` CR
2. **Kustomize params** — Compute variables from spec (gateway domain, platform title, images) and write `params.env`
3. **Render** — Use `kustomize.NewEngine().Render()` with namespace injection
4. **Deploy** — Use `deploy.NewDeployer()` with SSA, field ownership, labels, and apply ordering
5. **URL extraction** — List Routes by label, extract admitted host
6. **Status update** — Set `Ready` condition, `observedGeneration`, and `url`

If the Route is not yet admitted, the controller requeues after 10 seconds.

## Platform Detection

The controller detects three platforms via `cluster.DetectPlatform()`:

| Platform | Manifest Overlay | Section Title |
|---|---|---|
| `OpenDataHub` | `/odh` | OpenShift Open Data Hub |
| `SelfManagedRhoai` | `/rhoai` | OpenShift Self Managed Services |
| `ManagedRhoai` | `/not-supported` | OpenShift Managed Services |

Platform is determined at startup and injected into the reconciler.

## Image Resolution

Container images are resolved from environment variables following the `RELATED_IMAGE_*` convention (required by Konflux/operator-framework):

| Param Key | Environment Variable |
|---|---|
| `odh-dashboard-image` | `RELATED_IMAGE_ODH_DASHBOARD_IMAGE` |
| `model-registry-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE` |
| `gen-ai-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE` |
| `mlflow-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE` |
| `maas-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE` |
| `eval-hub-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE` |
| `automl-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_AUTOML_IMAGE` |
| `autorag-ui-image` | `RELATED_IMAGE_ODH_MOD_ARCH_AUTORAG_IMAGE` |
| `images-jobs-async-upload` | `RELATED_IMAGE_ODH_MODEL_REGISTRY_JOB_ASYNC_UPLOAD_IMAGE` |
| `kube-rbac-proxy` | `RELATED_IMAGE_ODH_KUBE_RBAC_PROXY_IMAGE` |

## CLI Flags

| Flag | Env Var | Default | Purpose |
|---|---|---|---|
| `--manifests-base-path` | — | `/opt/manifests/dashboard` | Base path for kustomize manifests |
| `--metrics-bind-address` | — | `:8080` | Metrics endpoint |
| `--health-probe-bind-address` | — | `:8081` | Health/ready probes |
| `--leader-elect` | — | `false` | Leader election for HA |
| `--namespace` | `OPERATOR_NAMESPACE` | (required) | Operator deployment namespace |
| — | `ODH_PLATFORM_TYPE` | (auto-detect) | Override platform detection |

## CI/CD

CI workflow at `.github/workflows/dashboard-operator-tests.yml` triggers on changes to `dashboard-operator/**` or `manifests/**`:

1. Setup Go (version from `go.mod`)
2. `make lint`
3. `make build`
4. `make test`
5. Install Helm (pinned action SHA)
6. `make chart-validate`
7. Check for uncommitted changes (catches stale generated code)

## Testing

Tests use `*_test.go` files adjacent to implementation:

```go
func TestMyFunction(t *testing.T) {
    tests := []struct {
        name    string
        input   InputType
        want    OutputType
        wantErr bool
    }{...}
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) { ... })
    }
}
```

For controller tests, use controller-runtime's `envtest` package:

```go
import "sigs.k8s.io/controller-runtime/pkg/envtest"

testEnv = &envtest.Environment{
    CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases")},
}
```

Run tests: `make test` (includes `fmt`, `vet`, race detector, coverage report).

## Agent Rules

When working on dashboard-operator code, read these rules:

| Rule | File | When |
|---|---|---|
| **Operator Controller** | `.claude/rules/operator-controller.md` | Writing controller, reconciler, CRD, or action code |
| **Architecture** | `.claude/rules/architecture.md` | Making structural changes to the operator |
| **Security** | `.claude/rules/security.md` | Working on RBAC, secrets, or K8s API interactions |
| **Pull Requests** | `.claude/rules/pull-requests.md` | Creating a PR |

## Dev Workflow

When implementing changes in `dashboard-operator/`:

1. **Implement** — Write the code following operator conventions
2. **Generate** — If CRD types changed: `make generate && make manifests`
3. **Validate** — Run `make lint && make test`
4. **Verify no drift** — `git diff` should show no untracked generated file changes
