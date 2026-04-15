package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type LSDVectorStoresEnvelope Envelope[*models.LSDVectorStoreProvidersData, None]

// LlamaStackVectorStoresHandler handles GET /api/v1/lsd/vector-stores
// Returns available vector store providers from LlamaStack Distribution,
// filtered to only include providers with the vector_io API type.
func (app *App) LlamaStackVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	providersData, err := app.repositories.LSDVectorStores.GetLSDVectorStoreProviders(ctx)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	envelope := LSDVectorStoresEnvelope{
		Data: providersData,
	}

	err = app.WriteJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
