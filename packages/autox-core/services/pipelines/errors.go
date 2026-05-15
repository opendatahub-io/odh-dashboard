package pipelines

import "errors"

// Sentinel errors for pipeline operations
var (
	ErrPipelineRunNotFound    = errors.New("pipeline run not found")
	ErrPipelineNotFound       = errors.New("pipeline not found")
	ErrConflict               = errors.New("resource conflict")
	ErrInvalidInput           = errors.New("invalid input")
	ErrInvalidRunState        = errors.New("invalid run state for operation")
)

// KFP v2beta1 run state sets — which states allow which mutations.
var (
	terminatableStates = map[string]bool{"PENDING": true, "RUNNING": true, "PAUSED": true}
	retryableStates    = map[string]bool{"FAILED": true, "CANCELED": true}
	deletableStates    = map[string]bool{"SUCCEEDED": true, "FAILED": true, "CANCELED": true}
)
