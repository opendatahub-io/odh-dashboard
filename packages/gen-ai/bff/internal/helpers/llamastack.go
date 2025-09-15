package helper

import (
	"context"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

// GetContextLlamaStackClientFromReq safely retrieves the LlamaStack client from the HTTP request context.
// Returns an error if the client is not found or is nil.
func GetContextLlamaStackClientFromReq(r *http.Request) (llamastack.LlamaStackClientInterface, error) {
	return GetContextLlamaStackClient(r.Context())
}

// GetContextLlamaStackClient safely retrieves the LlamaStack client from the given context.
// Returns an error if the client is not found or is nil.
func GetContextLlamaStackClient(ctx context.Context) (llamastack.LlamaStackClientInterface, error) {
	client, ok := ctx.Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)

	if !ok || client == nil {
		return nil, fmt.Errorf("missing LlamaStack client in context - ensure AttachLlamaStackClient middleware is used")
	}

	return client, nil
}
