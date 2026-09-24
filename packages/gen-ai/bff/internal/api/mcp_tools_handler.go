package api

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	kubernetes "github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

type MCPToolsEnvelope = Envelope[*models.ToolsStatus, None]

// MCPToolsHandler handles GET /genai/v1/mcp/tools?namespace=<>&server_url=<> or server_name=<>
func (app *App) MCPToolsHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	namespace, _, decodedURL, serverName, err := app.parseMCPToolsStatusParams(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var (
		identity  *integrations.RequestIdentity
		k8sClient kubernetes.KubernetesClientInterface
	)

	if serverName != "" {
		identity, err = app.setupMCPIdentityWithTokenValidation(ctx, r)
	} else {
		identity, k8sClient, err = app.setupMCPEndpointWithTokenValidation(ctx, r)
	}
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	var serverConfig models.MCPServerConfig

	if serverName != "" {
		mlflowClient := app.mlflowBFFClient(ctx)
		serverConfig, err = app.resolveRegistryServerConfig(ctx, namespace, serverName, mlflowClient)
		if err != nil {
			app.handleRegistryResolveError(w, r, err)
			return
		}
	} else {
		serverConfig, err = app.findMCPServerConfig(ctx, k8sClient, identity, decodedURL, app.dashboardNamespace)
		if err != nil {
			app.notFoundResponse(w, r)
			return
		}
	}

	toolsStatus, err := app.repositories.MCPClient.ListMCPServerToolsWithStatus(ctx, identity, serverConfig)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	response := MCPToolsEnvelope{
		Data: toolsStatus,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
