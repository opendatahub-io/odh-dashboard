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

// attachMaaSModelRefHandlers registers the MaaSModelRef routes.
func attachMaaSModelRefHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.POST(constants.MaaSModelRefCreatePath, handlerWithApp(app, CreateMaaSModelRefHandler))
	apiRouter.PUT(constants.MaaSModelRefUpdatePath, handlerWithApp(app, UpdateMaaSModelRefHandler))
	apiRouter.DELETE(constants.MaaSModelRefDeletePath, handlerWithApp(app, DeleteMaaSModelRefHandler))
}

// CreateMaaSModelRefHandler handles POST /api/v1/maasmodel
// K8s calls: POST /k8s/v1/maasmodelref
func CreateMaaSModelRefHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var request Envelope[models.CreateMaaSModelRefRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(request.Data.Name) == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if strings.TrimSpace(request.Data.Namespace) == "" {
		app.badRequestResponse(w, r, errors.New("namespace is required"))
		return
	}
	if strings.TrimSpace(request.Data.ModelRef.Kind) == "" || strings.TrimSpace(request.Data.ModelRef.Name) == "" {
		app.badRequestResponse(w, r, errors.New("modelRef with kind and name is required"))
		return
	}

	dryRun := r.URL.Query().Get("dryRun") == "true"
	result, err := app.repositories.MaaSModelRefs.CreateMaaSModelRef(ctx, request.Data, dryRun)
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

	response := Envelope[*models.MaaSModelRefSummary, None]{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateMaaSModelRefHandler handles PUT /api/v1/maasmodel/:namespace/:name
// K8s calls: PUT /k8s/v1/maasmodelref/:namespace/:name
func UpdateMaaSModelRefHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	namespace := params.ByName("namespace")
	name := params.ByName("name")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("MaaSModelRef namespace is required"))
		return
	}
	if name == "" {
		app.badRequestResponse(w, r, errors.New("MaaSModelRef name is required"))
		return
	}

	var request Envelope[models.UpdateMaaSModelRefRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(request.Data.ModelRef.Kind) == "" || strings.TrimSpace(request.Data.ModelRef.Name) == "" {
		app.badRequestResponse(w, r, errors.New("modelRef with kind and name is required"))
		return
	}

	dryRun := r.URL.Query().Get("dryRun") == "true"
	result, err := app.repositories.MaaSModelRefs.UpdateMaaSModelRef(ctx, namespace, name, request.Data, dryRun)
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

	response := Envelope[*models.MaaSModelRefSummary, None]{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteMaaSModelRefHandler handles DELETE /api/v1/maasmodel/:namespace/:name
// K8s calls: DELETE /k8s/v1/maasmodelref/:namespace/:name
func DeleteMaaSModelRefHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	namespace := params.ByName("namespace")
	name := params.ByName("name")
	if namespace == "" {
		app.badRequestResponse(w, r, errors.New("MaaSModelRef namespace is required"))
		return
	}
	if name == "" {
		app.badRequestResponse(w, r, errors.New("MaaSModelRef name is required"))
		return
	}

	dryRun := r.URL.Query().Get("dryRun") == "true"
	if err := app.repositories.MaaSModelRefs.DeleteMaaSModelRef(ctx, namespace, name, dryRun); err != nil {
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

	response := Envelope[None, None]{
		Data: nil,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
