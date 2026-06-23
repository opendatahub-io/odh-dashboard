package repositories

import (
	"net/url"
	"strings"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

// FilterPageValues extracts pagination-related query parameters from URL values.
func FilterPageValues(values url.Values) url.Values {
	result := url.Values{}

	if v := values.Get("pageSize"); v != "" {
		result.Set("pageSize", v)
	}
	if v := values.Get("orderBy"); v != "" {
		result.Set("orderBy", v)
	}
	if v := values.Get("sortOrder"); v != "" {
		result.Set("sortOrder", v)
	}
	if v := values.Get("nextPageToken"); v != "" {
		result.Set("nextPageToken", v)
	}

	return result
}

// URLWithParams merges query parameters into a URL string, preserving any existing query parameters.
func URLWithParams(rawURL string, values url.Values) string {
	if len(values) == 0 {
		return rawURL
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return rawURL
	}
	existing := parsed.Query()
	for k, vs := range values {
		for _, v := range vs {
			existing.Add(k, v)
		}
	}
	parsed.RawQuery = existing.Encode()
	return parsed.String()
}

// URLWithPageParams appends only pagination-related query parameters to a URL string.
func URLWithPageParams(url string, values url.Values) string {
	pageValues := FilterPageValues(values)
	return URLWithParams(url, pageValues)
}

// isDiscoveryError returns true when the error indicates a CRD is not installed.
// Handles MethodNotSupported and NoMatch-style errors which can occur
// when a GVR is unregistered on different cluster types.
// NotFound is NOT included because it can also mean the CRD exists but a specific
// instance is missing - callers must handle IsNotFound separately when the distinction matters.
// 403 (Forbidden) is NOT treated as a discovery error because it means the CRD
// exists but the user lacks access - silencing that would hide misconfiguration.
func isDiscoveryError(err error) bool {
	if k8serrors.IsMethodNotSupported(err) {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "no matches for kind") ||
		strings.Contains(msg, "the server could not find the requested resource")
}
