package api

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

// attachPolicyHandlers registers the policy routes.
func attachPolicyHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.PolicyListPath, handlerWithApp(app, ListPoliciesHandler))
	apiRouter.GET(constants.PolicyViewPath, handlerWithApp(app, GetPolicyInfoHandler))
	apiRouter.GET(constants.SubscriptionPolicyFormDataPath, handlerWithApp(app, GetSubscriptionPolicyFormDataHandler))
	apiRouter.POST(constants.PolicyCreatePath, handlerWithApp(app, CreatePolicyHandler))
	apiRouter.PUT(constants.PolicyUpdatePath, handlerWithApp(app, UpdatePolicyHandler))
	apiRouter.DELETE(constants.PolicyDeletePath, handlerWithApp(app, DeletePolicyHandler))
}

// ListPoliciesHandler handles GET /api/v1/all-policies
// K8s calls: GET /k8s/v1/maasauthpolicy
func ListPoliciesHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	policies, err := app.repositories.Policies.ListPolicies(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[[]models.MaaSAuthPolicy, None]{
		Data: policies,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetPolicyInfoHandler handles GET /api/v1/view-policy/:name
// K8s calls: GET /k8s/v1/maasauthpolicy/:name, GET /k8s/v1/maasmodelref
func GetPolicyInfoHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	name := params.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, errors.New("policy name is required"))
		return
	}

	policy, err := app.repositories.Policies.GetPolicy(ctx, name)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if policy == nil {
		app.notFoundResponse(w, r)
		return
	}

	// Convert policy ModelRefs to ModelSubscriptionRefs for the summary lookup
	subRefs := make([]models.ModelSubscriptionRef, len(policy.ModelRefs))
	for i, mr := range policy.ModelRefs {
		subRefs[i] = models.ModelSubscriptionRef{Name: mr.Name, Namespace: mr.Namespace}
	}

	modelRefSummaries, err := app.repositories.Subscriptions.GetModelRefSummaries(ctx, subRefs)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[models.PolicyInfoResponse, None]{
		Data: models.PolicyInfoResponse{
			Policy:    *policy,
			ModelRefs: modelRefSummaries,
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreatePolicyHandler handles POST /api/v1/new-policy
// K8s calls: CREATE /k8s/v1/maasauthpolicy
func CreatePolicyHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var envelope Envelope[models.CreatePolicyRequest, None]
	if err := app.ReadJSON(w, r, &envelope); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	request := envelope.Data

	if strings.TrimSpace(request.Name) == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if len(request.ModelRefs) == 0 {
		app.badRequestResponse(w, r, errors.New("at least one modelRef is required"))
		return
	}

	policy, err := app.repositories.Policies.CreatePolicy(ctx, request)
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

	response := Envelope[*models.MaaSAuthPolicy, None]{
		Data: policy,
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdatePolicyHandler handles PUT /api/v1/update-policy/:name
// K8s calls: PUT /k8s/v1/maasauthpolicy/:name
func UpdatePolicyHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	name := params.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, errors.New("policy name is required"))
		return
	}

	var envelope Envelope[models.UpdatePolicyRequest, None]
	if err := app.ReadJSON(w, r, &envelope); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	request := envelope.Data

	if len(request.ModelRefs) == 0 {
		app.badRequestResponse(w, r, errors.New("at least one modelRef is required"))
		return
	}

	policy, err := app.repositories.Policies.UpdatePolicy(ctx, name, request)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	if policy == nil {
		app.errorResponse(w, r, &HTTPError{
			StatusCode: http.StatusNotFound,
			Error:      ErrorPayload{Code: "404", Message: fmt.Sprintf("MaaSAuthPolicy '%s' not found", name)},
		})
		return
	}

	response := Envelope[*models.MaaSAuthPolicy, None]{
		Data: policy,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeletePolicyHandler handles DELETE /api/v1/delete-policy/:name
// K8s calls: DELETE /k8s/v1/maasauthpolicy/:name
func DeletePolicyHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	name := params.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, errors.New("policy name is required"))
		return
	}

	if err := app.repositories.Policies.DeletePolicy(ctx, name); err != nil {
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

	response := Envelope[map[string]string, None]{
		Data: map[string]string{
			"message": fmt.Sprintf("MaaSAuthPolicy '%s' deleted successfully", name),
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
