package kubernetes

import "k8s.io/apimachinery/pkg/runtime/schema"

// EvalHub CRD constants for Kubernetes CR auto-discovery.
// When EVAL_HUB_URL is not provided, the BFF discovers the EvalHub service URL
// by listing EvalHub CRs in the user-provided namespace and reading status.url.
const (
	// EvalHubCRDGroup is the API group for EvalHub custom resources.
	EvalHubCRDGroup = "trustyai.opendatahub.io"

	// EvalHubCRDVersion is the API version for EvalHub custom resources.
	EvalHubCRDVersion = "v1alpha1"

	// EvalHubCRDResource is the plural resource name for the EvalHub operator CRD. Used for CR
	// discovery, and as one half of the OR check in CanListEvalHubInstances: evalhub-user grants
	// get/list on this resource, though that grant isn't in the documented RBAC reference.
	EvalHubCRDResource = "evalhubs"

	// EvalHubVirtualResource, together with EvalHubCRDResource, is used by the BFF's blanket
	// EvalHub access gate (see CanListEvalHubInstances): allowed if `get` passes on EITHER
	// resource. Neither alone covers every tenant Role pattern the operator provisions —
	// evalhub-user lacks "evaluations", and hand-authored multi-tenancy Roles lack "evalhubs" —
	// so both are checked.
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

// EvalHubGVR is the GroupVersionResource for EvalHub custom resources, used with the dynamic client.
var EvalHubGVR = schema.GroupVersionResource{
	Group:    EvalHubCRDGroup,
	Version:  EvalHubCRDVersion,
	Resource: EvalHubCRDResource,
}
