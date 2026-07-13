package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

func attachExternalModelHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.ExternalModelListPath, handlerWithApp(app, ListExternalModelsHandler))
	apiRouter.DELETE(constants.ExternalModelDeletePath, handlerWithApp(app, DeleteExternalModelHandler))
}

// ListExternalModelsHandler handles GET /api/v1/externalmodel?namespace=X
func ListExternalModelsHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, err := namespaceFromContext(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	modelsList, err := app.repositories.ExternalModels.ListExternalModels(ctx, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[[]models.ExternalModelSummary, None]{Data: modelsList}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteExternalModelHandler handles DELETE /api/v1/externalmodel/:namespace/:name
func DeleteExternalModelHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	namespace := params.ByName("namespace")
	name := params.ByName("name")
	if namespace == "" || name == "" {
		app.badRequestResponse(w, r, errors.New("ExternalModel namespace and name are required"))
		return
	}

	if err := app.repositories.ExternalModels.DeleteExternalModel(ctx, namespace, name); err != nil {
		if k8sErrors.IsNotFound(err) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusNotFound,
				Error:      ErrorPayload{Code: "404", Message: err.Error()},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	response := Envelope[None, None]{Data: nil}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func namespaceFromContext(r *http.Request) (string, error) {
	if namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string); ok && strings.TrimSpace(namespace) != "" {
		return namespace, nil
	}
	namespace := r.URL.Query().Get("namespace")
	if strings.TrimSpace(namespace) == "" {
		return "", errors.New("namespace is required")
	}
	return namespace, nil
}
