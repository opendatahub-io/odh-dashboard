package helper

import (
	"context"
	"fmt"

	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/ogx"
)

// GetContextOGXClient safely retrieves the Open GenAI Stack client from the given context.
// Returns an error if the client is not found or is nil.
func GetContextOGXClient(ctx context.Context) (ogx.OGXClientInterface, error) {
	client, ok := ctx.Value(constants.OGXClientKey).(ogx.OGXClientInterface)

	if !ok || client == nil {
		return nil, fmt.Errorf("missing Open GenAI Stack client in context - ensure AttachOGXClientFromSecret middleware is used")
	}

	return client, nil
}
