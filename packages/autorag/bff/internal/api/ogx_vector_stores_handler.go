package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type OGXVectorStoresEnvelope Envelope[*models.OGXVectorStoreProvidersData, None]

// OGXVectorStoresHandler handles GET /api/v1/ogx/vector-stores
// Returns available vector store providers from Open GenAI Stack Distribution,
// filtered to only include providers with the vector_io API type.
func (app *App) OGXVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	providersData, err := app.repositories.OGXVectorStores.GetOGXVectorStoreProviders(ctx)
	if err != nil {
		app.handleOGXClientError(w, r, err)
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
