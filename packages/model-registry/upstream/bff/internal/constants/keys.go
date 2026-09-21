package constants

type contextKey string

// NOTE: If you are adding any HTTP headers, they need to also be added to the EnableCORS middleware
// to ensure requests are not blocked when using CORS.
const (
	ModelRegistryHttpClientKey  contextKey = "ModelRegistryHttpClientKey"
	ModelCatalogHttpClientKey   contextKey = "ModelCatalogHttpClientKey"
	NamespaceHeaderParameterKey contextKey = "namespace"

	// The following keys are used to store the user access token in the context
	RequestIdentityKey contextKey = "requestIdentityKey"

	// For config.AuthMethodInternal
	// Kubeflow authorization operates using custom authentication headers:
	// Note: The functionality for `kubeflow-groups` is not fully operational at Kubeflow platform at this time
	// but it's supported on Model Registry BFF
	KubeflowUserIDHeader       = "kubeflow-userid" // kubeflow-userid :contains the user's email address
	KubeflowUserGroupsIdHeader = "kubeflow-groups" // kubeflow-groups : Holds a comma-separated list of user groups

	TraceIdKey                     contextKey = "TraceIdKey"
	TraceLoggerKey                 contextKey = "TraceLoggerKey"
	ServiceAuthorizationContextKey contextKey = "ServiceAuthorizationContextKey"
)

// BFFTarget represents a target BFF service (re-exported from the bffclient package
// so context keys can be built without an import cycle).
type BFFTarget string

// BFFClientKey returns a context key for storing an inter-BFF client by target.
// Usage: ctx.Value(constants.BFFClientKey(bffclient.BFFTargetMLflow))
func BFFClientKey(target BFFTarget) contextKey {
	return contextKey("BFFClientKey_" + string(target))
}
