# Upstream Repo Profiles

Reference data for upstream repos that cause `cypress_found_bug` issues. Maps repos to their test infrastructure, known bug patterns, and fix locations.

## Repo Detection

Match the upstream repo from Jira issue content using these signals (in priority order). The recommender skill applies `--repo` **before** this list when the user supplied it. The `### org/repo` headings below are the clone allowlist: do not `gh repo clone` a repository that is not listed here unless the user confirms (see the recommender skill).

1. **Fix PR link** — most reliable. Extract org/repo from the GitHub PR URL.
2. **Jira labels** — `dashboard-area-*` labels map to repos (see table below).
3. **Summary keywords** — operator names, CRD kinds, pod names in the summary.
4. **Description content** — stack traces, pod names, namespace references.

### Disambiguation

Do **not** choose a repository when the only matching signals are shared across profiles. Require a unique keyword, a unique fix PR, or ask the user.

| Shared signal | Repos that both match |
|---|---|
| `inferenceservice`, `dashboard-area-model-serving` | `odh-model-controller`, `kserve` |
| `envoyfilter`, `gateway` | `models-as-a-service`, `Kuadrant/kuadrant-operator` |
| `pipeline`, `dashboard-area-pipelines` | `mlflow-operator`, `data-science-pipelines-operator` |

Unique signals (examples): `odh-model-controller` / `isvc` vs `kserve` / `servingruntime`; `maas` / `subscription` vs `kuadrant`; `mlflow` vs `dspa` / `kfp`.

## Component teams (`--team` flags)

| Team flag | Repos |
|---|---|
| `maas` | `opendatahub-io/models-as-a-service`, `Kuadrant/kuadrant-operator` |
| `kserve` | `opendatahub-io/kserve` |
| `feast` | `opendatahub-io/feast-module-operator` |
| `model-serving` | `opendatahub-io/odh-model-controller`, `opendatahub-io/kserve` |
| `operator` | `opendatahub-io/opendatahub-operator` |
| `model-registry` | `opendatahub-io/model-registry-operator` |
| `workbenches` | `opendatahub-io/workbenches-operator` |
| `pipelines` | `opendatahub-io/mlflow-operator`, `opendatahub-io/data-science-pipelines-operator` |

`--area` in parity mode accepts the same flags, or a `dashboard-area-*` suffix (`model-serving`, `maas`, …).

## Repo Profiles

### opendatahub-io/odh-model-controller

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Ginkgo + envtest |
| envtest refs | 24+ (all run as cluster-admin) |
| RBAC manifests | `config/rbac/role.yaml` |
| CRDs | `config/crd/bases/` |
| CI | GitHub Actions |
| Manager entrypoint | `cmd/main.go` → `ctrl.NewManager()` |
| Key gap | Never loads shipped ClusterRole as SA permissions |
| Bug classes | RBAC violation, CRD watch failure |
| Keywords | `odh-model-controller`, `model controller`, `inferenceservice`, `isvc` |
| Unique keywords | `odh-model-controller`, `model controller`, `isvc` |
| Area labels | `dashboard-area-model-serving` |

### opendatahub-io/opendatahub-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Ginkgo + envtest |
| envtest refs | 30+ (admin access) |
| RBAC manifests | `config/rbac/role.yaml`, component-level roles |
| CRDs | `config/crd/bases/` |
| CI | GitHub Actions + Prow |
| Manager entrypoint | `main.go` |
| Key gap | CRD precondition tests only check own CRDs, not cross-component |
| Bug classes | Deploy prerequisite, CRD ordering, bootstrap failure, CRD schema drift |
| Keywords | `opendatahub-operator`, `dsc`, `dsci`, `datasciencecluster`, `trustyai`, `dashboard cr`, `deploymentmode` |
| Area labels | `dashboard-area-operator` |

### opendatahub-io/model-registry-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Ginkgo + envtest |
| envtest refs | 13+ (admin access) |
| RBAC manifests | `config/rbac/role.yaml` |
| CRDs | `config/crd/bases/` |
| CI | GitHub Actions |
| Manager entrypoint | `cmd/main.go` |
| Key gap | Never calls `ctrl.NewManager()` + `mgr.Start()`. PR #571 removed RBAC with zero CI failure |
| Bug classes | RBAC violation, finalizer deadlock, bootstrap failure |
| Keywords | `model-registry`, `model registry`, `model catalog`, `aitenant` |
| Area labels | `dashboard-area-model-registry`, `model-registry`, `model-catalog` |

### opendatahub-io/models-as-a-service

| Field | Value |
|---|---|
| Language | Go |
| Test framework | None (zero envtest) |
| envtest refs | 0 |
| RBAC manifests | `config/rbac/` |
| CRDs | `config/crd/bases/` |
| CI | GitHub Actions |
| Key gap | Zero envtest despite being top bug source. EnvoyFilter/gateway config never validated |
| Bug classes | EnvoyFilter scoping, gateway OOM, config drift, bootstrap deadlock, resource leak |
| Keywords | `maas`, `gateway`, `envoyfilter`, `ext_proc`, `wasm`, `subscription` |
| Unique keywords | `maas`, `ext_proc`, `wasm`, `subscription` |
| Area labels | `dashboard-area-maas` |

### opendatahub-io/feast-module-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | None (zero envtest) |
| envtest refs | 0 |
| RBAC manifests | `config/rbac/role.yaml` |
| CRDs | `config/crd/bases/` |
| CI | Minimal GitHub Actions |
| Key gap | Zero envtest. RBAC never validated. CrashLoopBackOff on missing RBAC undetectable |
| Bug classes | RBAC violation, namespace labels, deploy prerequisite |
| Keywords | `feast`, `feature store`, `featurestore` |
| Area labels | `dashboard-area-feature-store` |

### opendatahub-io/kserve

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Go test (no envtest) |
| envtest refs | 0 |
| RBAC manifests | `config/rbac/` |
| CRDs | `config/crd/bases/` |
| CI | GitHub Actions |
| Key gap | CRD validation and reconciler ordering untested |
| Bug classes | CRD schema drift, reconciler ordering, CRD installation |
| Keywords | `kserve`, `inferenceservice`, `serving runtime`, `crd validation` |
| Unique keywords | `kserve`, `serving runtime`, `servingruntime`, `crd validation` |
| Area labels | `dashboard-area-model-serving` |

### opendatahub-io/workbenches-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Ginkgo + envtest |
| envtest refs | 8+ (admin access) |
| RBAC manifests | `config/rbac/role.yaml` |
| Webhooks | `config/webhook/` |
| CI | GitHub Actions |
| Key gap | Webhook conflict undetectable in isolation |
| Bug classes | Webhook conflict, deploy prerequisite |
| Keywords | `workbench`, `notebook`, `workbenches-operator` |
| Area labels | `dashboard-area-workbenches` |

### opendatahub-io/mlflow-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Minimal envtest (2 refs) |
| envtest refs | 2 |
| RBAC manifests | `config/rbac/role.yaml` |
| CRDs | `config/crd/bases/` |
| CI | GitHub Actions |
| Key gap | No bootstrap-to-Ready test. CRD schema mismatch undetected |
| Bug classes | CRD schema drift, module dependency, bootstrap failure |
| Keywords | `mlflow` |
| Area labels | `dashboard-area-pipelines` |

### opendatahub-io/data-science-pipelines-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | Ginkgo + envtest |
| envtest refs | Several |
| RBAC manifests | `config/rbac/` |
| CI | GitHub Actions |
| Key gap | MLflow integration untested |
| Bug classes | CrashLoopBackOff, RBAC |
| Keywords | `pipeline`, `dspa`, `data science pipeline`, `kfp` |
| Unique keywords | `dspa`, `data science pipeline`, `kfp` |
| Area labels | `dashboard-area-pipelines` |

### Kuadrant/kuadrant-operator

| Field | Value |
|---|---|
| Language | Go |
| Test framework | None (zero envtest in our context) |
| envtest refs | 0 (for our integration surface) |
| CI | GitHub Actions + Istio integration tests |
| Key gap | External repo. No Konflux, no envtest, no early-gate. EnvoyFilter bleed is top bug class |
| Bug classes | EnvoyFilter scoping, gateway config leak, resource leak |
| Keywords | `kuadrant`, `envoyfilter`, `gateway` |
| Unique keywords | `kuadrant` |
| Note | Cross-org coordination needed |

## Bug Class → Test Recipe Mapping

| Bug Class | Detection Layer | Test Recipe | Effort |
|---|---|---|---|
| RBAC violation | Operator startup | Non-admin envtest: `ctrl.NewManager(cfg)` with shipped ClusterRole | ~15 lines Go |
| Finalizer deadlock | envtest | Delete parent before children, assert finalizers removed | ~20 lines Go |
| CRD schema drift | envtest | Apply CR with real values, assert admission passes | ~10 lines Go |
| Deploy prerequisite | Operator startup | Bootstrap from empty cluster, assert all components Ready | ~25 lines Go |
| Behavioral regression | envtest | Assert expected side effects (labels, resources created) | ~20 lines Go |
| Webhook conflict | Static analysis | Scan webhook manifests for duplicate names | Script |
| EnvoyFilter scoping | Static analysis | Assert workloadSelector present on all EnvoyFilters | Script |
| Config drift | Runtime integration | Multi-component deploy test | Complex |
| Resource leak | Load test | Memory profiling under sustained load | Complex |
| API mismatch | Contract test | Cross-component naming/namespace validation | Medium |

## Profile aliases → canonical class

Recommendations, audit filters, and report fields must use a canonical class from the table above. Map profile-specific terms first:

| Profile term | Canonical class |
|---|---|
| CRD watch failure | Deploy prerequisite |
| bootstrap failure | Deploy prerequisite |
| bootstrap deadlock | Deploy prerequisite |
| CRD ordering | Deploy prerequisite |
| CRD installation | Deploy prerequisite |
| module dependency | Deploy prerequisite |
| gateway OOM | Resource leak |
| gateway config leak | EnvoyFilter scoping |
| namespace labels | Behavioral regression |
| reconciler ordering | Behavioral regression |
| CrashLoopBackOff | *(symptom, not a class)* RBAC violation if Forbidden/missing verbs; otherwise Deploy prerequisite |
| RBAC | RBAC violation |
