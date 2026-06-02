package constants

type contextKey string

const (
	NamespaceHeaderParameterKey contextKey = "namespace"

	// The following keys are used to store the user access token in the context
	RequestIdentityKey contextKey = "requestIdentityKey"

	TraceIdKey     contextKey = "TraceIdKey"
	TraceLoggerKey contextKey = "TraceLoggerKey"
)

// BFFTarget represents a target BFF service (re-exported from bffclient package)
type BFFTarget string

// BFFClientKey returns a context key for storing BFF clients by target.
// This allows multiple BFF clients to be stored in the same context.
// Usage: ctx.Value(constants.BFFClientKey("maas"))
func BFFClientKey(target BFFTarget) contextKey {
	return contextKey("BFFClientKey_" + string(target))
}
