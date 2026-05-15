package pipelines

import "errors"

// Sentinel errors for pipeline operations
var (
	ErrPipelineRunNotFound = errors.New("pipeline run not found")
	ErrPipelineNotFound    = errors.New("pipeline not found")
	ErrConflict            = errors.New("resource conflict")
	ErrInvalidInput        = errors.New("invalid input")
)
