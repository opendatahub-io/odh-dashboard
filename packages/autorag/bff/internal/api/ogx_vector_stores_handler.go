package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type OGXVectorStoresEnvelope Envelope[*models.OGXVectorStoreProvidersData, None]

// OGXVectorStoresHandler handles GET /api/v1/ogx/vector-stores
// Returns available vector store providers from Open GenAI Stack Distribution,
// filtered to only include providers with the vector_io API type.
func (app *App) OGXVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)

	secretName := r.URL.Query().Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing required query parameter: secretName"))
		return
	}
	if !isValidDNS1123Subdomain(secretName) {
		app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
		return
	}

	providersData, err := app.repositories.OGXVectorStores.GetOGXVectorStoreProviders(ctx, namespace, secretName)
	if err != nil {
		app.handleOGXOrK8sError(w, r, err)
		return
	}

	envelope := OGXVectorStoresEnvelope{
		Data: providersData,
	}

	err = app.WriteJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
