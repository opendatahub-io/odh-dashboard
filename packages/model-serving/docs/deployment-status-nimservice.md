# Deployment Status — NIMService (NVIDIA NIM)

**API:** `apps.nvidia.com/v1alpha1` `NIMService`
**Controller:** `k8s-nim-operator` (separate from KServe)

## TL;DR — Progress Steps

```
1. Deployment requested
2. NIM provisioning
   ├── Cache PVC created          ← NIMService condition NIM_CACHE_PVC_CREATED: True
   └── InferenceService created   ← child ISVC exists in namespace
3. Model resources
   ├── Pod scheduled              ← Pod event on child ISVC pod
   ├── Model downloaded           ← storage-initializer completed
   ├── Model server started       ← kserve-container running
   └── Auth proxy started         ← kube-rbac-proxy running
4. Model loaded                   ← child ISVC modelStatus.activeModelState = Loaded
5. Ingress ready                  ← child ISVC condition IngressReady: True
6. Deployment ready               ← NIMService condition Ready: True
```

| Step | Signal source |
|------|---------------|
| Deployment requested | NIMService exists |
| Cache PVC created | `status.conditions[NIM_CACHE_PVC_CREATED].status = True` (may be absent if PVC is user-provided) |
| InferenceService created | Child ISVC with same name exists in namespace |
| Model resources | Same Pod events as InferenceService (via child ISVC pods) |
| Model loaded | Child ISVC `status.modelStatus.states.activeModelState = Loaded` |
| Ingress ready | Child ISVC `status.conditions[IngressReady].status = True` |
| Deployment ready | NIMService `status.conditions[Ready].status = True` |

**Error steps** (shown only when relevant):
- PVC creation failed → replaces "Cache PVC created"
- InferenceService failed → NIMService event `reason=Failed` with message
- Pod scheduling failed → same as InferenceService
- Model download/server failures → same as InferenceService (via child ISVC)

**Note:** Step 2 is unique to NIM — the operator must provision the PVC and InferenceService before the standard KServe Pod lifecycle begins. Steps 3–5 are identical to InferenceService, sourced from the child ISVC.

---

NIMService is a **wrapper** around InferenceService. It creates and manages a child InferenceService, which in turn creates the Deployment, Pods, Services, and HPA. The NIM layer adds PVC lifecycle management for model caching and a simplified status view.

## Resource Chain

```
NIMService
├── InferenceService (same name, same namespace — created by NIM operator)
│   ├── Deployment (<name>-predictor)
│   │   └── ReplicaSet → Pod(s)
│   │       ├── storage-initializer (init) — model download
│   │       ├── kserve-container — NIM runtime
│   │       ├── kube-rbac-proxy — auth proxy sidecar
│   │       └── agent — kserve model agent
│   ├── Service (<name>-predictor)
│   ├── Service (<name>-metrics)
│   ├── HorizontalPodAutoscaler (<name>-predictor)
│   └── [all standard InferenceService child resources]
├── PersistentVolumeClaim (optional — NIM model cache)
├── ServiceAccount
├── Role / RoleBinding
└── ServiceMonitor (optional)
```

NIMService does **not** create Deployments directly — it delegates entirely to the child InferenceService for workload management.

## Status Conditions

### On NIMService

| Condition | Meaning |
|-----------|---------|
| `Ready` | Top-level readiness — True when child InferenceService predictor is ready |
| `Failed` | True on hard failure; False when ready |
| `NIM_CACHE_PVC_CREATED` | PVC for NIM model cache created successfully |

**`status.state`**: Parallel simple enum — `Ready`, `NotReady`, or `Failed`.

### How NIMService Ready is Computed

NIMService checks the child **InferenceService's `PredictorReady`** condition (not top-level `Ready`):

```
NIMService Ready = InferenceService.status.conditions[PredictorReady].status == True
```

When the child ISVC predictor is ready, NIMService emits a `Ready` event with the Deployment's progress message.

### On the Child InferenceService

The child InferenceService has the **full InferenceService condition set** and `modelStatus`:

| Condition | Meaning |
|-----------|---------|
| `Ready` | Full ISVC readiness (PredictorReady + IngressReady) |
| `PredictorReady` | Deployment available |
| `IngressReady` | Network path established |
| `LatestDeploymentReady` | Latest Deployment revision ready |
| `Stopped` | Force-stop active |

Plus the full `modelStatus` subsystem (see [InferenceService doc](./deployment-status-inferenceservice.md)).

### Common NIMService Failure Reasons

| Reason (on `Ready`/`Failed`) | Meaning |
|-------------------------------|---------|
| `Ready` | Deployment rolled out successfully |
| `NotReady` | Predictor not yet ready (message includes Deployment status) |
| `NIMCacheNotReady` | NIM model cache PVC not ready |
| `InferenceServiceFailed` | Child InferenceService failed |
| `ServiceAccountFailed` | ServiceAccount creation failed |
| `PVCCreated` | PVC created (on `NIM_CACHE_PVC_CREATED` condition) |

## Model Status

NIMService itself does **not** have a `modelStatus` field. However, the child InferenceService **does** have the full `modelStatus` subsystem:

```
InferenceService (child).status.modelStatus:
  transitionStatus:  UpToDate | InProgress | BlockedByFailedLoad
  states:
    activeModelState:  Loaded | Pending | FailedToLoad
    targetModelState:  Loaded | Pending | FailedToLoad
  lastFailureInfo:
    reason:   ModelLoadFailed | RuntimeUnhealthy | ...
    exitCode: <int32>
  copies:
    totalCopies: <int>
    failedCopies: <int>
```

To get detailed model loading diagnostics for NIM deployments, read the child InferenceService's `modelStatus`, not the NIMService status.

## Events

### On NIMService CR (emitted by k8s-nim-operator)

| Reason | Type | Message pattern |
|--------|------|-----------------|
| `Ready` | Normal | `NIMService <name> ready, msg: <deployment message>` |
| `NotReady` | Normal | `NIMService <name> not ready yet, msg: <deployment message>` |
| `Failed` | Warning | `NIMService <name> failed, msg: <error>` |
| `ReconcileFailed` | Warning | Reconciliation error |
| `Delete` | Normal | Deletion lifecycle |

### On Child InferenceService

Same events as a standalone InferenceService:

| Reason | Type | Message |
|--------|------|---------|
| `InferenceServiceReady` | Normal | `InferenceService [<name>] is Ready` |
| `InferenceServiceNotReady` | Warning | `InferenceService [<name>] is no longer Ready because of: <conditions>` |

### On Pods

Standard kubelet events (Scheduled, Pulling, Pulled, Created, Started, BackOff, Unhealthy, etc.) — identical to InferenceService pods.

## Event Filtering Strategy

NIMService events come from two levels:

1. **NIMService-level:** `involvedObject.kind=NIMService,involvedObject.name=<name>` — gives Ready/NotReady/Failed lifecycle
2. **Child InferenceService-level:** `involvedObject.kind=InferenceService,involvedObject.name=<name>` — gives ISVC Ready/NotReady transitions
3. **Pod-level:** Same strategy as InferenceService — filter by latest ReplicaSet pods

## Two-Layer Status

When displaying NIMService status, there are two complementary layers:

### Layer 1: NIMService (simplified view)

- `status.state`: `Ready` / `NotReady` / `Failed`
- `status.conditions[Ready]`: single readiness signal
- `status.conditions[NIM_CACHE_PVC_CREATED]`: PVC lifecycle
- NIMService events: `Ready`/`NotReady`/`Failed` with summary messages

### Layer 2: Child InferenceService (detailed view)

- Full condition set (`PredictorReady`, `IngressReady`, `LatestDeploymentReady`, `Stopped`)
- Full `modelStatus` (loading state machine, failure info with exit codes)
- Pod-level events (container pulls, crashes, probe failures)

A status component for NIM should show Layer 1 as the summary and allow drilling into Layer 2 for diagnostics.

## Stopped State

NIMService respects the same stop mechanism as InferenceService:
- `metadata.annotations['serving.kserve.io/stop']` on the child InferenceService
- NIMService `Ready` condition goes False
- `status.state` becomes `NotReady`
- Child ISVC shows `Stopped: True`

## NIM-Specific Considerations

### PVC Lifecycle

NIM models are typically large (10–100+ GB). The `NIM_CACHE_PVC_CREATED` condition tracks whether the cache PVC was successfully created. PVC binding may take time if using `WaitForFirstConsumer` storage class (the PVC won't bind until a Pod is scheduled that references it).

### Model Cache Reuse

NIM deployments may reuse a pre-existing PVC (`existing-pvc-mock-nim` pattern). In this case, `NIM_CACHE_PVC_CREATED` may not be present since the PVC was user-provided.

### Restart Counts

NIM containers can have high restart counts during initial model loading since NIM runtime images often need to download and convert model weights on first start. A `CrashLoopBackOff` during the first few minutes may be normal behavior, not a permanent failure. The `modelStatus.lastFailureInfo.exitCode` from the child InferenceService helps distinguish expected startup crashes from real errors.
