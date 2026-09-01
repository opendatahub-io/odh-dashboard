package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

func attachExternalProviderHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.ExternalProviderListPath, handlerWithApp(app, ListExternalProvidersHandler))
	apiRouter.POST(constants.ExternalProviderCreatePath, handlerWithApp(app, CreateExternalProviderHandler))
	apiRouter.PUT(constants.ExternalProviderUpdatePath, handlerWithApp(app, UpdateExternalProviderHandler))
	apiRouter.DELETE(constants.ExternalProviderDeletePath, handlerWithApp(app, DeleteExternalProviderHandler))
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
	if err := app.ReadJSON(w, r, &request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := validateCreateExternalProviderRequest(request.Data); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.ExternalProviders.CreateExternalProvider(ctx, request.Data)
	if err != nil {
		if errors.Is(err, repositories.ErrAlreadyExists) {
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
	if err := app.ReadJSON(w, r, &request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if request.Data.AuthMechanism != nil && !request.Data.AuthMechanism.IsValid() {
		app.badRequestResponse(w, r, errors.New("authMechanism must be 'apikey', 'sigv4', or 'oauth2'"))
		return
	}
	if strings.TrimSpace(request.Data.EndpointUrl) != "" {
		if err := validateEndpointURL(request.Data.EndpointUrl); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}

	result, err := app.repositories.ExternalProviders.UpdateExternalProvider(ctx, namespace, name, request.Data)
	if err != nil {
		if errors.Is(err, repositories.ErrNotFound) {
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
		if errors.Is(err, repositories.ErrNotFound) {
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
	if err := validateEndpointURL(request.EndpointUrl); err != nil {
		return err
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

func validateEndpointURL(raw string) error {
	return repositories.ValidateEndpointURL(raw)
}
