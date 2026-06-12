package kubernetes

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestNotFoundError(t *testing.T) {
	err := &NotFoundError{Resource: "pods", Name: "my-pod"}

	if got := err.Error(); got != "pods not found: my-pod" {
		t.Errorf("Error() = %q, want %q", got, "pods not found: my-pod")
	}
	if !errors.Is(err, ErrNotFound) {
		t.Error("expected errors.Is(err, ErrNotFound) to be true")
	}
}

func TestForbiddenError(t *testing.T) {
	err := &ForbiddenError{Resource: "secrets", Action: "list", UserID: "alice"}

	if got := err.Error(); got != "not authorized to list secrets" {
		t.Errorf("Error() = %q, want %q", got, "not authorized to list secrets")
	}
	if !errors.Is(err, ErrForbidden) {
		t.Error("expected errors.Is(err, ErrForbidden) to be true")
	}

	ctx := err.LogContext()
	if ctx["user"] != "alice" || ctx["action"] != "list" || ctx["resource"] != "secrets" {
		t.Errorf("LogContext() = %v, unexpected values", ctx)
	}
}

func TestValidationError(t *testing.T) {
	err := &ValidationError{Field: "namespace", Message: "invalid chars"}

	if got := err.Error(); got != "validation error for field namespace: invalid chars" {
		t.Errorf("Error() = %q, want %q", got, "validation error for field namespace: invalid chars")
	}
	if !errors.Is(err, ErrInvalid) {
		t.Error("expected errors.Is(err, ErrInvalid) to be true")
	}
}

func TestUnauthorizedError(t *testing.T) {
	t.Run("with message", func(t *testing.T) {
		err := &UnauthorizedError{Message: "token expired"}
		if got := err.Error(); got != "token expired" {
			t.Errorf("Error() = %q, want %q", got, "token expired")
		}
	})

	t.Run("without message", func(t *testing.T) {
		err := &UnauthorizedError{}
		if got := err.Error(); got != "unauthorized access" {
			t.Errorf("Error() = %q, want %q", got, "unauthorized access")
		}
	})

	err := &UnauthorizedError{}
	if !errors.Is(err, ErrUnauthorized) {
		t.Error("expected errors.Is(err, ErrUnauthorized) to be true")
	}
}

func TestConflictError(t *testing.T) {
	t.Run("with message", func(t *testing.T) {
		err := &ConflictError{Resource: "configmaps", Name: "my-cm", Message: "version mismatch"}
		want := "conflict on configmaps my-cm: version mismatch"
		if got := err.Error(); got != want {
			t.Errorf("Error() = %q, want %q", got, want)
		}
	})

	t.Run("without message", func(t *testing.T) {
		err := &ConflictError{Resource: "configmaps", Name: "my-cm"}
		want := "conflict on configmaps my-cm"
		if got := err.Error(); got != want {
			t.Errorf("Error() = %q, want %q", got, want)
		}
	})

	err := &ConflictError{}
	if !errors.Is(err, ErrConflict) {
		t.Error("expected errors.Is(err, ErrConflict) to be true")
	}
}

func TestTranslateK8sError(t *testing.T) {
	t.Run("nil error", func(t *testing.T) {
		if got := TranslateK8sError(nil, "pods", "list"); got != nil {
			t.Errorf("expected nil, got %v", got)
		}
	})

	t.Run("non-k8s error passes through", func(t *testing.T) {
		orig := fmt.Errorf("plain error")
		got := TranslateK8sError(orig, "pods", "list")
		if got != orig {
			t.Errorf("expected original error, got %v", got)
		}
	})

	tests := []struct {
		name     string
		k8sErr   *apierrors.StatusError
		sentinel error
	}{
		{
			name:     "unauthorized",
			k8sErr:   apierrors.NewUnauthorized("bad token"),
			sentinel: ErrUnauthorized,
		},
		{
			name: "forbidden",
			k8sErr: apierrors.NewForbidden(
				schema.GroupResource{Resource: "secrets"}, "my-secret", fmt.Errorf("denied")),
			sentinel: ErrForbidden,
		},
		{
			name:     "not found",
			k8sErr:   apierrors.NewNotFound(schema.GroupResource{Resource: "pods"}, "my-pod"),
			sentinel: ErrNotFound,
		},
		{
			name: "conflict",
			k8sErr: apierrors.NewConflict(
				schema.GroupResource{Resource: "configmaps"}, "my-cm", fmt.Errorf("update conflict")),
			sentinel: ErrConflict,
		},
		{
			name: "invalid",
			k8sErr: apierrors.NewInvalid(
				schema.GroupKind{Kind: "Pod"}, "bad-pod", nil),
			sentinel: ErrInvalid,
		},
		{
			name:     "bad request",
			k8sErr:   apierrors.NewBadRequest("malformed"),
			sentinel: ErrInvalid,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := TranslateK8sError(tt.k8sErr, "resource", "action")
			if !errors.Is(got, tt.sentinel) {
				t.Errorf("expected errors.Is(err, %v) to be true, got: %v", tt.sentinel, got)
			}
		})
	}

	t.Run("unknown k8s error wraps with context", func(t *testing.T) {
		k8sErr := &apierrors.StatusError{
			ErrStatus: metav1.Status{
				Status:  metav1.StatusFailure,
				Code:    http.StatusServiceUnavailable,
				Reason:  metav1.StatusReasonServiceUnavailable,
				Message: "service unavailable",
			},
		}
		got := TranslateK8sError(k8sErr, "pods", "list")
		if got == nil {
			t.Fatal("expected non-nil error")
		}
		want := "kubernetes API error for list pods"
		if got.Error()[:len(want)] != want {
			t.Errorf("error message = %q, want prefix %q", got.Error(), want)
		}
	})
}
