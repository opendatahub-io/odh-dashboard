package api

import (
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/constants"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/integrations"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

type MCPServerConfigEnvelope = Envelope[*corev1.ConfigMap, None]

// MCPServerConfigHandler handles GET /genai/v1/mcp-servers/config
func (app *App) MCPServerConfigHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()

	// Get request identity from context
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get Kubernetes client from middleware
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	// Fetch the MCP server ConfigMap
	configMap, err := app.repositories.MCPServer.GetMCPServerConfig(client, ctx, identity, constants.MCPServerNamespace, constants.MCPServerName)
	if err != nil {
		if k8serrors.IsNotFound(err) {
			app.notFoundResponse(w, r)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Create response with envelope
	response := MCPServerConfigEnvelope{
		Data: configMap,
	}

	// Return JSON response with envelope structure
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
