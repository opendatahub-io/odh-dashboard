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

	// EvalHubCRDResource is the plural resource name for EvalHub custom resources.
	EvalHubCRDResource = "evalhubs"
)

// EvalHubGVR is the GroupVersionResource for EvalHub custom resources, used with the dynamic client.
var EvalHubGVR = schema.GroupVersionResource{
	Group:    EvalHubCRDGroup,
	Version:  EvalHubCRDVersion,
	Resource: EvalHubCRDResource,
}
