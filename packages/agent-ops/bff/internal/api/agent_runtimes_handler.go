package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type AgentRuntimesEnvelope Envelope[*models.AgentRuntimesResponse, None]

// ListAgentRuntimesHandler handles GET /api/v1/agents/runtimes.
func (app *App) ListAgentRuntimesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	result, err := app.repositories.AgentRuntimes.ListAgentRuntimes(r.Context())
	if err != nil {
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	envelope := AgentRuntimesEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
