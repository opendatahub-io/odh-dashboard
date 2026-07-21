// Package constants defines context keys and path constants used across the BFF.
package constants

type contextKey string

const (
	// NamespaceHeaderParameterKey is the context key for namespace header parameter.
	NamespaceHeaderParameterKey contextKey = "namespace"

	// The following keys are used to store the user access token in the context
	// RequestIdentityKey is the context key for storing request identity information.
	RequestIdentityKey contextKey = "requestIdentityKey"

	// TraceIDKey is the context key for storing trace IDs.
	TraceIDKey contextKey = "TraceIDKey"
	// TraceLoggerKey is the context key for storing trace loggers.
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
