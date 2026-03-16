// Package constants defines context keys shared across the BFF.
package constants

type contextKey string

// NOTE: If you are adding any HTTP headers, they need to also be added to the EnableCORS middleware
// to ensure requests are not blocked when using CORS.
const (
	// The following keys are used to store the user access token in the context
	RequestIdentityKey contextKey = "requestIdentityKey"

	// MLflow-specific context keys
	MLflowClientKey            contextKey = "MLflowClientKey"
	WorkspaceQueryParameterKey contextKey = "workspace"

	// For config.AuthMethodInternal
	// Kubeflow authorization operates using custom authentication headers:
	// Note: The functionality for `kubeflow-groups` is not fully operational at Kubeflow platform at this time
	// but it's supported on MLflow BFF
	KubeflowUserIDHeader       = "kubeflow-userid" // kubeflow-userid :contains the user's email address
	KubeflowUserGroupsIDHeader = "kubeflow-groups" // kubeflow-groups : Holds a comma-separated list of user groups

	TraceIDKey     contextKey = "TraceIDKey"
	TraceLoggerKey contextKey = "TraceLoggerKey"
)
