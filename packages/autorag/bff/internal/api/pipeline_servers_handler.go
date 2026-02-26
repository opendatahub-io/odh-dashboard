package api

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
)

type PipelineServersEnvelope struct {
	Metadata interface{}                 `json:"metadata"`
	Data     *models.PipelineServersData `json:"data,omitempty"`
}

// PipelineServersHandler handles GET /api/v1/pipeline-servers
func (app *App) PipelineServersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Get namespace from context (attached by middleware)
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("namespace not found in context"))
		return
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(r.Context())
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// List Pipeline Servers using repository
	pipelineServersData, err := app.repositories.PipelineServers.ListPipelineServers(r.Context(), client, namespace)
	if err != nil {
		// Check for specific error types and return appropriate HTTP status codes
		if errors.Is(err, repositories.ErrNamespaceNotFound) {
			app.notFoundResponse(w, r)
			return
		}
		if errors.Is(err, repositories.ErrForbidden) {
			app.forbiddenResponse(w, r, err.Error())
			return
		}
		// Other unexpected errors
		app.serverErrorResponse(w, r, err)
		return
	}

	// Return response in envelope format
	envelope := PipelineServersEnvelope{
		Metadata: map[string]interface{}{},
		Data:     pipelineServersData,
	}

	err = app.WriteJSON(w, http.StatusOK, envelope, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
