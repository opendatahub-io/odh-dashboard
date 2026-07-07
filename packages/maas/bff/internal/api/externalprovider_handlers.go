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

func attachExternalProviderHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.ExternalProviderListPath, handlerWithApp(app, ListExternalProvidersHandler))
	apiRouter.POST(constants.ExternalProviderCreatePath, handlerWithApp(app, CreateExternalProviderHandler))
	apiRouter.PUT(constants.ExternalProviderUpdatePath, handlerWithApp(app, UpdateExternalProviderHandler))
	apiRouter.DELETE(constants.ExternalProviderDeletePath, handlerWithApp(app, DeleteExternalProviderHandler))
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

// ListExternalProvidersHandler handles GET /api/v1/externalprovider?namespace=X
func ListExternalProvidersHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	namespace, err := namespaceFromContext(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	providers, err := app.repositories.ExternalProviders.ListExternalProviders(ctx, namespace)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[[]models.ExternalProviderSummary, None]{Data: providers}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreateExternalProviderHandler handles POST /api/v1/externalprovider
func CreateExternalProviderHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var request Envelope[models.CreateExternalProviderRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := validateCreateExternalProviderRequest(request.Data); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.ExternalProviders.CreateExternalProvider(ctx, request.Data)
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

	response := Envelope[*models.ExternalProviderSummary, None]{Data: result}
	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateExternalProviderHandler handles PUT /api/v1/externalprovider/:namespace/:name
func UpdateExternalProviderHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	namespace := params.ByName("namespace")
	name := params.ByName("name")
	if namespace == "" || name == "" {
		app.badRequestResponse(w, r, errors.New("ExternalProvider namespace and name are required"))
		return
	}

	var request Envelope[models.UpdateExternalProviderRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.ExternalProviders.UpdateExternalProvider(ctx, namespace, name, request.Data)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusNotFound,
				Error:      ErrorPayload{Code: "404", Message: err.Error()},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	response := Envelope[*models.ExternalProviderSummary, None]{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteExternalProviderHandler handles DELETE /api/v1/externalprovider/:namespace/:name
func DeleteExternalProviderHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	namespace := params.ByName("namespace")
	name := params.ByName("name")
	if namespace == "" || name == "" {
		app.badRequestResponse(w, r, errors.New("ExternalProvider namespace and name are required"))
		return
	}

	if err := app.repositories.ExternalProviders.DeleteExternalProvider(ctx, namespace, name); err != nil {
		if strings.Contains(err.Error(), "not found") {
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

func validateCreateExternalProviderRequest(request models.CreateExternalProviderRequest) error {
	if strings.TrimSpace(request.Name) == "" {
		return errors.New("name is required")
	}
	if strings.TrimSpace(request.Namespace) == "" {
		return errors.New("namespace is required")
	}
	if strings.TrimSpace(request.EndpointUrl) == "" {
		return errors.New("endpointUrl is required")
	}
	if !request.AuthMechanism.IsValid() {
		return errors.New("authMechanism must be 'apikey', 'sigv4', or 'oauth2'")
	}
	if strings.TrimSpace(request.CredentialSecretRef) == "" {
		return errors.New("credentialSecretRef is required")
	}
	if strings.TrimSpace(request.Provider) == "" {
		return errors.New("provider is required")
	}
	return nil
}
