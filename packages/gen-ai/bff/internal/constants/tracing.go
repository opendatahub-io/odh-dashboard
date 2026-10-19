package constants

const (
	// TraceParentHeader is the W3C trace context header required to keep
	// BFF → OGX → proxy/model spans attached to one Playground MLflow trace.
	TraceParentHeader = "traceparent"

	// TraceStateHeader is the optional W3C trace state header propagated with
	// traceparent when present.
	TraceStateHeader = "tracestate"

	// BaggageHeader carries cross-cutting trace baggage such as the Playground
	// session ID.
	BaggageHeader = "baggage"
)
