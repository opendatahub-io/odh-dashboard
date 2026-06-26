package api

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/bffclient"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

// GetCatalogModelSecurityArtifactsHandler proxies the request to the model-catalog BFF
// to retrieve security artifacts for a specific model.
//
// Route: GET /api/v1/catalog/sources/:source_id/security_artifacts/*model_name
//
// The frontend extension passes source_id and model_name; the handler forwards
// the call to the model-catalog BFF at:
//
//	GET /model_catalog/sources/:source_id/security_artifacts/:model_name
//
// Only this endpoint is in the allowlist; other model-catalog endpoints
// are blocked by the bffclient.
func (app *App) GetCatalogModelSecurityArtifactsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	mcClient := bffclient.GetClient(ctx, bffclient.BFFTargetModelCatalog)
	if mcClient == nil {
		app.serviceUnavailableResponse(w, r, fmt.Errorf("model-catalog BFF client is not available"))
		return
	}

	sourceID := ps.ByName("source_id")
	if sourceID == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required path parameter: source_id"))
		return
	}

	modelName := strings.TrimPrefix(ps.ByName("model_name"), "/")
	if modelName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required path parameter: model_name"))
		return
	}

	encodedModelName := url.PathEscape(modelName)

	// The bffclient baseURL already includes /api/v1 as PathPrefix.
	catalogPath := fmt.Sprintf("/model_catalog/sources/%s/security_artifacts/%s", sourceID, encodedModelName)

	if rawQuery := r.URL.RawQuery; rawQuery != "" {
		catalogPath += "?" + rawQuery
	}

	// The model-catalog BFF returns {"data": {"items":[...], "size":N, ...}}.
	var envelope models.CatalogSecurityArtifactListEnvelope
	err := mcClient.Call(ctx, "GET", catalogPath, nil, &envelope)
	if err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	if writeErr := app.WriteJSON(w, http.StatusOK, envelope, nil); writeErr != nil {
		app.serverErrorResponse(w, r, writeErr)
	}
}

// handleBFFClientError maps bffclient errors to HTTP responses.
func (app *App) handleBFFClientError(w http.ResponseWriter, r *http.Request, err error) {
	if bffErr, ok := err.(*bffclient.BFFClientError); ok {
		statusCode := bffErr.StatusCode
		if statusCode == 0 {
			statusCode = http.StatusBadGateway
		}
		httpError := &HTTPError{
			StatusCode: statusCode,
			Error:      ErrorPayload{Code: bffErr.Code, Message: bffErr.Message},
		}
		app.errorResponse(w, r, httpError)
		return
	}
	app.serverErrorResponse(w, r, err)
}
