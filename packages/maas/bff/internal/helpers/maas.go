package helper

import (
	"context"
	"fmt"
	"net/http"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
)

// GetContextMaaSClientFromReq retrieves the MaaS client from the request context
func GetContextMaaSClientFromReq(r *http.Request) (maas.MaaSClient, error) {
	return GetContextMaaSClient(r.Context())
}

// GetContextMaaSClient retrieves the MaaS client from the context
func GetContextMaaSClient(ctx context.Context) (maas.MaaSClient, error) {
	client, ok := ctx.Value(constants.MaaSClientKey).(maas.MaaSClient)
	if !ok {
		return nil, fmt.Errorf("maas client not found in context")
	}
	return client, nil
}
