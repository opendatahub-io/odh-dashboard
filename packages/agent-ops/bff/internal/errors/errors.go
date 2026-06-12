package errors

import "errors"

// ErrNotFound is returned when a requested agent resource is not found.
var ErrNotFound = errors.New("resource not found")

// ErrUpstreamUnavailable is returned when the agent monitoring backend cannot reach the agent workload.
var ErrUpstreamUnavailable = errors.New("upstream service unavailable")
