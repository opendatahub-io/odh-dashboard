package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mlflow/bff/internal/config"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

type UserEnvelope Envelope[*models.User, None]

func (app *App) UserHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	if app.config.AuthMethod == config.AuthMethodDisabled {
		userRes := UserEnvelope{Data: &models.User{UserID: "anonymous"}}
		if err := app.WriteJSON(w, http.StatusOK, userRes, nil); err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	client, err := app.kubernetesClientFactory.GetClient(r.Context())
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	user, err := app.repositories.User.GetUser(client, identity)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	userRes := UserEnvelope{Data: user}
	if err := app.WriteJSON(w, http.StatusOK, userRes, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
