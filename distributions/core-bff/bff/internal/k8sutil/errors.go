package k8sutil

import (
	"errors"
	"net/http"

	"k8s.io/apimachinery/pkg/api/meta"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

// IsDiscoveryError returns true when the error indicates a CRD is not installed.
// Uses typed checks only - no string matching:
//   - MethodNotSupported: some API servers return 405 for unknown resource paths.
//   - NoKindMatchError / NoResourceMatchError: REST mapper cannot resolve the GVR.
//   - 404 with nil Details: the dynamic client hit an API path that doesn't exist.
//     Instance-not-found (CRD exists, object missing) returns 404 WITH Details,
//     so it is excluded here - callers handle IsNotFound separately.
//
// 403 (Forbidden) is NOT treated as a discovery error because it means the CRD
// exists but the user lacks access - silencing that would hide misconfiguration.
func IsDiscoveryError(err error) bool {
	if k8serrors.IsMethodNotSupported(err) {
		return true
	}
	if meta.IsNoMatchError(err) {
		return true
	}
	// When the dynamic client hits an API path for a CRD that doesn't exist,
	// the API server returns 404 with no resource details (Details nil or empty).
	// Instance-not-found always populates Details.Name with the resource name.
	var statusErr *k8serrors.StatusError
	if errors.As(err, &statusErr) {
		s := statusErr.ErrStatus
		if s.Code == http.StatusNotFound && (s.Details == nil || s.Details.Name == "") {
			return true
		}
	}
	return false
}

// IsResourceUnavailable returns true when the resource or its CRD is absent.
// Broader than IsDiscoveryError: also matches IsNotFound (instance missing).
func IsResourceUnavailable(err error) bool {
	return k8serrors.IsNotFound(err) || IsDiscoveryError(err)
}
