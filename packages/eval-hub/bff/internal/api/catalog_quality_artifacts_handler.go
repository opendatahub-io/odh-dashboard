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

const (
	qualityArtifactsPath = "/model_catalog/sources/%s/artifacts/%s"
	qualityArtifactType  = "metrics-artifact"
	qualityFilterQuery   = `metricsType.string_value="evaluation-metrics"`
)

// GetCatalogModelQualityArtifactsHandler proxies the generic model-catalog
// artifacts endpoint with the fixed evaluation-metrics filter.
func (app *App) GetCatalogModelQualityArtifactsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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
	catalogPath := fmt.Sprintf(qualityArtifactsPath, sourceID, encodedModelName)

	query := r.URL.Query()
	query.Set("artifactType", qualityArtifactType)
	query.Set("filterQuery", qualityFilterQuery)
	catalogPath += "?" + query.Encode()

	var envelope models.CatalogQualityArtifactListEnvelope
	if err := mcClient.Call(ctx, http.MethodGet, catalogPath, nil, &envelope); err != nil {
		app.handleBFFClientError(w, r, err)
		return
	}

	if writeErr := app.WriteJSON(w, http.StatusOK, envelope, nil); writeErr != nil {
		app.serverErrorResponse(w, r, writeErr)
	}
}
