package pipelines

import "errors"

// Sentinel errors for pipeline operations.
// ErrConflict is shared with the kubernetes package — use k8s.ErrConflict.
var (
	ErrPipelineRunNotFound = errors.New("pipeline run not found")
	ErrPipelineNotFound    = errors.New("pipeline not found")
	ErrInvalidInput        = errors.New("invalid input")
	ErrInvalidRunState     = errors.New("invalid run state for operation")
	ErrNoDSPAFound         = errors.New("no pipeline server found in namespace")
	ErrDSPANotReady        = errors.New("pipeline server exists but is not ready")

	// ErrPipelineServerBadRequest indicates the pipeline server itself rejected a request
	// as malformed (HTTP 400) — distinct from ErrInvalidInput, which is raised for local
	// parameter validation before a request is ever sent.
	ErrPipelineServerBadRequest = errors.New("pipeline server rejected request")

	// ErrPipelineServerCharsetRejected indicates the pipeline server rejected a request
	// because it contains characters its underlying storage doesn't support. KFP
	// deployments backed by MySQL without utf8mb4 reject non-ASCII bytes in
	// PipelineRuntimeManifest/WorkflowRuntimeManifest columns.
	ErrPipelineServerCharsetRejected = errors.New("pipeline server rejected request due to unsupported character encoding")
)

// KFP v2beta1 run state sets — which states allow which mutations.
var (
	terminatableStates = map[RunState]bool{RunStatePending: true, RunStateRunning: true, RunStatePaused: true}
	retryableStates    = map[RunState]bool{RunStateFailed: true, RunStateCanceled: true}
	deletableStates    = map[RunState]bool{RunStateSucceeded: true, RunStateFailed: true, RunStateCanceled: true}
)
