package errors

import "errors"

// ErrNotFound is returned when a requested agent resource is not found.
var ErrNotFound = errors.New("resource not found")

// ErrForbidden is returned when the caller lacks permission to read the agent workload.
var ErrForbidden = errors.New("resource access forbidden")

// ErrUpstreamUnavailable is returned when the agent monitoring backend cannot reach the agent workload.
var ErrUpstreamUnavailable = errors.New("upstream service unavailable")

// ErrAlreadyExists is returned when attempting to create a resource that already exists.
var ErrAlreadyExists = errors.New("resource already exists")

// ErrConflict is returned when a request conflicts with the current state of the resource.
var ErrConflict = errors.New("resource state conflict")
