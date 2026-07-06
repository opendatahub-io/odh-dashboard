package bffclient

import (
	"context"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
)

// GetClient retrieves a BFF client from the request context.
func GetClient(ctx context.Context, target BFFTarget) BFFClientInterface {
	key := constants.BFFClientKey(constants.BFFTarget(target))
	if client, ok := ctx.Value(key).(BFFClientInterface); ok {
		return client
	}
	return nil
}

// AttachBFFClient creates middleware that extracts the user's auth token from
// RequestIdentity and attaches a BFF client for the given target to the context.
func AttachBFFClient(factory BFFClientFactory, target BFFTarget) func(next httprouter.Handle) httprouter.Handle {
	return func(next httprouter.Handle) httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			ctx := r.Context()
			logger := helper.GetContextLoggerFromReq(r)

			if !factory.IsTargetConfigured(target) {
				logger.Debug("Target BFF not configured, attaching nil client", "target", target)
				next(w, r, ps)
				return
			}

			var authToken string
			if identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity); ok && identity != nil {
				authToken = identity.Token
			}

			client := factory.CreateClient(target, authToken)
			if client == nil {
				logger.Warn("Failed to create BFF client", "target", target)
				next(w, r, ps)
				return
			}

			logger.Debug("BFF client attached", "target", target, "baseURL", client.GetBaseURL())

			ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), client)
			next(w, r.WithContext(ctx), ps)
		}
	}
}
