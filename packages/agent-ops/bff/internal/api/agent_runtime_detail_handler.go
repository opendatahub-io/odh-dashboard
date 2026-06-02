package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

type AgentRuntimeDetailEnvelope Envelope[*models.AgentRuntimeDetail, None]

// GetAgentRuntimeDetailHandler handles GET /api/v1/agents/runtimes/:ns/:name.
func (app *App) GetAgentRuntimeDetailHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	namespace := ps.ByName("ns")
	name := ps.ByName("name")
	if err := validateAgentPathParams(namespace, name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	result, err := app.repositories.AgentRuntimes.GetAgentRuntimeDetail(r.Context(), namespace, name)
	if err != nil {
		app.handleAgentRepositoryError(w, r, err)
		return
	}

	envelope := AgentRuntimeDetailEnvelope{
		Data: result,
	}

	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
