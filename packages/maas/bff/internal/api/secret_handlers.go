package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func attachSecretHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.SecretListPath, handlerWithApp(app, ListSecretsHandler))
	apiRouter.POST(constants.SecretCreatePath, handlerWithApp(app, CreateSecretHandler))
}

// ListSecretsHandler handles GET /api/v1/secrets?namespace=X
func ListSecretsHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, err := namespaceFromContext(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	secrets, err := app.repositories.Secrets.ListSecrets(ctx, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[[]models.SecretSummary, None]{Data: secrets}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreateSecretHandler handles POST /api/v1/secrets
func CreateSecretHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var request Envelope[models.CreateSecretRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(request.Data.Namespace) == "" {
		app.badRequestResponse(w, r, errors.New("namespace is required"))
		return
	}
	if strings.TrimSpace(request.Data.Name) == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if strings.TrimSpace(request.Data.Value) == "" {
		app.badRequestResponse(w, r, errors.New("value is required"))
		return
	}

	result, err := app.repositories.Secrets.CreateSecret(ctx, request.Data)
	if err != nil {
		if strings.Contains(err.Error(), "already exists") {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusConflict,
				Error:      ErrorPayload{Code: "409", Message: err.Error()},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	response := Envelope[*models.CreateSecretResponse, None]{Data: result}
	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
