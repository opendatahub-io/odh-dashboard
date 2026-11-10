package api

import (
	"context"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type UserEnvelope = Envelope[models.UserModel, None]

// GetCurrentUserHandler returns the current user information
func (app *App) GetCurrentUserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Default empty response; we always return 200
	resp := models.UserModel{UserID: ""}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		_ = app.WriteJSON(w, http.StatusOK, UserEnvelope{Data: resp}, nil)
		return
	}

	// Use the shared real (non-mock) factory created at startup; user lookup
	// needs the actual cluster user from the token even in mock mode.
	if app.realKubernetesClientFactory == nil {
		app.logger.Error("real k8s factory unavailable for user lookup")
		_ = app.WriteJSON(w, http.StatusOK, UserEnvelope{Data: resp}, nil)
		return
	}

	client, err := app.realKubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.logger.Error("Failed to get k8s client", "error", err)
		_ = app.WriteJSON(w, http.StatusOK, UserEnvelope{Data: resp}, nil)
		return
	}

	tCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	username, err := client.GetUser(tCtx, identity)
	if err != nil {
		app.logger.Error("Failed to get user", "error", err)
		_ = app.WriteJSON(w, http.StatusOK, UserEnvelope{Data: resp}, nil)
		return
	}

	resp.UserID = username
	if err := app.WriteJSON(w, http.StatusOK, UserEnvelope{Data: resp}, nil); err != nil {
		_ = app.WriteJSON(w, http.StatusOK, UserEnvelope{Data: models.UserModel{UserID: ""}}, nil)
		return
	}
}
