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
)

// KFP v2beta1 run state sets — which states allow which mutations.
var (
	terminatableStates = map[string]bool{"PENDING": true, "RUNNING": true, "PAUSED": true}
	retryableStates    = map[string]bool{"FAILED": true, "CANCELED": true}
	deletableStates    = map[string]bool{"SUCCEEDED": true, "FAILED": true, "CANCELED": true}
)
