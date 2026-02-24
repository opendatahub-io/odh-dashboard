package constants

type contextKey string

// NOTE: If you are adding any HTTP headers, they need to also be added to the EnableCORS middleware
// to ensure requests are not blocked when using CORS.
const (
	LlamaStackClientKey contextKey = "LlamaStackClientKey"
	MaaSClientKey       contextKey = "MaaSClientKey"
	MLflowClientKey     contextKey = "MLflowClientKey"

	TraceIdKey     contextKey = "TraceIdKey"
	TraceLoggerKey contextKey = "TraceLoggerKey"

	// The following keys are used to store the user access token in the context
	RequestIdentityKey         contextKey = "requestIdentityKey"
	NamespaceQueryParameterKey contextKey = "namespace"
)

// BFFTarget represents a target BFF service (re-exported from bffclient package)
type BFFTarget string

// BFFClientKey returns a context key for storing BFF clients by target.
// This allows multiple BFF clients to be stored in the same context.
// Usage: ctx.Value(constants.BFFClientKey(bffclient.BFFTargetMaaS))
func BFFClientKey(target BFFTarget) contextKey {
	return contextKey("BFFClientKey_" + string(target))
}
