package helper

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/llamastack"
)

// GetContextLlamaStackClient safely retrieves the LlamaStack client from the given context.
// Returns an error if the client is not found or is nil.
func GetContextLlamaStackClient(ctx context.Context) (llamastack.LlamaStackClientInterface, error) {
	client, ok := ctx.Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)

	if !ok || client == nil {
		return nil, fmt.Errorf("missing LlamaStack client in context - ensure AttachLlamaStackClient middleware is used")
	}

	return client, nil
}
