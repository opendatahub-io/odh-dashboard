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

	TraceIDKey     contextKey = "TraceIDKey"
	TraceLoggerKey contextKey = "TraceLoggerKey"
)
