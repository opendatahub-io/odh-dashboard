package kubernetes

import (
	"fmt"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

// K8sError represents Kubernetes-specific errors
type K8sError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	Namespace  string `json:"namespace,omitempty"`
	StatusCode int    `json:"-"`
}

func (e *K8sError) Error() string {
	if e.Namespace != "" {
		return fmt.Sprintf("Kubernetes error [%s] in namespace %s: %s", e.Code, e.Namespace, e.Message)
	}
	return fmt.Sprintf("Kubernetes error [%s]: %s", e.Code, e.Message)
}

// Kubernetes error codes
const (
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeForbidden        = "FORBIDDEN"
	ErrCodeNotFound         = "NOT_FOUND"
	ErrCodePermissionDenied = "PERMISSION_DENIED"
	ErrCodeInternalError    = "INTERNAL_ERROR"
)

// NewK8sError creates a new Kubernetes error
func NewK8sError(code, message string, statusCode int) *K8sError {
	return &K8sError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
	}
}

// NewK8sErrorWithNamespace creates a new Kubernetes error with namespace
func NewK8sErrorWithNamespace(code, message, namespace string, statusCode int) *K8sError {
	return &K8sError{
		Code:       code,
		Message:    message,
		Namespace:  namespace,
		StatusCode: statusCode,
	}
}

// NewUnauthorizedError creates an unauthorized error (invalid/expired token)
func NewUnauthorizedError(message string) *K8sError {
	return NewK8sError(ErrCodeUnauthorized, message, 401)
}

// NewForbiddenError creates a forbidden error (insufficient permissions)
func NewForbiddenError(message string) *K8sError {
	return NewK8sError(ErrCodeForbidden, message, 403)
}

// NewPermissionDeniedError creates a permission denied error with namespace context
func NewPermissionDeniedError(namespace, message string) *K8sError {
	return NewK8sErrorWithNamespace(ErrCodePermissionDenied, message, namespace, 403)
}

// IsK8sUnauthorized checks if the error is a Kubernetes unauthorized (401) error
func IsK8sUnauthorized(err error) bool {
	return k8serrors.IsUnauthorized(err)
}

// IsK8sForbidden checks if the error is a Kubernetes forbidden (403) error
func IsK8sForbidden(err error) bool {
	return k8serrors.IsForbidden(err)
}

// wrapK8sSubjectAccessReviewError wraps Kubernetes SubjectAccessReview errors in K8sError for consistent error handling
func wrapK8sSubjectAccessReviewError(err error, namespace string) *K8sError {
	// Check if unauthorized (401) error from K8s API
	if IsK8sUnauthorized(err) {
		// 401 means the user's authentication token is invalid/expired
		return NewUnauthorizedError("authentication failed: invalid or expired token")
	}

	// Check if forbidden (403) error from K8s API
	if IsK8sForbidden(err) {
		// 403 during authorization check - treat as insufficient permissions
		return NewPermissionDeniedError(namespace, "insufficient permissions to access services in this namespace")
	}

	// For other errors, wrap as internal error
	return NewK8sErrorWithNamespace(ErrCodeInternalError,
		fmt.Sprintf("failed to verify user permissions: %v", err),
		namespace,
		500)
}
