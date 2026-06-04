package bffclient

import (
	"context"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/helpers"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
)

// GetClient retrieves a BFF client from the context for the specified target.
func GetClient(ctx context.Context, target BFFTarget) BFFClientInterface {
	key := constants.BFFClientKey(constants.BFFTarget(target))
	if client, ok := ctx.Value(key).(BFFClientInterface); ok {
		return client
	}
	return nil
}

// attachBFFClientToContext creates a BFF client for the target and attaches it to the context.
func attachBFFClientToContext(ctx context.Context, factory BFFClientFactory, target BFFTarget) context.Context {
	logger := helpers.GetContextLogger(ctx)

	if !factory.IsTargetConfigured(target) {
		logger.Debug("Target BFF not configured, attaching nil client", "target", target)
		return context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), nil)
	}

	var authToken string
	if identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity); ok && identity != nil {
		authToken = identity.Token.Raw()
	}

	client := factory.CreateClient(target, authToken)
	if client == nil {
		logger.Warn("Failed to create BFF client", "target", target)
		return context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), nil)
	}

	logger.Debug("BFF client created", "target", target, "baseURL", client.GetBaseURL())
	return context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), client)
}

// AttachBFFClient creates middleware that attaches a BFF client to the request context.
// This middleware extracts the user's auth token from RequestIdentity and creates a
// BFF client configured to forward that token to the target BFF.
//
// Usage:
//
//	router.GET("/api/v1/some-endpoint",
//	    app.InjectRequestIdentity(
//	        bffclient.AttachBFFClient(app.bffFactory, bffclient.BFFTargetMaaS)(
//	            app.handleSomeEndpoint,
//	        ),
//	    ),
//	)
func AttachBFFClient(factory BFFClientFactory, target BFFTarget) func(next httprouter.Handle) httprouter.Handle {
	return func(next httprouter.Handle) httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			ctx := attachBFFClientToContext(r.Context(), factory, target)
			next(w, r.WithContext(ctx), ps)
		}
	}
}

// AttachBFFClientFunc is a convenience wrapper that can be used with standard http.HandlerFunc instead of httprouter.Handle.
func AttachBFFClientFunc(factory BFFClientFactory, target BFFTarget) func(next http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			ctx := attachBFFClientToContext(r.Context(), factory, target)
			next(w, r.WithContext(ctx))
		}
	}
}
