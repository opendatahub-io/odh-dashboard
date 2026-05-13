package kubernetes

import "fmt"

// NotFoundError represents a resource not found error
type NotFoundError struct {
	Resource string
	Name     string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s not found: %s", e.Resource, e.Name)
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
