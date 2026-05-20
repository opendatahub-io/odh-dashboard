# Deployment Status — LLMInferenceService (LLM-D / Disaggregated Serving)

**API:** `serving.kserve.io/v1alpha2` `LLMInferenceService`

## TL;DR — Progress Steps

```
1. Deployment requested
2. Resources created
   ├── (dynamic sub-steps from Created events)
3. Model workload
   ├── Pod scheduled
   ├── Model downloaded
   └── Model server started
4. Router / scheduler
   ├── Pod scheduled
   ├── Tokenizer ready
   ├── Scheduler started
   ├── HTTP routes ready
   └── Inference pool ready
5. Presets combined
6. Deployment ready
```

Steps 3 and 4 progress independently — the model workload may be ready while the router is still starting, or vice versa.

| Step | Sub-step | Success signal | Error signal | Fallback (events expired) |
|------|----------|---------------|-------------|--------------------------|
| **Deployment requested** | | LLMISVC exists, `stop` annotation absent | — | Always derivable |
| **Resources created** | | LLMISVC events `reason=Created` exist, or any `status.conditions` present | — | `status.conditions` length > 0 → resources were created |
| | *(dynamic)* | One sub-step per LLMISVC event `reason=Created`; title = `event.message` (e.g. `"Created v1.Deployment emily/llmd-cpu-kserve"`) | — | Events expire; parent still shows success from conditions |
| **Model workload** | | All children green, or `MainWorkloadReady: True` | Any child red, or `MainWorkloadReady.reason = ProgressDeadlineExceeded\|MinimumReplicasUnavailable`; description from `MainWorkloadReady.message` | `MainWorkloadReady: True` → all children green |
| | Pod scheduled | Model pod event `reason=Scheduled` (pod name matches `<name>-kserve-*`, excludes `router-scheduler`) | Model pod event `reason=FailedScheduling` | `MainWorkloadReady: True` |
| | Model downloaded | Model pod event `reason=Started` where `message` contains `storage-initializer` | — | `MainWorkloadReady: True` |
| | Model server started | Model pod event `reason=Started` where `message` contains `main` | Model pod event `reason=BackOff\|Unhealthy` where `message` contains `main` | `MainWorkloadReady: True` |
| **Router / scheduler** | | All children green, or `RouterReady: True` | Any child red, or `RouterReady.reason = ProgressDeadlineExceeded`; description from `RouterReady.message` | `RouterReady: True` → all children green |
| | Pod scheduled | Router pod event `reason=Scheduled` (pod name matches `<name>-kserve-router-scheduler-*`) | Router pod event `reason=FailedScheduling` | `RouterReady: True` |
| | Tokenizer ready | Router pod event `reason=Started` where `message` contains `tokenizer` | — | `RouterReady: True` |
| | Scheduler started | Router pod event `reason=Started` where `message` contains `main` | Router pod event `reason=BackOff\|Unhealthy` where `message` contains `main` | `RouterReady: True` |
| | HTTP routes ready | `status.conditions[HTTPRoutesReady].status = "True"` | `HTTPRoutesReady.status = "False"` | Always derivable from LLMISVC status |
| | Inference pool ready | `status.conditions[InferencePoolReady].status = "True"` | `InferencePoolReady.status = "False"` | Always derivable from LLMISVC status |
| **Presets combined** | | `status.conditions[PresetsCombined].status = "True"` | `PresetsCombined.status = "False"` | Always derivable from LLMISVC status |
| **Deployment ready** | | `status.conditions[Ready].status = "True"` | `Ready.status = "False"` and not stopped; description from `Ready.message` | Always derivable from LLMISVC status |

---

This document covers the status signals available for LLMInferenceService deployments, which use the LLM-D disaggregated serving architecture with separate model workload and router/scheduler components.

## Resource Chain

```
LLMInferenceService
├── Deployment (<name>-kserve) — model workload
│   └── ReplicaSet → Pod(s)
│       ├── storage-initializer (init) — model download
│       └── main — model server (e.g. vLLM)
├── Deployment (<name>-kserve-router-scheduler) — EPP scheduler
│   └── ReplicaSet → Pod(s)
│       ├── storage-initializer (init) — tokenizer download
│       ├── tokenizer — kv-cache tokenizer sidecar
│       └── main — inference scheduler
├── Service (<name>-kserve-workload-svc) — model pod communication
├── Service (<name>-epp-service) — Endpoint Picker Protocol
├── ServiceAccount (<name>-epp-sa) — EPP identity
├── Secret (<name>-kserve-self-signed-certs) — TLS certificates
├── InferencePool (<name>-inference-pool) — Gateway API inference pool
├── HTTPRoute (<name>-kserve-route) — Gateway API routing
└── DestinationRule (<name>-kserve-shadow-svc) — Istio shadow service (OCP)
```

All owned children use the label `app.kubernetes.io/part-of: llminferenceservice` and have `ownerReferences` pointing to the LLMInferenceService.

### Child Resource Labels

| Deployment | Labels |
|------------|--------|
| `<name>-kserve` | `app.kubernetes.io/component: llminferenceservice-workload`, `kserve.io/component: workload`, `llm-d.ai/role: both` |
| `<name>-kserve-router-scheduler` | `app.kubernetes.io/component: llminferenceservice-router-scheduler` |

## Status Conditions

### Condition Hierarchy

LLMInferenceService has the richest condition tree of any model serving platform:

```
Ready (Knative LivingConditionSet rollup)
├── WorkloadsReady (rollup via DetermineWorkloadReadiness)
│   ├── MainWorkloadReady         ← model Deployment Available condition
│   ├── WorkerWorkloadReady       ← worker LeaderWorkerSet (multi-node, optional)
│   ├── PrefillWorkloadReady      ← prefill Deployment (disaggregated P/D, optional)
│   └── PrefillWorkerWorkloadReady ← prefill LeaderWorkerSet (optional)
├── RouterReady (rollup via DetermineRouterReadiness)
│   ├── HTTPRoutesReady           ← HTTPRoute accepted by gateway controller
│   ├── InferencePoolReady        ← InferencePool created and accepted
│   ├── SchedulerWorkloadReady    ← router-scheduler Deployment Available
│   └── GatewaysReady             ← referenced Gateway programmed (optional)
└── PresetsCombined               ← config presets merged (does NOT gate Ready)
```

### Rollup Rules

**`DetermineWorkloadReadiness`:** Iterates `MainWorkloadReady`, `WorkerWorkloadReady`, `PrefillWorkloadReady`, `PrefillWorkerWorkloadReady`. Skips `nil` (unset) conditions. First `False` sub-condition propagates its `reason` and `message` to `WorkloadsReady`. If none are False, `WorkloadsReady` is True.

**`DetermineRouterReadiness`:** Same pattern over `GatewaysReady`, `HTTPRoutesReady`, `InferencePoolReady`, `SchedulerWorkloadReady`.

**`Ready`:** Knative `LivingConditionSet` — both `WorkloadsReady` and `RouterReady` must be True.

**`PresetsCombined`** is tracked separately and is **not** in the `Ready` set.

### Condition Details

| Condition | True when | False reason examples |
|-----------|-----------|----------------------|
| `MainWorkloadReady` | Model Deployment `Available=True` | `MinimumReplicasUnavailable`, `ProgressDeadlineExceeded`, `Stopped` |
| `WorkerWorkloadReady` | Worker LWS `Available=True` | LWS condition reason |
| `PrefillWorkloadReady` | Prefill Deployment `Available=True` | Same as Main |
| `SchedulerWorkloadReady` | Scheduler Deployment has available replicas | `ProgressDeadlineExceeded`, `MinimumReplicasUnavailable` |
| `HTTPRoutesReady` | HTTPRoute accepted by gateway controller | `HTTPRoutesNotReady`, `RefsInvalidReason` |
| `InferencePoolReady` | InferencePool CR accepted | `InferencePoolNotReady` |
| `GatewaysReady` | Referenced Gateway `Programmed=True` | `GatewaysNotReady`, `GatewayPreconditionNotMet` |
| `PresetsCombined` | Base config + presets merged successfully | `CombineBaseError`, `Stopped` |

### How Workload Conditions Map to Deployment Status

The `propagateDeploymentStatus` function in the KServe LLMISVC reconciler reads child Deployment status:

1. `Deployment.status.conditions[type=Available].status=True` → mark workload ready
2. `Deployment.status.conditions[type=Available].status≠True` or `Progressing.status=False` → mark not ready with the Deployment condition's reason and message
3. No `Available` condition yet → not ready, reason `Progressing`

## Model Status

**LLMInferenceService does NOT have a `modelStatus` subsystem.** There is no `activeModelState`, `targetModelState`, `transitionStatus`, or `lastFailureInfo`.

Model loading state must be inferred from:
- `MainWorkloadReady` condition (reflects Deployment availability, which depends on container readiness)
- Pod `initContainerStatuses` for `storage-initializer` (model download progress/failures)
- Pod `containerStatuses` for `main` (model server health)

## Events

### On LLMInferenceService CR (emitted by KServe LLMISVC controller)

These events are **very useful** — they provide a built-in progress tracker for child resource creation:

| Reason | Type | Message pattern | Example |
|--------|------|-----------------|---------|
| `Created` | Normal | `Created <kind> <namespace>/<name>` | `Created v1.Deployment emily/llmd-cpu-kserve` |
| `Updated` | Normal | `Updated <kind> <namespace>/<name>` | `Updated v1.Secret emily/llmd-cpu-kserve-self-signed-certs` |
| `Deleted` | Normal | `Deleted <kind> <namespace>/<name>` | `Deleted v1.Service emily/llmd-cpu-epp-service` |
| `Error` | Warning | `Reconciliation failed: <error>` | Reconcile error |
| `ScalingCRDNotFound` | Warning | `Required scaling CRD not installed: <error>` | Missing KEDA/WVA CRD |

**Note:** LLMInferenceService does **NOT** emit `Ready`/`NotReady` transition events (unlike InferenceService).

### Observed Child Resource Creation Events (ordered)

From a real deployment (`llmd-cpu`), the `Created` events on the LLMISVC resource showed this sequence:

1. `Created v1.Secret emily/llmd-cpu-kserve-self-signed-certs`
2. `Created v1.Deployment emily/llmd-cpu-kserve`
3. `Created v1.Service emily/llmd-cpu-kserve-workload-svc`
4. `Created v1.ServiceAccount emily/llmd-cpu-epp-sa`
5. `Created v1.Service emily/llmd-cpu-epp-service`
6. `Created v1alpha2.InferencePool emily/llmd-cpu-inference-pool`
7. `Created v1.InferencePool emily/llmd-cpu-inference-pool`
8. `Created v1.HTTPRoute emily/llmd-cpu-kserve-route`
9. `Created v1.DestinationRule emily/llmd-cpu-kserve-shadow-svc`
10. `Created v1.Deployment emily/llmd-cpu-kserve-router-scheduler`

### On Pods (emitted by kubelet)

Same kubelet events as InferenceService (Scheduled, Pulling, Pulled, Created, Started, BackOff, Unhealthy, etc.), but now across **two separate Deployment chains**:

**Model pod events (`<name>-kserve-*`):**
- `storage-initializer` init container events (model download)
- `main` container events (model server startup, health probes)

**Router-scheduler pod events (`<name>-kserve-router-scheduler-*`):**
- `storage-initializer` init container events (tokenizer download)
- `tokenizer` container events
- `main` container events (scheduler startup)

### On LLMInferenceService from odh-model-controller

| Reason | Type | Message |
|--------|------|---------|
| `ReconcileError` | Warning | `Failed to reconcile LLMInferenceService: <error>` |

## Event Filtering Strategy

LLMInferenceService events come from multiple sources:

1. **CR-level events:** `involvedObject.kind=LLMInferenceService,involvedObject.name=<name>` — gives the `Created`/`Updated`/`Deleted` child resource events
2. **Model pod events:** List Pods with label `app.kubernetes.io/component=llminferenceservice-workload,app.kubernetes.io/name=<name>`
3. **Router pod events:** List Pods with label `app.kubernetes.io/component=llminferenceservice-router-scheduler,app.kubernetes.io/name=<name>`
4. **Deployment events:** `involvedObject.kind=Deployment,involvedObject.name=<name>-kserve` and `<name>-kserve-router-scheduler`

## Stopped State

An LLMInferenceService is stopped when:
- `metadata.annotations['serving.kserve.io/stop']` is set
- Sub-conditions are marked `False` with reason `Stopped`
- Child workload Deployments are deleted
- `PresetsCombined` may show a warning with reason `Stopped`

## Multi-Deployment Considerations

A key UI challenge: the model workload and router-scheduler can fail independently. Your `llmd-cpu` example shows:
- Model pod: `CrashLoopBackOff` on `main` container (vLLM failing to start)
- Router-scheduler pod: `CrashLoopBackOff` on `main` container (scheduler can't connect)

Both roll up to `Ready: False` with `ProgressDeadlineExceeded`, but a useful status display should distinguish which component is failing. The condition hierarchy already captures this: `MainWorkloadReady` vs `SchedulerWorkloadReady` give independent signals.
