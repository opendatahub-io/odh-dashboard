package constants

type contextKey string

// NOTE: If you are adding any HTTP headers, they need to also be added to the EnableCORS middleware
// to ensure requests are not blocked when using CORS.
const (
	LlamaStackHttpClientKey contextKey = "LlamaStackHttpClientKey"

	TraceIdKey     contextKey = "TraceIdKey"
	TraceLoggerKey contextKey = "TraceLoggerKey"

	// The following keys are used to store the user access token in the context
	RequestIdentityKey contextKey = "requestIdentityKey"
)
