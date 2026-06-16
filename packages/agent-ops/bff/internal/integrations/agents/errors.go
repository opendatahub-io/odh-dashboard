package agents

import (
	"errors"
	"fmt"
)

var (
	// ErrNotFound indicates the requested agent does not exist.
	ErrNotFound = errors.New("agent not found")
	// ErrForbidden indicates the caller cannot read the agent workload.
	ErrForbidden = errors.New("agent access forbidden")
	// ErrUnavailable indicates agent data could not be loaded (e.g. workload unreachable).
	ErrUnavailable = errors.New("agent data unavailable")
)

// UnavailableError provides context for ErrUnavailable.
type UnavailableError struct {
	Message string
}

func (e *UnavailableError) Error() string {
	if e.Message == "" {
		return ErrUnavailable.Error()
	}
	return fmt.Sprintf("%s: %s", ErrUnavailable.Error(), e.Message)
}

func (e *UnavailableError) Unwrap() error {
	return ErrUnavailable
}
