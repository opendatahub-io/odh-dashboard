package api

import (
	"context"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	k8s "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// GetCurrentUserHandler returns the current user information
func (app *App) GetCurrentUserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Default empty response; we always return 200
	resp := models.UserModel{UserID: ""}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		_ = app.WriteJSON(w, http.StatusOK, resp, nil)
		return
	}

	// Always use real Kubernetes client for user info, even in mock mode
	// This ensures we get the actual cluster user from the token
	realK8sFactory, err := k8s.NewKubernetesClientFactory(app.config, app.logger)
	if err != nil {
		app.logger.Error("Failed to create real k8s factory", "error", err)
		_ = app.WriteJSON(w, http.StatusOK, resp, nil)
		return
	}

	client, err := realK8sFactory.GetClient(ctx)
	if err != nil {
		app.logger.Error("Failed to get k8s client", "error", err)
		_ = app.WriteJSON(w, http.StatusOK, resp, nil)
		return
	}

	tCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	username, err := client.GetUser(tCtx, identity)
	if err != nil {
		app.logger.Error("Failed to get user", "error", err)
		_ = app.WriteJSON(w, http.StatusOK, resp, nil)
		return
	}

	resp.UserID = username
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		// Best effort: still fall back to 200 with empty user if serialization fails
		_ = app.WriteJSON(w, http.StatusOK, models.UserModel{UserID: ""}, nil)
		return
	}
}
