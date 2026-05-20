# Deployment Status — InferenceService (KServe Standard)

**API:** `serving.kserve.io/v1beta1` `InferenceService`

## TL;DR — Progress Steps

```
1. Deployment requested
2. Model resources
   ├── Pod scheduled
   ├── Model downloaded
   ├── Model server started
   └── Auth proxy started
3. Model loaded
4. Ingress ready
5. Deployment ready
```

| Step | Sub-step | Success signal | Error signal | Fallback (events expired) |
|------|----------|---------------|-------------|--------------------------|
| **Deployment requested** | | ISVC exists, `stop` annotation absent | — | Always derivable |
| **Model resources** | | All children green | Any child red, or `PredictorReady.reason = ProgressDeadlineExceeded` | `PredictorReady: True` → all children green |
| | Pod scheduled | Pod event `reason=Scheduled` | Pod event `reason=FailedScheduling` | `PredictorReady: True` or `modelStatus = Loaded` |
| | Model downloaded | Pod event `reason=Started` where `message` contains `storage-initializer` | Pod event `reason=BackOff` where `message` contains `storage-initializer` | `PredictorReady: True` or `modelStatus = Loaded` |
| | Model server started | Pod event `reason=Started` where `message` contains `kserve-container` | Pod event `reason=BackOff\|Unhealthy` where `message` contains `kserve-container`; also `modelStatus.lastFailureInfo.message` | `PredictorReady: True` or `modelStatus = Loaded` |
| | Auth proxy started | Pod event `reason=Started` where `message` contains `kube-rbac-proxy` or `oauth-proxy` | — | `PredictorReady: True` or `modelStatus = Loaded` |
| **Model loaded** | | `status.modelStatus.states.activeModelState = "Loaded"` or `targetModelState = "Loaded"` | `targetModelState = "FailedToLoad"`; description from `lastFailureInfo.reason` | Always derivable from ISVC status |
| **Ingress ready** | | `status.conditions[IngressReady].status = "True"` | — | Always derivable from ISVC status |
| **Deployment ready** | | `status.conditions[Ready].status = "True"` | `Ready.status = "False"` and not stopped; description from `Ready.message` | Always derivable from ISVC status |

---

This document covers the status signals available for standard KServe InferenceService deployments (raw/standard deployment mode as used by ODH).

## Resource Chain

```
InferenceService
├── Deployment (<name>-predictor)
│   └── ReplicaSet (<name>-predictor-<hash>)
│       └── Pod(s) (<name>-predictor-<hash>-<id>)
│           ├── storage-initializer (init container) — model download
│           ├── kserve-container — model server (OpenVINO, vLLM, NIM runtime, etc.)
│           ├── kube-rbac-proxy — auth proxy sidecar
│           └── agent — kserve model agent sidecar
├── Service (<name>-predictor) — predictor ClusterIP service
├── Service (<name>-metrics) — metrics endpoint (odh-model-controller)
├── HorizontalPodAutoscaler (<name>-predictor) — autoscaling
├── ServingRuntime (<name> or user-specified) — model server template
├── Route (OpenShift, odh-model-controller) — external access
├── ServiceMonitor (odh-model-controller) — Prometheus scraping
└── ClusterRoleBinding (odh-model-controller) — RBAC for auth proxy
```

## Status Conditions

### Condition Hierarchy

```
Ready (Knative LivingConditionSet rollup)
├── PredictorReady — predictor Deployment available
│   └── Derived from: Deployment.status.conditions[Available, Progressing]
├── IngressReady — network path established
└── Stopped (separate, not in Ready set) — force-stop annotation present
```

Additional conditions (informational, not gating `Ready`):
- `LatestDeploymentReady` — latest Deployment revision ready (odh-model-controller sets this with `AuthProxyPreserved` reason)

### Condition Details

| Condition | True | False |
|-----------|------|-------|
| `Ready` | Both `PredictorReady` and `IngressReady` are True | Any gate condition is False |
| `PredictorReady` | Deployment has minimum availability | reason: `MinimumReplicasUnavailable`, `ProgressDeadlineExceeded`, `Stopped` |
| `IngressReady` | Service/Route created and accessible | InferenceService is stopped or ingress not yet reconciled |
| `Stopped` | `serving.kserve.io/stop` annotation is set | InferenceService is running (severity: Info) |
| `LatestDeploymentReady` | Latest Deployment revision matches desired | reason: `AuthProxyPreserved` (informational — avoids pod restart) |

### Common Reason Strings

| Reason | Condition | Meaning |
|--------|-----------|---------|
| `NewReplicaSetAvailable` | `PredictorReady` | Deployment rolled out successfully |
| `MinimumReplicasUnavailable` | `PredictorReady` | Pods not yet ready or crashing |
| `ProgressDeadlineExceeded` | `PredictorReady` | Rollout timed out — something is stuck |
| `Stopped` | `PredictorReady`, `Ready` | Intentionally stopped via annotation |
| `AuthProxyPreserved` | `LatestDeploymentReady` | Auth proxy container kept to avoid restart |

## Model Status (`status.modelStatus`)

This subsystem tracks model loading lifecycle independently of Pod readiness. It is computed by the KServe controller from Pod container statuses.

### State Machine

```
Pending ──► Loading ──► Loaded
   │            │
   │            ▼
   └──────► FailedToLoad
```

| Field | Values | Meaning |
|-------|--------|---------|
| `transitionStatus` | `UpToDate` | Target model state reached |
| | `InProgress` | Model loading or pending |
| | `BlockedByFailedLoad` | Model failed to load |
| | `InvalidSpec` | Predictor spec validation failed |
| `activeModelState` | `Loaded` | Model is serving |
| | `Pending` | Pod exists but model not yet loaded |
| | `Loading` | `storage-initializer` running (downloading model) |
| | `FailedToLoad` | Model load failed |
| `targetModelState` | Same enum | Target state during transitions |
| `copies.totalCopies` | int | Number of Ready pods |
| `copies.failedCopies` | int | Number of failed pods |

### Last Failure Info

When `targetModelState` is `FailedToLoad`, `lastFailureInfo` provides details:

| Field | Source |
|-------|--------|
| `reason` | `ModelLoadFailed`, `RuntimeUnhealthy`, `RuntimeDisabled`, `NoSupportingRuntime`, `RuntimeNotRecognized`, `InvalidPredictorSpec` |
| `exitCode` | From `containerStatuses[].lastState.terminated.exitCode` or `.state.terminated.exitCode` |
| `message` | From container termination message |

### How Model State is Derived (from Pod inspection)

1. **0 ready pods** → `Pending` (or `FailedToLoad` if Knative conditions are False)
2. **`storage-initializer` init container:**
   - `.state.Running` (no prior termination) → `Loading`
   - `.state.Terminated` with `Reason=Error` → `FailedToLoad` (exitCode from termination)
   - `.state.Waiting` with `Reason=CrashLoopBackOff` → `FailedToLoad` (exitCode from last termination)
3. **InferenceService `IsReady()`** → `Loaded`
4. **`kserve-container`:**
   - `.state.Terminated` with `Reason=Error` → `FailedToLoad`
   - `.state.Waiting` with `Reason=CrashLoopBackOff` → `FailedToLoad`
   - Otherwise → `Pending`

## Events

### On InferenceService CR (emitted by KServe controller)

| Reason | Type | Message | When |
|--------|------|---------|------|
| `InferenceServiceReady` | Normal | `InferenceService [<name>] is Ready` | Transition to Ready |
| `InferenceServiceNotReady` | Warning | `InferenceService [<name>] is no longer Ready because of: <conditions>` | Transition from Ready |
| `InternalError` | Warning | `<error message>` | Reconcile error |
| `UpdateFailed` | Warning | `Failed to update status for InferenceService "<name>": <error>` | Status write failed |

### On Pods (emitted by kubelet)

| Reason | Type | Container context | Meaning |
|--------|------|-------------------|---------|
| `Scheduled` | Normal | — | Pod assigned to node |
| `AddedInterface` | Normal | — | Network interface (OVN/Multus) |
| `Pulling` | Normal | storage-initializer, kserve-container, kube-rbac-proxy | Image pull started |
| `Pulled` | Normal | (same) | Image pull completed (includes size and duration) |
| `Created` | Normal | (same) | Container created |
| `Started` | Normal | (same) | Container started |
| `FailedMount` | Warning | — | Volume mount failure (e.g. missing serving cert Secret) |
| `Unhealthy` | Warning | kserve-container | Readiness/startup probe failed |
| `BackOff` | Warning | kserve-container, storage-initializer | CrashLoopBackOff |
| `Killing` | Normal | kserve-container | Container being stopped |

### On Deployment (emitted by Deployment controller)

| Reason | Type | Message |
|--------|------|---------|
| `ScalingReplicaSet` | Normal | `Scaled up replica set <name>-<hash> from 0 to N` |

### On HorizontalPodAutoscaler

| Reason | Type | Message |
|--------|------|---------|
| `FailedGetResourceMetric` | Warning | `failed to get cpu utilization: ...` |
| `FailedComputeMetricsReplicas` | Warning | `invalid metrics (N invalid out of M)...` |

HPA metric warnings are common during startup and usually resolve once pods are ready. Persistent warnings indicate a metrics-server or pod health issue.

## Event Filtering Strategy

To scope events to the current deployment instance:

1. **CR-level events:** `involvedObject.kind=InferenceService,involvedObject.name=<name>`
2. **Pod events:** List Pods with `labelSelector=serving.kserve.io/inferenceservice=<name>`, identify the latest ReplicaSet, then watch `involvedObject.kind=Pod,involvedObject.uid=<pod-uid>` for each relevant Pod
3. **Deployment events:** `involvedObject.kind=Deployment,involvedObject.name=<name>-predictor`

## Stopped State

An InferenceService is stopped when:
- `metadata.annotations['serving.kserve.io/stop']` is set (not `"false"`)
- `status.conditions` shows `Stopped: True` (severity: Info)
- `PredictorReady: False` with reason `Stopped`
- `Ready: False` with reason `Stopped`
- `modelStatus.transitionStatus` is empty, `modelStatus.states` is nil
