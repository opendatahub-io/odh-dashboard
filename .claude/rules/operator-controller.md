---
description: Go operator/controller-runtime patterns for the Dashboard Module Controller
globs: "dashboard-operator/**"
alwaysApply: false
paths:
  - "dashboard-operator/**"
---

# Operator Controller Patterns

Conventions for Go code in `dashboard-operator/`. This rule covers controller-runtime, kubebuilder, and CRD patterns. For Go BFF (HTTP handler) patterns, see `bff-go.md` — the two are distinct.

## Directory layout

```text
dashboard-operator/
├── api/v1alpha1/         # CRD types + kubebuilder markers
├── cmd/manager/          # Entry point (scheme, flags, manager setup)
├── internal/controller/  # Reconciler, actions, support utilities
└── config/               # Generated CRD, RBAC, manager manifests
```

- `api/` is the public contract — changes here require `make generate && make manifests`
- `internal/` is private implementation — no external consumers
- `config/` is generated output — never hand-edit `config/crd/bases/`

## CRD types (`api/v1alpha1/`)

### Kubebuilder markers

Use kubebuilder markers for validation, defaults, and print columns:

```go
// +kubebuilder:validation:Enum=Managed;Unmanaged;Removed
// +kubebuilder:default=Removed
// +kubebuilder:validation:Required
// +kubebuilder:validation:MaxLength=253
// +kubebuilder:validation:Pattern=`^regex$`
```

CEL validation for cross-field rules:

```go
// +kubebuilder:validation:XValidation:rule="...",message="..."
```

### Platform utilities embedding

The `Dashboard` CRD embeds shared types from `odh-platform-utilities/api/common`:

```go
type DashboardSpec struct {
    common.ManagementSpec `json:",inline"`
    // ...
}

type DashboardStatus struct {
    common.Status                 `json:",inline"`
    common.ComponentReleaseStatus `json:",inline"`
    // ...
}
```

Implement the `PlatformObject` interface:

```go
func (d *Dashboard) GetStatus() *common.Status
func (d *Dashboard) GetConditions() []common.Condition
func (d *Dashboard) SetConditions(conditions []common.Condition)
func (d *Dashboard) GetReleaseStatus() *common.ComponentReleaseStatus
func (d *Dashboard) SetReleaseStatus(status common.ComponentReleaseStatus)
```

### After modifying types

Always regenerate after changing `api/` files:

```bash
cd dashboard-operator
make generate    # DeepCopy methods
make manifests   # CRD YAML
```

Verify no drift: `git status` must show only your intentional changes in `api/`. If `zz_generated.deepcopy.go` or `config/crd/bases/` changed, commit them alongside the type changes.

## Reconciler pattern

### Structure

```go
type DashboardReconciler struct {
    client.Client
    Scheme            *runtime.Scheme
    ManifestsBasePath string
    Platform          cluster.Platform
    Namespace         string
}
```

Embed `client.Client` — this gives direct access to `r.Get()`, `r.List()`, `r.Status().Update()`, etc.

### Reconcile method

Follow this pipeline order:

1. **Fetch the CR** — return `nil` error for `IsNotFound` (resource was deleted)
2. **Handle deletion** — finalizer removal + cross-namespace cleanup
3. **Handle `managementState: Removed`** — tear down managed resources, set status, return early
4. **Compute state** — kustomize params, image resolution
5. **Render manifests** — `kustomize.NewEngine().Render()`
6. **Deploy** — `deploy.NewDeployer()` with SSA
7. **Post-deploy actions** — URL extraction, dependency checks
8. **Update status** — set conditions, observedGeneration, then `r.Status().Update()`

### managementState handling

The reconciler must check `dashboard.Spec.ManagementState` after finalizer handling:

```go
if dashboard.Spec.ManagementState == "Removed" {
    // Delete all resources labeled platform.opendatahub.io/part-of=dashboard
    // Clean up cross-namespace resources
    // Set phase=NotReady, clear URL and moduleStatuses
    // Set ProvisioningSucceeded=False (reason: Removed)
    return ctrl.Result{}, nil
}
```

`Removed` is distinct from CR deletion: it preserves the CR while removing the operand. The finalizer handles actual CR deletion cleanup.

### Error handling in Reconcile

- On transient errors: return `ctrl.Result{}, err` — controller-runtime will requeue with backoff
- On expected-missing state (e.g., Route not yet ready): return `ctrl.Result{RequeueAfter: duration}, nil`
- Always update status before returning errors so the CR reflects the failure reason

```go
if err != nil {
    setReadyCondition(dashboard, metav1.ConditionFalse, "ReasonCode", err.Error())
    if statusErr := r.Status().Update(ctx, dashboard); statusErr != nil {
        logger.Error(statusErr, "Failed to update status")
    }
    return ctrl.Result{}, fmt.Errorf("context: %w", err)
}
```

### SetupWithManager

Register watches and predicates. Always register `Owns()` for resource types the controller deploys so that external deletions or modifications trigger re-reconciliation:

```go
func SetupWithManager(mgr ctrl.Manager, opts Options) error {
    r := &DashboardReconciler{...}
    return ctrl.NewControllerManagedBy(mgr).
        For(&v1alpha1.Dashboard{}).
        Owns(&appsv1.Deployment{}).
        Owns(&corev1.Service{}).
        Owns(&corev1.ConfigMap{}).
        Complete(r)
}
```

Add `Watches()` for external resources that should trigger reconciliation but are not owned by the CR.

## Platform utilities usage

### Manifest rendering

```go
engine := kustomize.NewEngine()
rendered, err := engine.Render(manifestPath, kustomize.WithNamespace(namespace))
```

### Deployment (SSA)

```go
deployer := deploy.NewDeployer(
    deploy.WithFieldOwner("dashboard-operator"),
    deploy.WithLabel(labels.PlatformPartOf, strings.ToLower(v1alpha1.DashboardKind)),
    deploy.WithApplyOrder(),
)
err := deployer.Deploy(ctx, deploy.DeployInput{
    Client:    r.Client,
    Owner:     dashboard,
    Release:   deploy.ReleaseInfo{Type: string(r.Platform)},
    Resources: allResources,
})
```

### Platform detection

```go
platform, err := cluster.DetectPlatform(ctx, client, envOverride, namespace)
```

Called once at startup, injected into the reconciler. Do not re-detect per reconciliation.

### Status conditions

Use `common.Condition` from platform utilities. The `Ready` condition is mandatory. Future conditions: `ProvisioningSucceeded`, `Degraded`.

## Logging

Use controller-runtime's structured logger:

```go
logger := log.FromContext(ctx)
logger.Info("Reconciling Dashboard", "name", dashboard.Name)
logger.Error(err, "Failed to deploy", "resource", name)
```

Never use `fmt.Println` or `log.Printf`. Always include key-value pairs for structured fields.

## Testing

### Unit tests

Place `*_test.go` files adjacent to implementation. Use table-driven tests:

```go
func TestComputeKustomizeVariables(t *testing.T) {
    tests := []struct {
        name     string
        dashboard *v1alpha1.Dashboard
        platform  cluster.Platform
        want      map[string]string
    }{...}
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := computeKustomizeVariables(tt.dashboard, tt.platform)
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("got %v, want %v", got, tt.want)
            }
        })
    }
}
```

### envtest (integration tests)

For testing the full reconcile loop:

```go
testEnv = &envtest.Environment{
    CRDDirectoryPaths: []string{filepath.Join("..", "..", "config", "crd", "bases")},
}
cfg, err := testEnv.Start()
```

### Running tests

```bash
make test    # fmt + vet + go test -race -coverprofile=cover.out ./...
```

## Linting

golangci-lint v2 with the `standard` preset. Key disabled linters: `depguard`. Excluded dirs: `bin`, `config`.

```bash
make lint       # Check
make lint-fix   # Auto-fix
```

## Image conventions

Container images use the `RELATED_IMAGE_*` env var pattern (required by Konflux/operator-framework). Map param keys to env vars in `support.go:imagesMap`. Never hardcode image references.

## RBAC

RBAC manifests are in `config/rbac/`. When adding new resource types to the reconciler, update the RBAC rules. Use kubebuilder RBAC markers on the `Reconcile` method if adopting marker-based RBAC generation:

```go
// +kubebuilder:rbac:groups=dashboard.opendatahub.io,resources=dashboards,verbs=get;list;watch;update;patch
// +kubebuilder:rbac:groups=dashboard.opendatahub.io,resources=dashboards/status,verbs=get;update;patch
```

## Common mistakes to avoid

- **Forgetting `make generate && make manifests`** after CRD type changes — CI will catch uncommitted generated files
- **Hand-editing `config/crd/bases/`** — always generate from markers
- **Blocking in Reconcile** — use `RequeueAfter` for polling, not `time.Sleep`
- **Ignoring status updates on error paths** — always set a condition before returning an error
- **Using `fmt.Errorf` without `%w`** — wrap errors for `errors.Is()` / `errors.As()` compatibility
- **Creating resources without ownership** — use `deployer.Deploy()` with `Owner` set for garbage collection
- **Missing `Owns()` registration** — if the controller deploys Deployments, Services, or ConfigMaps, register them with `Owns()` so external modifications/deletions trigger re-reconciliation
- **Ignoring `managementState: Removed`** — always check before proceeding with deployment; `Removed` means "tear down the operand but keep the CR"
- **Adding modules without updating the full chain** — new modules need entries in `modules.go` (registry), `support.go` (image mapping), and `charts/dashboard/values.yaml` (related images)
