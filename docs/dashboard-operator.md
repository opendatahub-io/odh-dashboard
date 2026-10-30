# Dashboard Module Controller

The Dashboard Module Controller manages the Dashboard operand as a Kubernetes
component. It owns the `Dashboard` custom resource (CR), renders the selected
manifest bundle, and reports a Kubernetes-native status contract.

Use the platform guide for lifecycle-specific behavior:

- [ODH and self-managed RHOAI](dashboard-operator-openshift.md)
- [RHAII/XKS](dashboard-operator-xks.md)

## Dashboard Contract

The cluster-scoped `Dashboard` CR is `components.platform.opendatahub.io/v1alpha1`.
CEL validation restricts the controller to the `default-dashboard` singleton.

| Area | Contract |
| --- | --- |
| `spec.managementState` | `Managed` reconciles the operand; `Removed` removes it while retaining the CR. |
| `spec.gateway` | Supplies ingress information consumed by the selected lifecycle. |
| `spec.components` and `spec.modules` | Provide component availability and module overrides to OpenShift lifecycles. |
| `spec.observability` | Configures optional observability for OpenShift lifecycles. |
| `spec.maasPortal` | Configures the MaaS Portal where that lifecycle supports it. |
| `status` | Reports phase, observed generation, conditions, URLs, module state, and releases. |

The API embeds common platform lifecycle, status, and release types so platform
orchestrators can consume it consistently. See the API package for field-level
validation and defaults.

## Status And Readiness

The controller separates successful apply from application availability.

| Condition | Meaning |
| --- | --- |
| `ProvisioningSucceeded` | The selected manifest bundle rendered and applied successfully. |
| `DashboardAvailable` | The primary Deployment observed its current generation and is `Available=True`; its primary HTTPRoute has current-generation `Accepted=True` and `ResolvedRefs=True` for a declared parent. |
| `Ready` | The lifecycle-specific aggregate of its dependencies. |
| `Degraded` | A diagnosed fault, not an ordinary rollout or Gateway admission wait. |

A missing or not-yet-ready Deployment or HTTPRoute is normal progress:
`DashboardAvailable=False` and a bounded requeue make that visible. API read,
render, or apply failures set a diagnosed condition and return an error for
controller-runtime backoff.

- **Transient errors**: return `(Result{}, err)` -- controller-runtime requeues with backoff.
- **Expected pending state**: return `(Result{RequeueAfter: 10s}, nil)` while a primary Deployment or HTTPRoute becomes ready.
- **Failure status**: calculate conditions before returning reconciliation errors; persist status only when it differs from the stored state.

`status.url` is lifecycle-specific. XKS leaves it empty because its Gateway
owns the external hostname.

## Reconciliation Model

The reconciler owns Kubernetes controller plumbing; lifecycle implementations
own their resource set and readiness dependencies.

```text
fetch CR → finalizer/deletion handling → select lifecycle
        → render and apply manifests → reconcile lifecycle dependencies
        → update status and requeue when progress is pending
```

This boundary keeps common finalizer, status, manifest, and condition mechanics
consistent while allowing a platform to define its own initialization,
resources, and aggregate readiness.

### Removal And Deletion

`managementState: Removed` is a soft stop: the CR remains and the controller
removes the managed operand, clears its URL, and reports removal status. Most
lifecycles report `NotReady`; a lifecycle that retains a managed optional operand
can continue to derive aggregate readiness from that operand. CR deletion is
distinct: the finalizer performs cleanup before Kubernetes removes the CR.

Common teardown removes managed resources, including the PodDisruptionBudget.
When the Gateway API mapping is available, it also removes the HTTPRoute. A
lifecycle can retain dependencies it still owns, such as resources shared with
a managed optional operand.

## HTTPS Listener TLS Policy

At startup, the manager resolves the OpenShift cluster-wide TLS security
profile (`apiservers.config.openshift.io/cluster`) and applies its minimum TLS
version and cipher suites to both the metrics and webhook HTTPS listeners. This
keeps the operator aligned with cluster policy instead of using a fixed TLS
configuration.

Resolution is fail-closed: when reading the profile is denied (`401`/`403`),
or its type, minimum version, or `Custom` settings are invalid, the manager
logs the error and exits rather than serving a policy that cannot be verified.
A nil or empty profile uses Mozilla Intermediate defaults (TLS 1.2). The same
defaults apply when the OpenShift API group is absent.

The operator does not hot-swap TLS on an existing listener. Its profile watcher
watches `apiservers/cluster`; a profile change cancels the manager context so
the Deployment restarts the process and resolves the updated configuration.
The operator ClusterRole therefore needs `get`, `list`, and `watch` on
`apiservers` in the `config.openshift.io` API group. For a startup crash loop
reporting `unable to resolve TLS configuration`, verify that RBAC and access to
the APIServer configuration resource.

## Manifests And Images

The controller renders Kustomize bundles beneath its configurable manifests
base path, injects lifecycle parameters, then applies resources with
server-side apply. `RELATED_IMAGE_*` environment variables replace bundle image
defaults in supported deployments.

See the [manifest guide](../manifests/README.md) for bundle layout, parameter
injection, and local Kustomize validation.

## Development

Manifests are stored at a configurable base path (`--manifests-base-path` flag).

### Bundle Paths

| Platform | Bundle | Notes |
|----------|--------|-------|
| OpenDataHub | `/odh` | OpenShift overlay |
| SelfManagedRhoai | `/rhoai` | OpenShift overlay |
| XKS | `distributions/rhaii` | Standalone RHAII bundle |

The OpenShift overlays extend `manifests/base/` and produce a core pod with 3 containers (odh-dashboard, kube-rbac-proxy, core-bff). The XKS bundle is independent and has no OpenShift core or module operands.

### Rendering Pipeline

1. **Kustomize params** computed from Dashboard spec (gateway domain, section title) and `RELATED_IMAGE_*` env vars
2. **Kustomize engine** renders manifests with namespace injection
3. **SSA deployer** applies all resources with `dashboard-operator` as field owner

### Module Manifests

Each module has its own kustomize package under `manifests/modules/<slug>/` containing:
- `deployment.yaml` -- 2-replica Deployment with TLS, SA isolation
- `service.yaml` -- Service exposing the module's BFF port
- `networkpolicy.yaml` -- NetworkPolicy for inter-BFF egress
- `service-account.yaml` -- Dedicated ServiceAccount
- `cluster-role.yaml` + `cluster-role-binding.yaml` -- Module-specific RBAC
- `params.env` -- Kustomize parameter defaults

The registered modules and their manifest directories:

| Module | Directory | Service Name |
|--------|-----------|-------------|
| agentOps | `manifests/modules/agent-ops/` | `odh-dashboard-agent-ops-ui` |
| automl | `manifests/modules/automl/` | `odh-dashboard-automl-ui` |
| autorag | `manifests/modules/autorag/` | `odh-dashboard-autorag-ui` |
| dataConnectHub | `manifests/modules/data-connect-hub/` | `odh-dashboard-data-connect-hub-ui` |
| dataRegistry | `manifests/modules/data-registry/` | `odh-dashboard-data-registry-ui` |
| evalHub | `manifests/modules/eval-hub/` | `odh-dashboard-eval-hub-ui` |
| genAi | `manifests/modules/gen-ai/` | `odh-dashboard-gen-ai-ui` |
| maas | `manifests/modules/maas/` | `odh-dashboard-maas-ui` |
| mlflow | `manifests/modules/mlflow/` | `odh-dashboard-mlflow-ui` |
| modelRegistry | `manifests/modules/model-registry/` | `odh-dashboard-model-registry-ui` |
| notebooks | `manifests/modules/notebooks/` | `odh-dashboard-notebooks-ui` |

### MaaS Portal Operand

The controller deploys the independent RHOAI portal operand when
`spec.maasPortal.managementState` is `Managed` and `spec.gateway.domain` is set.
See [MaaS Portal](maas-portal.md) for its routing, federation, subscription RBAC,
resource identity, upgrade migration, and rollout requirements.

## Module Registry and Dependency Resolution

### Module Registry

A static map compiled into the controller binary defining each BFF module's properties, including DSC component gates and inter-module dependencies:

| Module | Container | Port | Image Env Var | DSC Gate | Dependencies |
|--------|-----------|------|---------------|----------|-------------|
| agentOps | agent-ops-ui | 8843 | `RELATED_IMAGE_ODH_MOD_ARCH_AGENT_OPS_IMAGE` | -- | -- |
| automl | automl-ui | 8643 | `RELATED_IMAGE_ODH_MOD_ARCH_AUTOML_IMAGE` | `aipipelines` | -- |
| autorag | autorag-ui | 8743 | `RELATED_IMAGE_ODH_MOD_ARCH_AUTORAG_IMAGE` | `aipipelines` | `genAi` |
| dataConnectHub | data-connect-hub-ui | 9243 | `RELATED_IMAGE_ODH_MOD_ARCH_DATA_CONNECT_HUB_IMAGE` | -- | -- |
| dataRegistry | data-registry-ui | 9143 | `RELATED_IMAGE_ODH_MOD_ARCH_DATA_REGISTRY_IMAGE` | `feastoperator` | -- |
| evalHub | eval-hub-ui | 8543 | `RELATED_IMAGE_ODH_MOD_ARCH_EVAL_HUB_IMAGE` | `trustyai` | -- |
| genAi | gen-ai-ui | 8143 | `RELATED_IMAGE_ODH_MOD_ARCH_GEN_AI_IMAGE` | -- | -- |
| maas | maas-ui | 8243 | `RELATED_IMAGE_ODH_MOD_ARCH_MAAS_IMAGE` | -- | -- |
| mlflow | mlflow-ui | 8343 | `RELATED_IMAGE_ODH_MOD_ARCH_MLFLOW_IMAGE` | `mlflowoperator` | -- |
| modelRegistry | model-registry-ui | 8043 | `RELATED_IMAGE_ODH_MOD_ARCH_MODEL_REGISTRY_IMAGE` | `modelregistry` | -- |
| notebooks | notebooks-ui | 9043 | `RELATED_IMAGE_ODH_MOD_ARCH_NOTEBOOKS_IMAGE` | -- | -- |

### Module Enablement (Three-Pass Algorithm)

Module enablement uses a three-pass algorithm implemented in `resolveModuleStatuses()`:

1. **DSC Component Gate + Explicit Overrides**: For each registered module, check if the module's DSC component gate (e.g., `modelregistry`, `aipipelines`) is `Managed` or `Unmanaged` in `spec.components`. If not, the module is disabled with reason `ComponentNotAvailable`. Then apply explicit `spec.modules` overrides -- if the module is set to `Disabled`, it is disabled with reason `ExplicitOverride`. Otherwise the module is tentatively marked as `Deployed`.

2. **Inter-Module Dependency Propagation**: If module A depends on module B (e.g., `autorag` depends on `genAi`), and B is disabled or not deployed, A is also disabled with reason `DependencyNotMet`. This propagation runs in a loop until no more changes occur (transitive closure).

3. **Unknown Module Detection**: Any key in `spec.modules` that does not match a registered module is reported as `Phase: NotDeployed`, reason: `UnknownModule`.

### Module Health Resolution

Module health is checked by inspecting each module's Deployment readiness (replicas vs ready replicas). If the Deployment has fewer ready replicas than desired, the module is marked `Degraded`. If no Deployment is found for the module, it is marked `NotDeployed`.

## Dynamic Federation ConfigMap

The operator dynamically builds a `federation-config` ConfigMap based on which
modules are enabled. Each module's normalized entry has an optional `backend`
for its remote bundle and one or more `proxyService` targets for its APIs. See
[Module Federation](module-federation.md#configmap-structure) for the runtime
entry schema.

The ConfigMap also includes:
- A `coreBff` entry for core-bff proxy routing (routes `/core-bff/api` to port 8943 on the main dashboard Service)
- A `perses` entry if observability is enabled (routes `/perses/api` to the configured Perses service)
- An `mlflowEmbedded` entry if the mlflow module is deployed (routes to the embedded MLflow UI)

After deploying the ConfigMap, the operator patches the main Deployment with a content hash annotation (`dashboard.opendatahub.io/federation-config-hash`) to trigger a rolling restart whenever the federation configuration changes. The hash is computed as SHA-256 of the ConfigMap data, and the patch is skipped if the hash has not changed.

### Perses Service Requirements

When `spec.observability` is unset, the controller looks for `data-science-perses:8080` in the platform monitoring namespace (`redhat-ods-monitoring` on RHOAI). Auto-detection runs when either the core dashboard or the MaaS Portal is managed. It configures observability in memory and reports its state through `ObservabilityAvailable`; it does not write `spec.observability` back to the CR or install the Perses server. Set `spec.observability.enabled: false` to disable it explicitly.

`spec.observability.persesService` can override the HTTP service name, namespace, and service port. The managed network policies require the backing pods to have `app.kubernetes.io/managed-by: perses-operator` and listen on TCP port `8080`. A different **service port** must still forward to pod port `8080`. Other pod labels or listening ports require deployment-specific network policies; configuring the service target alone does not support those topologies.

### Community Plugin Entries

During an existing reconciliation, the operator also samples the optional,
installer-owned `community-plugins-config` ConfigMap from
`redhat-ods-community-plugins`. A missing source Namespace or ConfigMap is
ignored. Accepted entries are merged into the generated
`federation-config`; Dashboard derives their public proxy paths under
`/community-plugins/<remote-name>/` and uses the same hash-based rollout.

See [Community Plugin Registration](community-plugin-registration.md) for the
source schema, validation rules, ownership boundary, and reconciliation trigger
contract.

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
|   |   |-- dashboard_reconciler.go # Reconcile loop
|   |   |-- actions.go              # Manifest sets, kustomize params, URL extraction
|   |   |-- support.go              # Platform config, image resolution
|   |   |-- modules.go              # Module registry + dependency resolution
|   |   |-- module_deploy.go        # Module deployment, federation ConfigMap
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
+-- go.mod                          # Go module (separate from the pnpm workspace)
```

## Development Workflow

```bash
make build
make test
make lint
```

Follow [dashboard-operator/AGENTS.md](../dashboard-operator/AGENTS.md) for
controller conventions, API regeneration requirements, and test guidance.
