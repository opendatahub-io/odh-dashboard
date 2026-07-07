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

func attachExternalModelHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.ExternalModelListPath, handlerWithApp(app, ListExternalModelsHandler))
	apiRouter.POST(constants.ExternalModelCreatePath, handlerWithApp(app, CreateExternalModelHandler))
	apiRouter.PUT(constants.ExternalModelUpdatePath, handlerWithApp(app, UpdateExternalModelHandler))
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

// CreateExternalModelHandler handles POST /api/v1/externalmodel
func CreateExternalModelHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var request Envelope[models.CreateExternalModelRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := validateCreateExternalModelRequest(request.Data); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.ExternalModels.CreateExternalModel(ctx, request.Data)
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

	response := Envelope[*models.ExternalModelSummary, None]{Data: result}
	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateExternalModelHandler handles PUT /api/v1/externalmodel/:namespace/:name
func UpdateExternalModelHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	namespace := params.ByName("namespace")
	name := params.ByName("name")
	if namespace == "" || name == "" {
		app.badRequestResponse(w, r, errors.New("ExternalModel namespace and name are required"))
		return
	}

	var request Envelope[models.UpdateExternalModelRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if len(request.Data.ProviderRefs) > 0 {
		if err := validateProviderRefs(request.Data.ProviderRefs); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}

	result, err := app.repositories.ExternalModels.UpdateExternalModel(ctx, namespace, name, request.Data)
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

	response := Envelope[*models.ExternalModelSummary, None]{Data: result}
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

func validateCreateExternalModelRequest(request models.CreateExternalModelRequest) error {
	if strings.TrimSpace(request.Name) == "" {
		return errors.New("name is required")
	}
	if strings.TrimSpace(request.Namespace) == "" {
		return errors.New("namespace is required")
	}
	return validateProviderRefs(request.ProviderRefs)
}

func validateProviderRefs(refs []models.ProviderRef) error {
	if len(refs) == 0 {
		return errors.New("at least one providerRef is required")
	}
	for _, ref := range refs {
		if strings.TrimSpace(ref.ProviderName) == "" {
			return errors.New("providerRef.providerName is required")
		}
		if ref.Weight < 1 || ref.Weight > 100 {
			return errors.New("providerRef.weight must be between 1 and 100")
		}
		if strings.TrimSpace(ref.APIFormat) == "" {
			return errors.New("providerRef.apiFormat is required")
		}
		if strings.TrimSpace(ref.Path) == "" {
			return errors.New("providerRef.path is required")
		}
		if strings.TrimSpace(ref.TargetModel) == "" {
			return errors.New("providerRef.targetModel is required")
		}
	}
	return nil
}
