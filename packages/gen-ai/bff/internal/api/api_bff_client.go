package api

import (
	"context"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
)

// bffCallTimeout is the shared timeout for all inter-BFF HTTP calls.
const bffCallTimeout = 5 * time.Second

// mlflowBFFClient returns the MLflow BFF client from request context, or creates one from the factory.
func (app *App) mlflowBFFClient(ctx context.Context) bffclient.BFFClientInterface {
	if client := bffclient.GetClient(ctx, bffclient.BFFTargetMLflow); client != nil {
		return client
	}
	if app.bffClientFactory == nil || !app.bffClientFactory.IsTargetConfigured(bffclient.BFFTargetMLflow) {
		return nil
	}

	var authToken string
	if identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity); ok && identity != nil {
		authToken = identity.Token
	}

	return app.bffClientFactory.CreateClient(bffclient.BFFTargetMLflow, authToken)
}
