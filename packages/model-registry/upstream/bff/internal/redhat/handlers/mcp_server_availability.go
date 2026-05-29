package handlers

import (
	"context"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type McpServerAvailabilityEnvelope api.Envelope[McpServerAvailabilityResponse, api.None]

type McpServerAvailabilityResponse struct {
	Available bool `json:"available"`
}

type mcpServerAvailabilityChecker interface {
	IsMcpServerCRDAvailable(ctx context.Context, client k8s.KubernetesClientInterface) (bool, error)
}

var newMcpServerAvailabilityRepo = func(app *api.App) mcpServerAvailabilityChecker {
	return redhatrepos.NewMcpServerAvailabilityRepository(app.Logger())
}

const (
	mcpServerAvailabilityHandlerID = api.HandlerID("mcpServer:availability")
)

func init() {
	api.RegisterHandlerOverride(mcpServerAvailabilityHandlerID, overrideMcpServerAvailability)
}

func overrideMcpServerAvailability(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	repo := newMcpServerAvailabilityRepo(app)

	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		available, err := repo.IsMcpServerCRDAvailable(r.Context(), client)
		if err != nil {
			app.ServerError(w, r, err)
			return
		}

		resp := McpServerAvailabilityEnvelope{
			Data: McpServerAvailabilityResponse{Available: available},
		}
		if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
			app.ServerError(w, r, err)
		}
	}
}
