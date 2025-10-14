package llamastack

import (
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
)

// This file contains implementations of ClientOption functions

// WithNoRetries returns a ClientOption that disables retries for streaming requests.
// This is required for streaming to prevent VLLM shared memory exhaustion.
// When a streaming request fails and is retried, VLLM may not properly clean up
// the shared memory from the failed request, leading to memory leaks.
func WithNoRetries() ClientOption {
	return func(c *LlamaStackClient) {
		// Create new client with existing base URL and API key, plus max retries setting
		*c.client = openai.NewClient(
			option.WithBaseURL(c.baseURL),
			option.WithAPIKey("none"),
			option.WithMaxRetries(0),
		)
	}
}
