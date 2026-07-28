# Dashboard Module Controller

## Purpose

The Dashboard Module Controller (`dashboard-operator/`) is a standalone Kubernetes operator that manages the full lifecycle of the ODH Dashboard application. It is co-located in the monorepo because the controller is tightly coupled to Dashboard frontend/backend versions and manifest layouts.

As part of the modular architecture initiative (RHAISTRAT-1064), each component transitions from being managed directly by the central ODH Operator to having its own module controller. The Dashboard Module Controller replaces the prior approach where the ODH Operator's `internal/controller/components/dashboard/` package managed Dashboard resources directly.

## CRD Design

**Kind**: `Dashboard`
**Group**: `dashboard.opendatahub.io`
**Version**: `v1alpha1`
**Scope**: Cluster (not namespaced)
**Singleton**: Enforced via CEL validation (`metadata.name == 'default-dashboard'`)

### Spec Fields

| Field | Type | Purpose |
|-------|------|---------|
| `managementState` | `Managed\|Removed` | Lifecycle intent from orchestrator |
| `gateway` | `GatewaySpec` | Ingress domain for Route/Ingress |
| `components` | `map[string]ComponentAvailability` | DSC component availability snapshot, projected by orchestrator |
| `modules` | `map[string]ModuleOverride` | Per-module enable/disable overrides (tri-state) |
| `observability` | `ObservabilitySpec` | Perses proxy service configuration |
| `deploymentMode` | `Sidecar\|Standalone` | Deployment topology for BFF modules (default: Sidecar) |

### Status Fields

| Field | Type | Purpose |
|-------|------|---------|
| `phase` | `Ready\|NotReady` | Overall controller health |
| `conditions` | `[]Condition` | `Ready`, `ProvisioningSucceeded`, `Degraded`, `ObservabilityAvailable` |
| `observedGeneration` | `int64` | Last processed spec generation |
| `url` | `string` | Externally-reachable dashboard URL |
| `moduleStatuses` | `map[string]ModuleStatus` | Per-module deployment state |
| `releases` | `[]ComponentRelease` | Deployed component versions |

### Platform Utilities Integration

The CRD embeds types from `odh-platform-utilities/api/common`:
- `ManagementSpec` (inline in spec) -- standardized lifecycle intent
- `Status` (inline in status) -- phase, conditions, observedGeneration
- `ComponentReleaseStatus` (inline in status) -- release version tracking
- Implements the `PlatformObject` interface for generic condition management

## Reconciliation Pipeline

The controller follows a sequential pipeline on each reconcile, branching based on the `deploymentMode` spec field:

```
1. Fetch CR            -> return nil for NotFound (deleted)
2. Handle deletion     -> finalizer + cross-namespace cleanup
3. Handle Removed      -> tear down all labeled resources
4. Branch on deploymentMode:
   |-- Sidecar path (reconcileSidecar):
   |   -> Render platform overlay (odh/ or rhoai/) with sidecar patches
   |   -> Deploy via SSA (single pod with all BFF containers)
   |   -> Check container readiness per-module
   +-- Standalone path (reconcileStandalone):
       -> Render standalone overlay (odh/standalone or rhoai/standalone)
       -> Deploy core pod (3 containers: dashboard, kube-rbac-proxy, core-bff)
       -> For each enabled module:
       |   -> Render manifests/modules/<slug>/
       |   -> Deploy as independent Deployment via SSA
       -> GC disabled module resources
       -> Build dynamic federation-config ConfigMap
       -> Patch main Deployment with config hash annotation (rolling restart)
5. Extract URL         -> Route admission check
6. Update status       -> conditions, phase, URL, moduleStatuses, releases
```

### ManagementState Handling

The controller supports `managementState: Removed` on the Dashboard CR. When set:

1. All resources labeled `platform.opendatahub.io/part-of: dashboard` in the applications namespace are deleted (Deployments, Services, ConfigMaps, ServiceAccounts, Secrets, NetworkPolicies, Roles, RoleBindings) plus cluster-scoped ClusterRoles and ClusterRoleBindings
2. Cross-namespace resources (e.g., Perses proxy in observability namespace) are cleaned up
3. Status is updated: `phase: NotReady`, `ProvisioningSucceeded: False` (reason: `Removed`), `Degraded: False` (reason: `Removed`)
4. `status.url` and `status.moduleStatuses` are cleared
5. The controller returns without requeuing -- it will reconcile again if the CR is updated

The finalizer handles a separate concern: cleanup on CR **deletion** (when `DeletionTimestamp` is set). `Removed` is a "soft stop" that preserves the CR while removing the operand.

### Error Handling

- **Transient errors**: return `(Result{}, err)` -- controller-runtime requeues with backoff
- **Expected-missing state** (e.g., Route not admitted): return `(Result{RequeueAfter: 10s}, nil)`
- **Status always updated**: conditions are set before returning errors so the CR reflects failure reasons

## Manifest Management

Manifests are stored at a configurable base path (`--manifests-base-path` flag), with platform-specific overlays for each deployment mode:

### Overlay Paths

| Platform | Sidecar Overlay | Standalone Overlay |
|----------|----------------|-------------------|
| OpenDataHub | `/odh` | `/odh/standalone` |
| SelfManagedRhoai | `/rhoai` | `/rhoai/standalone` |

**Sidecar overlay** extends `manifests/base/` + `manifests/sidecar/` (injects all BFF containers via JSON6902 patches, includes static federation-config ConfigMap).

**Standalone overlay** extends `manifests/base/` directly (no sidecar patches). Produces a core pod with only 3 containers (odh-dashboard, kube-rbac-proxy, core-bff).

### Rendering Pipeline

1. **Kustomize params** computed from Dashboard spec (gateway domain, section title) and `RELATED_IMAGE_*` env vars
2. **Kustomize engine** renders manifests with namespace injection
3. **SSA deployer** applies all resources with `dashboard-operator` as field owner

### Standalone Module Manifests

Each module has its own kustomize package under `manifests/modules/<slug>/` containing:
- `deployment.yaml` -- 2-replica Deployment with TLS, SA isolation
- `service.yaml` -- Service exposing the module's BFF port
- `networkpolicy.yaml` -- NetworkPolicy for inter-BFF egress
- `serviceaccount.yaml` -- Dedicated ServiceAccount
- `clusterrole.yaml` + `clusterrolebinding.yaml` -- Module-specific RBAC
- `params.yaml` -- Kustomize parameter defaults

The eight registered modules and their manifest directories:

| Module | Directory | Service Name |
|--------|-----------|-------------|
| agentOps | `manifests/modules/agent-ops/` | `odh-dashboard-agent-ops-ui` |
| automl | `manifests/modules/automl/` | `odh-dashboard-automl-ui` |
| autorag | `manifests/modules/autorag/` | `odh-dashboard-autorag-ui` |
| evalHub | `manifests/modules/eval-hub/` | `odh-dashboard-eval-hub-ui` |
| genAi | `manifests/modules/gen-ai/` | `odh-dashboard-gen-ai-ui` |
| maas | `manifests/modules/maas/` | `odh-dashboard-maas-ui` |
| mlflow | `manifests/modules/mlflow/` | `odh-dashboard-mlflow-ui` |
| modelRegistry | `manifests/modules/model-registry/` | `odh-dashboard-model-registry-ui` |

## Module Registry and Dependency Resolution

### Module Registry

A static map compiled into the controller binary defining each BFF module's properties, including DSC component gates and inter-module dependencies:

| Module | Container | Port | Image Env Var | DSC Gate | Dependencies |
|--------|-----------|------|---------------|----------|-------------|
| agentOps | agent-ops-ui | 8843 | `RELATED_IMAGE_ODH_MOD_ARCH_AGENT_OPS_IMAGE` | -- | -- |
| automl | automl-ui | 8543 | `RELATED_IMAGE_ODH_MOD_ARCH_AUTOML_IMAGE` | `aipipelines` | -- |
| autorag | autorag-ui | 8643 | `RELATED_IMAGE_ODH_MOD_ARCH_AUTORAG_IMAGE` | `aipipelines` | `genAi` |
| evalHub | eval-hub-ui | 8443 | `RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE` | `trustyai` | -- |
| genAi | gen-ai-ui | 8143 | `RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE` | -- | -- |
| maas | maas-ui | 8243 | `RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE` | -- | -- |
| mlflow | mlflow-ui | 8343 | `RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE` | `mlflowoperator` | -- |
| modelRegistry | model-registry-ui | 8043 | `RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE` | `modelregistry` | -- |

### Module Enablement (Three-Pass Algorithm)

Module enablement uses a three-pass algorithm implemented in `resolveModuleStatuses()`:

1. **DSC Component Gate + Explicit Overrides**: For each registered module, check if the module's DSC component gate (e.g., `modelregistry`, `aipipelines`) is `Managed` or `Unmanaged` in `spec.components`. If not, the module is disabled with reason `ComponentNotAvailable`. Then apply explicit `spec.modules` overrides -- if the module is set to `Disabled`, it is disabled with reason `ExplicitOverride`. Otherwise the module is tentatively marked as `Deployed`.

2. **Inter-Module Dependency Propagation**: If module A depends on module B (e.g., `autorag` depends on `genAi`), and B is disabled or not deployed, A is also disabled with reason `DependencyNotMet`. This propagation runs in a loop until no more changes occur (transitive closure).

3. **Unknown Module Detection**: Any key in `spec.modules` that does not match a registered module is reported as `Phase: NotDeployed`, reason: `UnknownModule`.

### Resolution (Sidecar Mode)

In sidecar mode, container readiness is overlaid from pod status after module enablement is resolved. If a module's container is in `ImagePullBackOff`, `CrashLoopBackOff`, or similar waiting state, its status is downgraded to `Degraded`. If the container is not found in any pod, the status is set to `NotDeployed`.

### Resolution (Standalone Mode)

In standalone mode, module health is checked by inspecting each module's standalone Deployment readiness (replicas vs ready replicas), not container readiness within a shared pod. If the Deployment has fewer ready replicas than desired, the module is marked `Degraded`. If no Deployment is found for the module, it is marked `NotDeployed`.

## Dynamic Federation ConfigMap (Standalone Mode)

In standalone mode, the operator dynamically builds a `federation-config` ConfigMap based on which modules are enabled. For each enabled module, it generates a service entry pointing to the module's standalone Service:

```json
{
  "name": "<moduleName>",
  "remoteEntry": "/remoteEntry.js",
  "authorize": true,
  "tls": true,
  "proxy": [{"path": "/<module>/api", "pathRewrite": "/api"}],
  "service": {
    "name": "odh-dashboard-<slug>-ui",
    "namespace": "<apps-namespace>",
    "port": <module-port>
  }
}
```

The ConfigMap also includes:
- A `coreBff` entry for core-bff proxy routing (routes `/core-bff/api` to port 8943 on the main dashboard Service)
- A `perses` entry if observability is enabled (routes `/perses/api` to the configured Perses service)
- An `mlflowEmbedded` entry if the mlflow module is deployed (routes to the embedded MLflow UI)

After deploying the ConfigMap, the operator patches the main Deployment with a content hash annotation (`dashboard.opendatahub.io/federation-config-hash`) to trigger a rolling restart whenever the federation configuration changes. The hash is computed as SHA-256 of the ConfigMap data, and the patch is skipped if the hash has not changed.

In sidecar mode, the federation-config ConfigMap is static and included directly in the sidecar overlay manifests.

## Operator ConfigMap

The controller reads an optional `dashboard-operator-config` ConfigMap for internal flags:

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `reconcileInterval` | duration | `0` (no periodic requeue) | Override default requeue interval (minimum 5s) |

A missing or malformed ConfigMap never blocks reconciliation.

## Directory Structure

```
dashboard-operator/
|-- api/v1alpha1/
|   |-- dashboard_types.go          # CRD types + kubebuilder markers
|   |-- dashboard_types_test.go     # PlatformObject interface tests
|   |-- groupversion_info.go        # API group registration
|   +-- zz_generated.deepcopy.go    # Generated DeepCopy methods
|-- cmd/manager/
|   +-- main.go                     # Entry point: flags, scheme, platform detection
|-- internal/
|   |-- controller/
|   |   |-- dashboard_reconciler.go # Reconcile loop (sidecar + standalone paths)
|   |   |-- actions.go              # Manifest sets, kustomize params, URL extraction
|   |   |-- support.go              # Platform config, image resolution
|   |   |-- modules.go              # Module registry + dependency resolution
|   |   |-- module_deploy.go        # Standalone module deployment, federation ConfigMap
|   |   |-- config.go               # Operator ConfigMap reader
|   |   +-- *_test.go               # Unit tests for each file
|   +-- webhook/
|       |-- dashboard_webhook.go    # Singleton validation webhook
|       +-- dashboard_webhook_test.go
|-- config/
|   |-- crd/bases/                  # Generated CRD YAML
|   |-- rbac/role.yaml              # ClusterRole permissions
|   |-- manager/manager.yaml        # Deployment manifest
|   +-- webhook/                    # Webhook configuration
|-- Dockerfile                      # Multi-stage Go build
|-- Makefile                        # Build, test, generate, lint targets
+-- go.mod                          # Go module (separate from monorepo npm)
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

The operator manages the deployment of BFF containers -- in sidecar mode as part of the Dashboard pod, and in standalone mode as independent Deployments -- but does not interact with BFF HTTP APIs at runtime.

## Zero-Downtime Migration (SSA Adoption)

When transitioning from the legacy ODH Operator to the Dashboard Module Controller, existing Kubernetes resources must be adopted without downtime. This is handled automatically by Server-Side Apply (SSA) with `ForceOwnership`.

### How It Works

1. The legacy ODH Operator manages Dashboard resources (Deployments, Services, ConfigMaps, etc.) with its own field manager (e.g., `opendatahub-operator`).
2. When the Dashboard Module Controller starts reconciling, it applies the same resources via SSA with `client.ForceOwnership` and field owner `dashboard-operator`.
3. SSA `ForceOwnership` transfers field ownership from the previous manager to `dashboard-operator` without conflicts or resource recreation.
4. Resources continue running uninterrupted -- pods are not restarted unless the spec actually changes.

This behavior is built into the `odh-platform-utilities/pkg/deploy` package, which uses `ForceOwnership` in both `ModePatch` and `ModeSSA` modes. No custom adoption code is required in the controller.

### Cross-Namespace Cleanup

OwnerReference garbage collection only works within the same namespace (or for cluster-scoped owners referencing cluster-scoped children). The Dashboard CR is cluster-scoped, so namespaced resources in the applications namespace are covered. However, Perses proxy resources may be deployed to a separate observability namespace (`spec.observability.persesService.namespace`).

On Dashboard CR deletion, the controller's finalizer explicitly cleans up cross-namespace resources:
- Lists Services, ConfigMaps, NetworkPolicies, and PersesDashboards in the observability namespace labeled `platform.opendatahub.io/part-of: dashboard`
- Deletes each resource, ignoring NotFound errors for idempotency
- Skips cleanup when the observability namespace matches the applications namespace (ownerReference GC handles it)

### Labels

All resources deployed by the controller are labeled with `platform.opendatahub.io/part-of: dashboard`, enabling both cleanup and resource discovery. In standalone mode, individual module resources also carry `app.kubernetes.io/component: <slug>` for targeted garbage collection.

## Status Aggregation

### Platform Auto-Aggregation

The Dashboard CR implements the `PlatformObject` interface from `odh-platform-utilities/api/common`, which enables automatic status aggregation into the parent DataScienceCluster (DSC) resource. The platform infrastructure reads the Dashboard CR's conditions and rolls them up into the DSC's overall component status.

### PlatformObject Contract

The Dashboard type provides five methods:

| Method | Purpose |
|--------|---------|
| `GetStatus()` | Returns pointer to embedded `common.Status` |
| `GetConditions()` | Returns current condition slice |
| `SetConditions()` | Replaces condition slice |
| `GetReleaseStatus()` | Returns pointer to embedded `ComponentReleaseStatus` |
| `SetReleaseStatus()` | Sets release version information |

### Condition Types

| Condition | True Means | False Means |
|-----------|-----------|-------------|
| `Ready` | All sub-conditions healthy | One or more sub-conditions unhealthy |
| `ProvisioningSucceeded` | Manifests rendered and applied | Render or deploy failed |
| `Degraded` | One or more modules degraded (standalone) | No degradation / route not ready |
| `ObservabilityAvailable` | Perses proxy deployed | Perses proxy not configured/failed |

The `Ready` condition is a rollup -- it is automatically derived by the conditions manager from `ProvisioningSucceeded`, `Degraded`, and `ObservabilityAvailable`. It is never set explicitly.

### Phase Derivation

`status.phase` is derived from the conditions manager's `IsHappy()` check:
- `Ready` when all conditions indicate a healthy state
- `NotReady` otherwise

## TLS Configuration

### cert-manager Integration

The operator uses cert-manager for TLS certificate provisioning with a self-signed issuer. Two sets of certificates are managed:

| Certificate | Secret | Purpose |
|-------------|--------|---------|
| `dashboard-operator-webhook-cert` | `dashboard-operator-webhook-tls` | Webhook server HTTPS |
| `dashboard-operator-metrics-cert` | `dashboard-operator-metrics-tls` | Metrics endpoint HTTPS |

Both certificates reuse the same `selfsigned-issuer` (Issuer kind, namespace-scoped).

### Webhook TLS

The ValidatingWebhookConfiguration uses cert-manager's `inject-ca-from` annotation to inject the CA bundle. The webhook service listens on port 9443 with certificates mounted from the webhook-tls secret.

### Metrics TLS

The metrics endpoint binds to port 8443 with HTTPS enabled by default (`--secure-metrics=true`). Certificates are mounted from the metrics-tls secret at `/tmp/k8s-metrics-server/serving-certs`. HTTP/2 is disabled (via TLS NextProtos) to mitigate CVE-2023-44487 (HTTP/2 rapid reset attack).

### Certificate DNS Names

Each certificate includes DNS names for in-cluster service discovery:
- `<service-name>.<namespace>.svc`
- `<service-name>.<namespace>.svc.cluster.local`

## Deployment Prerequisites

### Required

| Prerequisite | Purpose |
|-------------|---------|
| cert-manager | TLS certificate provisioning for webhook and metrics |
| Dashboard CRD | `make manifests` generates it; must be applied before the controller starts |
| `OPERATOR_NAMESPACE` env var or `--namespace` flag | Identifies the operator's deployment namespace |

### Optional

| Prerequisite | Purpose |
|-------------|---------|
| `APPLICATIONS_NAMESPACE` env var | Target namespace for operand resources (defaults to operator namespace) |
| `ODH_PLATFORM_TYPE` env var | Override automatic platform detection |
| `RELATED_IMAGE_*` env vars | Container image references (required by Konflux/operator-framework) |
| `dashboard-operator-config` ConfigMap | Runtime configuration (reconcile interval) |

### Command-Line Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--manifests-base-path` | `/opt/manifests/dashboard` | Base path for dashboard manifests |
| `--metrics-bind-address` | `:8443` | Metrics endpoint bind address |
| `--health-probe-bind-address` | `:8081` | Health probe bind address |
| `--leader-elect` | `false` | Enable leader election |
| `--secure-metrics` | `true` | Serve metrics over HTTPS |
| `--namespace` | (env fallback) | Operator deployment namespace (required unless `OPERATOR_NAMESPACE` is set) |
| `--webhook-port` | `9443` | Webhook server port |

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Go | >= 1.25 | Build and test |
| controller-gen | (via Makefile) | CRD/RBAC generation from markers |
| golangci-lint | v2 | Linting (downloaded by `make lint`) |
| Helm | >= 3.x | Chart validation and local rendering |
| Docker/Podman | Latest | Container image builds |
| kubectl/oc | Latest | Cluster interaction |

### Building Locally

```bash
cd dashboard-operator

# Build the manager binary
make build

# Build container image (from repo root context)
make docker-build IMG=quay.io/<your-registry>/odh-dashboard-operator:dev

# Cross-compile for x86 on Apple Silicon
docker build --platform linux/amd64 -t quay.io/<your-registry>/odh-dashboard-operator:dev -f dashboard-operator/Dockerfile .
```

### Running Locally Against a Cluster

The operator can run outside the cluster during development, connecting via your kubeconfig:

```bash
cd dashboard-operator

# Ensure CRD is installed on the cluster
oc apply -f config/crd/bases/

# Run the manager locally
go run ./cmd/manager \
  --namespace opendatahub \
  --manifests-base-path ../manifests \
  --leader-elect=false \
  --secure-metrics=false
```

The `--manifests-base-path` must point to a local copy of the dashboard manifests (the `manifests/` directory at the repo root). The controller will render and apply these manifests to the target cluster.

Environment variables for image overrides:

```bash
export RELATED_IMAGE_ODH_DASHBOARD_IMAGE=quay.io/opendatahub/odh-dashboard:latest
export RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE=quay.io/opendatahub/odh-mod-arch-model-registry:latest
# ... (see charts/dashboard/values.yaml for the full list)
```

### Running Tests

```bash
cd dashboard-operator

# Full test suite (fmt, vet, race detector, coverage)
make test

# Lint
make lint

# Validate Helm chart
make chart-validate

# After modifying api/ types
make generate && make manifests
```

## Cluster Deployment

### Standalone (Helm)

Deploy the operator independently for testing or development:

```bash
cd dashboard-operator

# Install CRD
oc apply -f config/crd/bases/

# Install via Helm
helm install dashboard charts/dashboard/ \
  -n opendatahub \
  --set image.repository=quay.io/<your-registry>/odh-dashboard-operator \
  --set image.tag=dev

# Create the Dashboard CR (sidecar mode, the default)
cat <<EOF | oc apply -f -
apiVersion: dashboard.opendatahub.io/v1alpha1
kind: Dashboard
metadata:
  name: default-dashboard
spec:
  managementState: Managed
  gateway:
    domain: ""
  components:
    modelregistry:
      managementState: Managed
EOF

# Or create the Dashboard CR in standalone mode
cat <<EOF | oc apply -f -
apiVersion: dashboard.opendatahub.io/v1alpha1
kind: Dashboard
metadata:
  name: default-dashboard
spec:
  managementState: Managed
  deploymentMode: Standalone
  gateway:
    domain: ""
  components:
    modelregistry:
      managementState: Managed
EOF

# Check status
oc get dashboard default-dashboard -o yaml
```

### Via ODH Operator (Production)

In production, the ODH Operator manages the dashboard-operator's lifecycle:

1. The ODH Operator's `ModuleHandler` for Dashboard renders the Helm chart from `charts/dashboard/`
2. The Helm chart creates the operator Deployment, ServiceAccount, RBAC, and cert-manager resources
3. The ODH Operator creates the `Dashboard` CR with component availability from the DSC
4. The dashboard-operator reconciles and deploys the Dashboard application

The `RELATED_IMAGE_ODH_DASHBOARD_OPERATOR_IMAGE` env var on the ODH Operator pod provides the dashboard-operator image reference.

### Image Override Pattern

All container images use `RELATED_IMAGE_*` env vars (required by Konflux/operator-framework). The mapping from kustomize param keys to env vars is in `internal/controller/support.go:imagesMap`. The full list of related images is defined in `charts/dashboard/values.yaml` under `relatedImages`.

### ODH vs RHOAI Platform Differences

| Aspect | ODH | RHOAI |
|--------|-----|-------|
| Sidecar overlay | `/odh` | `/rhoai` |
| Standalone overlay | `/odh/standalone` | `/rhoai/standalone` |
| Section title | "OpenShift Open Data Hub" | "OpenShift Self Managed Services" |
| Image sources | `quay.io/opendatahub/` | `quay.io/redhat-ai-dev/` (via Konflux) |
| CRD group | `dashboard.opendatahub.io` | Same |

## Troubleshooting

### Common Issues

**Stale Dashboard CR blocked by CEL validation**

If a CR was created with the wrong name (e.g., `default` instead of `default-dashboard`), CEL validation blocks all mutations including finalizer removal. Workaround:

> **Security warning:** This procedure temporarily removes all CEL validation
> rules from the CRD, allowing any Dashboard CR to be created or mutated
> without constraint. Always restore the CRD immediately after cleanup, and
> avoid running this in production clusters with shared access.

```bash
# Temporarily remove CEL validation from CRD
oc patch crd dashboards.dashboard.opendatahub.io --type=json \
  -p='[{"op":"remove","path":"/spec/versions/0/schema/openAPIV3Schema/x-kubernetes-validations"}]'

# Remove finalizer and delete
oc patch dashboard <name> --type=json -p='[{"op":"remove","path":"/metadata/finalizers"}]'
oc delete dashboard <name>

# Restore CEL validation immediately
oc apply -f config/crd/bases/
```

**Pod in ImagePullBackOff**

The `RELATED_IMAGE_ODH_DASHBOARD_OPERATOR_IMAGE` is not yet onboarded to Konflux (tracked by RHOAIENG-69576/69580). For testing, override the image in the Helm values or set the env var on the ODH Operator deployment.

**Route not ready (requeue loop)**

The controller requeues every 10 seconds until the OpenShift Route is admitted. Check Route status: `oc get route -n <namespace> -l platform.opendatahub.io/part-of=dashboard`.

**Module stuck in Degraded (standalone mode)**

In standalone mode, check the individual module Deployment:
```bash
oc get deployment -n <namespace> -l app.kubernetes.io/component=<slug>
oc describe deployment odh-dashboard-<slug>-ui -n <namespace>
```

**Federation ConfigMap not updating**

If module changes are not reflected in the running dashboard, verify the federation-config ConfigMap and the hash annotation on the main Deployment:
```bash
oc get configmap federation-config -n <namespace> -o yaml
oc get deployment odh-dashboard -n <namespace> -o jsonpath='{.spec.template.metadata.annotations}'
```
