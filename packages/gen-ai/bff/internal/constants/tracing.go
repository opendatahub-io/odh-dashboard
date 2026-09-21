package constants

const (
	// TraceParentHeader is the W3C trace context header propagated through OGX
	// passthrough calls so proxy requests stay attached to the Playground trace.
	TraceParentHeader = "traceparent"

	// TraceStateHeader is the optional W3C trace state header propagated with
	// traceparent when present.
	TraceStateHeader = "tracestate"

	// BaggageHeader carries cross-cutting trace baggage such as the Playground
	// session ID.
	BaggageHeader = "baggage"
)
