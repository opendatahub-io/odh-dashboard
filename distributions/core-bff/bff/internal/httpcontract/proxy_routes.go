package httpcontract

import (
	"net/http"
	"slices"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	corev1 "k8s.io/api/core/v1"
)

const (
	// Resource indices in upstream paths without the leading empty segment:
	// api/{version}/{resource} and apis/{group}/{version}/{resource}.
	k8sCoreResourceIndex    = 2
	k8sGroupedResourceIndex = 3
	// Namespaced resources follow namespaces/{namespace}.
	k8sNamespacePrefixSegments = 2
)

// proxyDiagnosticsAllowed separates caller-token resource routes from strict
// Secret, discovery and unknown routes. Namespace and object names are not resources.
func proxyDiagnosticsAllowed(r *http.Request) bool {
	if r == nil || r.URL == nil {
		return false
	}
	path := r.URL.Path
	if rest, ok := strings.CutPrefix(path, constants.BFFPathPrefix+"/"); ok {
		path = "/" + rest
	}
	for _, prefix := range []string{constants.K8sProxyPrefix, constants.WssProxyPrefix} {
		if rest, ok := strings.CutPrefix(path, prefix); ok {
			path = "/" + rest
			break
		}
	}
	segments := strings.Split(strings.Trim(path, "/"), "/")
	// Strip the API version (and group) before locating the actual resource.
	resourceIndex := k8sCoreResourceIndex
	if strings.HasPrefix(path, constants.K8sGroupedAPIPrefix) {
		resourceIndex = k8sGroupedResourceIndex
	} else if !strings.HasPrefix(path, constants.K8sCoreAPIPrefix) {
		return false
	}
	// Unknown routes and discovery errors retain the strict fallback.
	if len(segments) <= resourceIndex {
		return false
	}
	// URL.Path is decoded; upstream normalization could change dot-segment routes.
	if slices.ContainsFunc(segments, func(segment string) bool {
		return segment == "" || segment == "." || segment == ".."
	}) {
		return false
	}
	if segments[resourceIndex] == "watch" || segments[resourceIndex] == "proxy" {
		resourceIndex++
	}
	if len(segments) <= resourceIndex {
		return false
	}
	if segments[resourceIndex] == "namespaces" && len(segments) > resourceIndex+k8sNamespacePrefixSegments {
		resourceIndex += k8sNamespacePrefixSegments
	}
	return segments[resourceIndex] != string(corev1.ResourceSecrets)
}
