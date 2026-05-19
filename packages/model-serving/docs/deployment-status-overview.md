# Model Serving Deployment Status — Overview

## Purpose

This document describes how model serving deployment statuses work at the Kubernetes level, what resources and signals are available, and how the dashboard can surface them to users. It serves as the technical foundation for building a deployment status component analogous to the existing Notebook "Workbench status" modal.

## Comparison with Notebook Status

The existing Workbench status modal for Notebooks derives its entire progress view from **raw `v1/Event` objects** mapped to a fixed linear checklist. This works because Notebooks have a single StatefulSet with one Pod containing two containers.

Model serving deployments are fundamentally different:

| Aspect | Notebook | Model Serving Deployment |
|--------|----------|--------------------------|
| Primary resource | `Notebook` (StatefulSet) | `InferenceService`, `LLMInferenceService`, or `NIMService` |
| Status conditions | None (event-derived) | Rich structured condition hierarchy |
| Model loading state | N/A | `modelStatus` state machine (ISVC only) |
| Child Deployments | 0 (StatefulSet) | 1–2+ Deployments |
| Containers per Pod | 2 (notebook + proxy) | 3–4 (init + model + proxy + agent) |
| Pod replicas | Always 1 | Configurable, often >1 |
| Controller events on CR | None | `Created`/`Deleted`/`Updated` (LLMISVC), `Ready`/`NotReady` (ISVC, NIM) |

## Data Sources (Kubernetes)

### 1. Status Conditions (primary signal)

Every model serving CR has `status.conditions[]` — a list of typed conditions with `status`, `reason`, `message`, and `lastTransitionTime`. This is the **primary structured signal** for deployment health.

- **InferenceService:** 2-level rollup (`PredictorReady` + `IngressReady` → `Ready`)
- **LLMInferenceService:** 3-level hierarchy (8+ conditions rolling up to `Ready`)
- **NIMService:** Simple `Ready` + `Failed` + optional `NIM_CACHE_PVC_CREATED` AND what **InferenceService** has

### 2. Model Status (InferenceService only)

`status.modelStatus` provides a state machine for model loading lifecycle:

```
transitionStatus:  UpToDate | InProgress | BlockedByFailedLoad | InvalidSpec
states:
  activeModelState:  Loaded | Pending | Loading | FailedToLoad | Standby
  targetModelState:  (same enum)
lastFailureInfo:
  reason:   ModelLoadFailed | RuntimeUnhealthy | RuntimeDisabled | ...
  exitCode: <int32>
  message:  <string>
copies:
  totalCopies:  <int>
  failedCopies: <int>
```

### 3. Events (`v1/Event`)

Events are created **in the same namespace** as the involved object. Relevant event sources:

| Source | `involvedObject.kind` | Key reasons |
|--------|----------------------|-------------|
| KServe controller | `InferenceService` | `InferenceServiceReady`, `InferenceServiceNotReady` |
| KServe LLMISVC controller | `LLMInferenceService` | `Created`, `Updated`, `Deleted` (per child resource) |
| NIM operator | `NIMService` | `Ready`, `NotReady`, `Failed` |
| Kubelet | `Pod` | `Scheduled`, `Pulling`, `Pulled`, `Created`, `Started`, `BackOff`, `Unhealthy`, `FailedMount` |
| Deployment controller | `Deployment` | `ScalingReplicaSet` |
| ReplicaSet controller | `ReplicaSet` | `SuccessfulCreate` |
| HPA controller | `HorizontalPodAutoscaler` | `FailedGetResourceMetric`, `FailedComputeMetricsReplicas` |

### 4. Child Resource Status

Deployment `.status.conditions` (particularly `Available` and `Progressing`) provide direct health signals. The `ProgressDeadlineExceeded` reason on `Progressing` is the canonical "stuck" indicator.

## Platform-Specific Details

Each platform has its own resource chain, condition set, and event patterns:

- [InferenceService (KServe Standard)](./deployment-status-inferenceservice.md)
- [LLMInferenceService (LLM-D / Disaggregated Serving)](./deployment-status-llminferenceservice.md)
- [NIMService (NVIDIA NIM)](./deployment-status-nimservice.md)

## Design Considerations for the UI

### Conditions as primary data source

Unlike notebooks (which have no conditions and derive everything from Pod events), model serving CRs have rich structured conditions. The status component should use `status.conditions` as the backbone.

### Platform-agnostic structure

A shared status component could have:

- **Header:** status label (from top-level `Ready` condition) + deployment name
- **Conditions tab:** render the condition tree (flat for ISVC, hierarchical for LLMISVC)
- **Model status tab** (ISVC/NIM only): loading state visualization
- **Events tab:** raw events log (same pattern as notebook's events log)

### Multi-Deployment awareness

LLMInferenceService has multiple Deployments (model + router-scheduler). The condition hierarchy already aggregates these, but a detailed view may want per-deployment breakdowns.

### Replica deduplication

With multiple Pods, event filtering needs to target the **latest ReplicaSet** per Deployment. Stale ReplicaSets from previous rollouts produce irrelevant events.

### Controller vs Pod events

- **Controller events** (on the CR itself) provide high-level lifecycle milestones
- **Pod events** (on individual Pods) provide container-level detail (image pulls, probe failures, crashes)
- Both are valuable at different zoom levels

## Controllers Involved

Two controllers set status on model serving resources:

| Controller | Manages |
|------------|---------|
| **KServe** (`kserve` repo) | `InferenceService` conditions, `modelStatus`, `LLMInferenceService` conditions, child resource CRUD events |
| **odh-model-controller** | Auxiliary resources (OpenShift Route, metrics Service/ServiceMonitor, KEDA, ClusterRoleBinding); `LatestDeploymentReady` condition with `AuthProxyPreserved` reason; `ReconcileError` events on LLMISVC/Gateway |
| **k8s-nim-operator** | `NIMService` conditions and events; delegates to child `InferenceService` |
