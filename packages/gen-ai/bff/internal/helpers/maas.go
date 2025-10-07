package helper

import (
	"context"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
)

// GetContextMaaSClientFromReq safely retrieves the MaaS client from the HTTP request context.
// Returns an error if the client is not found or is nil.
func GetContextMaaSClientFromReq(r *http.Request) (maas.MaaSClient, error) {
	return GetContextMaaSClient(r.Context())
}

// GetContextMaaSClient safely retrieves the MaaS client from the given context.
// Returns an error if the client is not found or is nil.
func GetContextMaaSClient(ctx context.Context) (maas.MaaSClient, error) {
	client, ok := ctx.Value(constants.MaaSClientKey).(maas.MaaSClient)

	if !ok || client == nil {
		return nil, fmt.Errorf("missing MaaS client in context - ensure AttachMaaSClient middleware is used")
	}

	return client, nil
}
