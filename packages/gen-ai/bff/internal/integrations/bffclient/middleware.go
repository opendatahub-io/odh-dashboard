package bffclient

import (
	"context"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	helper "github.com/opendatahub-io/gen-ai/internal/helpers"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// GetClient retrieves a BFF client from the context for the specified target
func GetClient(ctx context.Context, target BFFTarget) BFFClientInterface {
	key := constants.BFFClientKey(constants.BFFTarget(target))
	if client, ok := ctx.Value(key).(BFFClientInterface); ok {
		return client
	}
	return nil
}

// AttachBFFClient creates middleware that attaches a BFF client to the request context.
// This middleware extracts the user's auth token from RequestIdentity and creates a
// BFF client configured to forward that token to the target BFF.
//
// Usage:
//
//	router.GET("/api/v1/playground/token",
//	    app.InjectRequestIdentity(
//	        bffclient.AttachBFFClient(app.bffFactory, bffclient.BFFTargetMaaS)(
//	            app.handleGetPlaygroundToken,
//	        ),
//	    ),
//	)
func AttachBFFClient(factory BFFClientFactory, target BFFTarget) func(next httprouter.Handle) httprouter.Handle {
	return func(next httprouter.Handle) httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			ctx := r.Context()
			logger := helper.GetContextLoggerFromReq(r)

			// Check if target is configured
			if !factory.IsTargetConfigured(target) {
				logger.Debug("Target BFF not configured, attaching nil client", "target", target)
				ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), nil)
				next(w, r.WithContext(ctx), ps)
				return
			}

			// Get auth token from RequestIdentity
			var authToken string
			if identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity); ok && identity != nil {
				authToken = identity.Token
			}

			// Create BFF client for target
			client := factory.CreateClient(target, authToken)
			if client == nil {
				logger.Warn("Failed to create BFF client", "target", target)
				ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), nil)
				next(w, r.WithContext(ctx), ps)
				return
			}

			// Check availability (best effort - log but continue)
			if !client.IsAvailable(ctx) {
				logger.Warn("Target BFF unavailable (will continue anyway)", "target", target)
			} else {
				logger.Debug("Target BFF available", "target", target, "baseURL", client.GetBaseURL())
			}

			// Attach to context
			ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), client)
			next(w, r.WithContext(ctx), ps)
		}
	}
}

// AttachBFFClientFunc is a convenience wrapper that can be used with standard http.HandlerFunc
// instead of httprouter.Handle
func AttachBFFClientFunc(factory BFFClientFactory, target BFFTarget) func(next http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			logger := helper.GetContextLoggerFromReq(r)

			// Check if target is configured
			if !factory.IsTargetConfigured(target) {
				logger.Debug("Target BFF not configured, attaching nil client", "target", target)
				ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), nil)
				next(w, r.WithContext(ctx))
				return
			}

			// Get auth token from RequestIdentity
			var authToken string
			if identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity); ok && identity != nil {
				authToken = identity.Token
			}

			// Create BFF client for target
			client := factory.CreateClient(target, authToken)
			if client == nil {
				logger.Warn("Failed to create BFF client", "target", target)
				ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), nil)
				next(w, r.WithContext(ctx))
				return
			}

			// Check availability (best effort - log but continue)
			if !client.IsAvailable(ctx) {
				logger.Warn("Target BFF unavailable (will continue anyway)", "target", target)
			} else {
				logger.Debug("Target BFF available", "target", target, "baseURL", client.GetBaseURL())
			}

			// Attach to context
			ctx = context.WithValue(ctx, constants.BFFClientKey(constants.BFFTarget(target)), client)
			next(w, r.WithContext(ctx))
		}
	}
}
