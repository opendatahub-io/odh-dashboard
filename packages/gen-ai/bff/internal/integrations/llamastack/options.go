package llamastack

// ClientOption represents a function that modifies client configuration
type ClientOption func(*LlamaStackClient)

// WithNoRetries returns a ClientOption that disables retries for streaming requests
func WithNoRetries() ClientOption {
	return func(client *LlamaStackClient) {
		// No need to recreate the client since we already disable retries by default
		// in NewLlamaStackClient. This is kept for API compatibility.
	}
}
