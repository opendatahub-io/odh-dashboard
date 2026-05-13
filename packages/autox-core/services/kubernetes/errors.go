package kubernetes

import (
	"errors"
	"fmt"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// Sentinel errors for common cases
var (
	ErrUnauthorized = errors.New("unauthorized access")
	ErrForbidden    = errors.New("insufficient permissions")
	ErrNotFound     = errors.New("resource not found")
	ErrConflict     = errors.New("resource conflict")
	ErrInvalid      = errors.New("invalid request")
	ErrBadRequest   = errors.New("bad request")
)

// NotFoundError represents a resource not found error
type NotFoundError struct {
	Resource string
	Name     string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s not found: %s", e.Resource, e.Name)
}

// Unwrap allows errors.Is to match against ErrNotFound
func (e *NotFoundError) Unwrap() error {
	return ErrNotFound
}

// ForbiddenError represents an authorization error
type ForbiddenError struct {
	Resource string
	Action   string
	UserID   string
}

func (e *ForbiddenError) Error() string {
	return fmt.Sprintf("not authorized to %s %s", e.Action, e.Resource)
}

// Unwrap allows errors.Is to match against ErrForbidden
func (e *ForbiddenError) Unwrap() error {
	return ErrForbidden
}

// LogContext returns structured logging data for the error
// UserID should only be logged server-side, not exposed in user-facing errors
func (e *ForbiddenError) LogContext() map[string]any {
	return map[string]any{
		"user":     e.UserID,
		"action":   e.Action,
		"resource": e.Resource,
	}
}

// ValidationError represents an input validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation error for field %s: %s", e.Field, e.Message)
}

// Unwrap allows errors.Is to match against ErrInvalid
func (e *ValidationError) Unwrap() error {
	return ErrInvalid
}

// UnauthorizedError represents an authentication error
type UnauthorizedError struct {
	Message string
}

func (e *UnauthorizedError) Error() string {
	if e.Message != "" {
		return e.Message
	}
	return "unauthorized access"
}

// Unwrap allows errors.Is to match against ErrUnauthorized
func (e *UnauthorizedError) Unwrap() error {
	return ErrUnauthorized
}

// ConflictError represents a resource conflict error
type ConflictError struct {
	Resource string
	Name     string
	Message  string
}

func (e *ConflictError) Error() string {
	if e.Message != "" {
		return fmt.Sprintf("conflict on %s %s: %s", e.Resource, e.Name, e.Message)
	}
	return fmt.Sprintf("conflict on %s %s", e.Resource, e.Name)
}

// Unwrap allows errors.Is to match against ErrConflict
func (e *ConflictError) Unwrap() error {
	return ErrConflict
}

// TranslateK8sError converts Kubernetes API errors to domain errors
// while preserving the original error in the error chain for logging/debugging.
// Returns the original error if it's not a Kubernetes StatusError.
func TranslateK8sError(err error, resource, action string) error {
	if err == nil {
		return nil
	}

	var statusErr *apierrors.StatusError
	if !errors.As(err, &statusErr) {
		// Not a K8s API error - return as-is
		return err
	}

	// Translate based on K8s error type
	switch {
	case apierrors.IsUnauthorized(statusErr):
		return fmt.Errorf("%w: %v", &UnauthorizedError{}, err)
	case apierrors.IsForbidden(statusErr):
		return fmt.Errorf("%w: %v", &ForbiddenError{Resource: resource, Action: action}, err)
	case apierrors.IsNotFound(statusErr):
		return fmt.Errorf("%w: %v", &NotFoundError{Resource: resource}, err)
	case apierrors.IsConflict(statusErr):
		return fmt.Errorf("%w: %v", &ConflictError{Resource: resource}, err)
	case apierrors.IsInvalid(statusErr), apierrors.IsBadRequest(statusErr):
		return fmt.Errorf("%w: %v", ErrInvalid, err)
	default:
		// Unknown K8s error - wrap with context
		return fmt.Errorf("kubernetes API error for %s %s: %w", action, resource, err)
	}
}
