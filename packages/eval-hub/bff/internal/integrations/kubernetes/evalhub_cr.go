package kubernetes

import "k8s.io/apimachinery/pkg/runtime/schema"

// EvalHub CRD constants for Kubernetes CR auto-discovery.
// When EVAL_HUB_URL is not provided, the BFF discovers the EvalHub service URL
// by listing EvalHub CRs in the user-provided namespace and reading status.url.
const (
	// EvalHubCRDGroup is the API group for EvalHub custom resources.
	EvalHubCRDGroup = "trustyai.opendatahub.io"

	// EvalHubCRDVersion is the preferred API version for EvalHub custom resources.
	// v1 is the CRD storage version (trustyai-service-operator#758) and is served
	// directly by the API server, so CR reads never depend on the conversion webhook.
	EvalHubCRDVersion = "v1"

	// EvalHubCRDLegacyVersion is the fallback API version for clusters running older
	// trustyai-service-operator releases where v1 is not served and v1alpha1 is the
	// storage version. On current operators v1alpha1 is only served through the
	// conversion webhook — if that webhook is unavailable, v1alpha1 reads hang until
	// the caller's context deadline, which is why it must not be the primary version.
	EvalHubCRDLegacyVersion = "v1alpha1"

	// EvalHubCRDResource is the plural resource name for the EvalHub operator CRD.
	// Used by the BFF's service account to discover the EvalHub service URL from CR status.
	// Only accessible to cluster-admins and the BFF's own service account — never used for user SAR checks.
	EvalHubCRDResource = "evalhubs"

	// EvalHubVirtualResource is the virtual resource name used for SubjectAccessReview checks.
	// The TrustyAI operator provisions per-tenant Roles granting access to this virtual resource
	// in each namespace labelled with evalhub.trustyai.opendatahub.io/tenant.
	// Using this (not EvalHubCRDResource) ensures the SAR reflects actual tenant-level permissions.
	EvalHubVirtualResource = "evaluations"

	// EvalHubDiscoveryConfigMap is the name of the ConfigMap injected by the EvalHub operator
	// into each tenant namespace. It contains the EvalHub service URL, allowing the BFF to
	// resolve the service without needing access to the EvalHub CR in the operator namespace.
	// See: RHOAIENG-68253
	EvalHubDiscoveryConfigMap = "evalhub-discovery"

	// EvalHubDiscoveryURLKey is the legacy data key within the discovery ConfigMap.
	// Kept for backward compatibility with manually-created ConfigMaps.
	EvalHubDiscoveryURLKey = "service-url"

	// EvalHubDiscoveryURLSuffix is the key suffix used by the operator (PR trustyai-service-operator#760).
	// The operator writes keys as "{instanceName}.url" (e.g. "evalhub.url").
	EvalHubDiscoveryURLSuffix = ".url"
)

// EvalHubGVR is the preferred GroupVersionResource for EvalHub custom resources,
// used with the dynamic client.
var EvalHubGVR = schema.GroupVersionResource{
	Group:    EvalHubCRDGroup,
	Version:  EvalHubCRDVersion,
	Resource: EvalHubCRDResource,
}

// EvalHubLegacyGVR is the fallback GroupVersionResource for older operators that
// only serve v1alpha1.
var EvalHubLegacyGVR = schema.GroupVersionResource{
	Group:    EvalHubCRDGroup,
	Version:  EvalHubCRDLegacyVersion,
	Resource: EvalHubCRDResource,
}

// EvalHubGVRs lists the EvalHub CRD versions in preference order for CR discovery.
var EvalHubGVRs = []schema.GroupVersionResource{EvalHubGVR, EvalHubLegacyGVR}
