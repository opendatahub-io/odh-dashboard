package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

// attachAPIKeyHandlers registers the API key routes
func attachAPIKeyHandlers(apiRouter *httprouter.Router, app *App) {
	apiRouter.POST(constants.APIKeyCreatePath, handlerWithApp(app, CreateAPIKeyHandler))
	apiRouter.POST(constants.APIKeySearchPath, handlerWithApp(app, SearchAPIKeysHandler))
	apiRouter.POST(constants.APIKeyBulkRevokePath, handlerWithApp(app, BulkRevokeAPIKeysHandler))
	apiRouter.GET(constants.APIKeyByIDPath, handlerWithApp(app, GetAPIKeyHandler))
	apiRouter.DELETE(constants.APIKeyByIDPath, handlerWithApp(app, RevokeAPIKeyHandler))
	apiRouter.GET(constants.SubscriptionsPassthroughPath, handlerWithApp(app, ListSubscriptionsPassthroughHandler))
}

// ListSubscriptionsPassthroughHandler handles GET /api/v1/subscriptions
// Proxies to the maas-api /v1/subscriptions endpoint and returns a sanitised list of subscriptions accessible to the authenticated user.
func ListSubscriptionsPassthroughHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	subscriptions, err := app.repositories.APIKeys.ListSubscriptionsForApiKeys(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := Envelope[[]models.SubscriptionListItem, None]{
		Data: subscriptions,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// CreateAPIKeyHandler handles POST /api/v1/api-keys
func CreateAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeyCreateRequest, None]

	// Parse request body if present
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if strings.TrimSpace(request.Data.Name) == "" {
		app.badRequestResponse(w, r, errors.New("name is required"))
		return
	}

	if strings.TrimSpace(request.Data.Subscription) == "" {
		app.badRequestResponse(w, r, errors.New("subscription is required"))
		return
	}

	response, err := app.repositories.APIKeys.CreateAPIKey(r.Context(), request.Data)
	if err != nil {
		var upstreamErr *maas.MaasUpstreamError
		if errors.As(err, &upstreamErr) {
			app.badRequestResponse(w, r, upstreamErr)
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	responseEnvelope := Envelope[*models.APIKeyCreateResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusCreated, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// SearchAPIKeysHandler handles POST /api/v1/api-keys/search
func SearchAPIKeysHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeySearchRequest, None]

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	response, err := app.repositories.APIKeys.SearchAPIKeys(r.Context(), request.Data)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	enrichAPIKeysWithSubscriptionDetails(app, r, response)

	responseEnvelope := Envelope[*models.APIKeyListResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// enrichAPIKeysWithSubscriptionDetails fetches subscription data from the MaaS API
// and populates SubscriptionDetails on the response with model names per subscription.
func enrichAPIKeysWithSubscriptionDetails(app *App, r *http.Request, response *models.APIKeyListResponse) {
	subNames := make(map[string]struct{})
	for _, key := range response.Data {
		if key.SubscriptionName != "" {
			subNames[key.SubscriptionName] = struct{}{}
		}
	}

	if len(subNames) == 0 {
		return
	}

	subscriptions, err := app.repositories.APIKeys.ListSubscriptionsForApiKeys(r.Context())
	if err != nil {
		app.logger.Warn("Failed to fetch subscriptions for API key enrichment", "error", err)
		return
	}

	details := make(map[string]models.SubscriptionDetail, len(subNames))
	for _, sub := range subscriptions {
		if _, needed := subNames[sub.SubscriptionIDHeader]; !needed {
			continue
		}
		modelNames := make([]string, len(sub.ModelRefs))
		for i, ref := range sub.ModelRefs {
			if ref.DisplayName != "" {
				modelNames[i] = ref.DisplayName
			} else {
				modelNames[i] = ref.Name
			}
		}
		displayName := sub.DisplayName
		if displayName == "" {
			displayName = sub.SubscriptionIDHeader
		}
		details[sub.SubscriptionIDHeader] = models.SubscriptionDetail{DisplayName: displayName, Models: modelNames}
	}

	if len(details) > 0 {
		response.SubscriptionDetails = details
	}
}

// GetAPIKeyHandler handles GET /api/v1/api-keys/:id
// Returns metadata for a specific API key
func GetAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	keyID := params.ByName("id")
	if keyID == "" {
		app.badRequestResponse(w, r, errors.New("API key ID is required"))
		return
	}

	key, err := app.repositories.APIKeys.GetAPIKey(r.Context(), keyID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKey, None]{
		Data: key,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// RevokeAPIKeyHandler handles DELETE /api/v1/api-keys/:id
func RevokeAPIKeyHandler(app *App, w http.ResponseWriter, r *http.Request, params httprouter.Params) {
	keyID := params.ByName("id")
	if keyID == "" {
		app.badRequestResponse(w, r, errors.New("API key ID is required"))
		return
	}

	key, err := app.repositories.APIKeys.RevokeAPIKey(r.Context(), keyID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKey, None]{
		Data: key,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// BulkRevokeAPIKeysHandler handles POST /api/v1/api-keys/bulk-revoke
func BulkRevokeAPIKeysHandler(app *App, w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var request Envelope[models.APIKeyBulkRevokeRequest, None]

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	username := strings.TrimSpace(request.Data.Username)
	if username == "" {
		app.badRequestResponse(w, r, errors.New("username is required"))
		return
	}
	request.Data.Username = username

	response, err := app.repositories.APIKeys.BulkRevokeAPIKeys(r.Context(), request.Data)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	responseEnvelope := Envelope[*models.APIKeyBulkRevokeResponse, None]{
		Data: response,
	}

	if err := app.WriteJSON(w, http.StatusOK, responseEnvelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
