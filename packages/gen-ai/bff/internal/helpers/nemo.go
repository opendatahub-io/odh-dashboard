package helper

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/nemo"
)

// GetContextNemoClient safely retrieves the NeMo Guardrails client from the given context.
// Returns an error if the client is not found or is nil.
func GetContextNemoClient(ctx context.Context) (nemo.NemoClientInterface, error) {
	client, ok := ctx.Value(constants.NemoClientKey).(nemo.NemoClientInterface)

	if !ok || client == nil {
		return nil, fmt.Errorf("missing NeMo Guardrails client in context - ensure AttachNemoClient middleware is used")
	}

	return client, nil
}
