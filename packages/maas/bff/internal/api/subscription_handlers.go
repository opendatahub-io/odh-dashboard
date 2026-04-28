package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"
	k8sErrors "k8s.io/apimachinery/pkg/api/errors"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// attachSubscriptionHandlers registers the subscription routes.
func attachSubscriptionHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.GET(constants.SubscriptionListPath, handlerWithApp(app, ListSubscriptionsHandler))
	apiRouter.GET(constants.SubscriptionInfoPath, handlerWithApp(app, GetSubscriptionInfoHandler))
	apiRouter.POST(constants.SubscriptionCreatePath, handlerWithApp(app, CreateSubscriptionHandler))
	apiRouter.PUT(constants.SubscriptionUpdatePath, handlerWithApp(app, UpdateSubscriptionHandler))
	apiRouter.DELETE(constants.SubscriptionDeletePath, handlerWithApp(app, DeleteSubscriptionHandler))
}

// ListSubscriptionsHandler handles GET /api/v1/all-subscriptions
// K8s calls: GET /k8s/v1/maassubscription
func ListSubscriptionsHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	subscriptions, err := app.repositories.Subscriptions.ListSubscriptions(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[[]models.MaaSSubscription, None]{
		Data: subscriptions,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetSubscriptionInfoHandler handles GET /api/v1/subscription-info/:name
// K8s calls: GET /k8s/v1/maassubscription/:name, GET /k8s/v1/maasmodelref, GET /k8s/v1/maasauthpolicy
func GetSubscriptionInfoHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	name := params.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, errors.New("subscription name is required"))
		return
	}

	subscription, err := app.repositories.Subscriptions.GetSubscription(ctx, name)
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			app.notFoundResponse(w, r)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	modelRefSummaries, err := app.repositories.Subscriptions.GetModelRefSummaries(ctx, subscription.ModelRefs)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	authPolicies, err := app.repositories.Subscriptions.GetAuthPoliciesForSubscription(ctx, name)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[models.SubscriptionInfoResponse, None]{
		Data: models.SubscriptionInfoResponse{
			Subscription: *subscription,
			ModelRefs:    modelRefSummaries,
			AuthPolicies: authPolicies,
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// GetSubscriptionPolicyFormDataHandler handles GET /api/v1/subscription-policy-form-data
// K8s calls: GET /k8s/v1/groups, GET /k8s/v1/maasmodelref, GET /k8s/v1/maasauthpolicy, GET /k8s/v1/maassubscription
func GetSubscriptionPolicyFormDataHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	formData, err := app.repositories.Subscriptions.GetFormData(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	policies, err := app.repositories.Policies.ListPolicies(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	formData.Policies = policies

	subscriptions, err := app.repositories.Subscriptions.ListSubscriptions(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	formData.Subscriptions = subscriptions

	response := Envelope[*models.SubscriptionFormDataResponse, None]{
		Data: formData,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreateSubscriptionHandler handles POST /api/v1/new-subscription
// K8s calls: CREATE /k8s/v1/maassubscription, CREATE /k8s/v1/maasauthpolicy
func CreateSubscriptionHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var request Envelope[models.CreateSubscriptionRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(request.Data.Name) == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}
	if len(request.Data.ModelRefs) == 0 {
		app.badRequestResponse(w, r, errors.New("at least one modelRef is required"))
		return
	}
	for _, ref := range request.Data.ModelRefs {
		if len(ref.TokenRateLimits) == 0 {
			app.badRequestResponse(w, r, fmt.Errorf("modelRef %q requires at least one tokenRateLimit", ref.Name))
			return
		}
	}

	result, err := app.repositories.Subscriptions.CreateSubscription(ctx, request.Data)
	if err != nil {
		if k8sErrors.IsAlreadyExists(err) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusConflict,
				Error:      ErrorPayload{Code: "409", Message: err.Error()},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	response := Envelope[*models.CreateSubscriptionResponse, None]{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// UpdateSubscriptionHandler handles PUT /api/v1/update-subscription/:name
// K8s calls: PUT /k8s/v1/maassubscription/:name, PUT /k8s/v1/maasauthpolicy/:name
func UpdateSubscriptionHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	name := params.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, errors.New("subscription name is required"))
		return
	}

	var request Envelope[models.UpdateSubscriptionRequest, None]
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if len(request.Data.ModelRefs) == 0 {
		app.badRequestResponse(w, r, errors.New("at least one modelRef is required"))
		return
	}
	for _, ref := range request.Data.ModelRefs {
		if len(ref.TokenRateLimits) == 0 {
			app.badRequestResponse(w, r, fmt.Errorf("modelRef %q requires at least one tokenRateLimit", ref.Name))
			return
		}
	}

	result, err := app.repositories.Subscriptions.UpdateSubscription(ctx, name, request.Data)
	if err != nil {
		if k8sErrors.IsNotFound(err) {
			app.errorResponse(w, r, &HTTPError{
				StatusCode: http.StatusNotFound,
				Error:      ErrorPayload{Code: "404", Message: fmt.Sprintf("MaaSSubscription '%s' not found", name)},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	response := Envelope[*models.CreateSubscriptionResponse, None]{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// DeleteSubscriptionHandler handles DELETE /api/v1/subscription/:name
// K8s calls: DELETE /k8s/v1/maassubscription/:name
func DeleteSubscriptionHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	ctx := r.Context()
	name := params.ByName("name")
	if name == "" {
		app.badRequestResponse(w, r, errors.New("subscription name is required"))
		return
	}

	if err := app.repositories.Subscriptions.DeleteSubscription(ctx, name); err != nil {
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

	response := Envelope[None, None]{
		Data: nil,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
