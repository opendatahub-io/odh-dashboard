package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

type LSDVectorStoresEnvelope Envelope[*models.LSDVectorStoresData, None]

// LlamaStackVectorStoresHandler handles GET /api/v1/lsd/vector-stores
// Returns all available vector stores from LlamaStack Distribution.
func (app *App) LlamaStackVectorStoresHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	vectorStoresData, err := app.repositories.LSDVectorStores.GetLSDVectorStores(ctx)
	if err != nil {
		app.handleLlamaStackClientError(w, r, err)
		return
	}

	envelope := LSDVectorStoresEnvelope{
		Data: vectorStoresData,
	}

	err = app.WriteJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
