package handlers

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/constants"
	helper "github.com/kubeflow/model-registry/ui/bff/internal/helpers"
	"github.com/kubeflow/model-registry/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/model-registry/ui/bff/internal/models"
)

type MCPServerEnvelope api.Envelope[*models.MCPServer, api.None]

const mcpServerConverterGetHandlerID = api.HandlerID("mcpServer:converter:get")

func init() {
	api.RegisterHandlerOverride(mcpServerConverterGetHandlerID, overrideMcpServerConverter)
}

func overrideMcpServerConverter(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	return app.AttachNamespace(app.AttachModelCatalogRESTClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		client, ok := r.Context().Value(constants.ModelCatalogHttpClientKey).(httpclient.HTTPClientInterface)
		if !ok {
			app.ServerError(w, r, errors.New("catalog REST client not found"))
			return
		}

		serverId := ps.ByName(api.McpServerId)
		if serverId == "" {
			app.BadRequest(w, r, fmt.Errorf("server_id is required"))
			return
		}

		server, err := app.Repositories().ModelCatalogClient.GetMcpServer(client, serverId, r.URL.Query())
		if err != nil {
			app.ServerError(w, r, fmt.Errorf("failed to fetch MCP server: %w", err))
			return
		}

		containerImage := helper.ExtractContainerImage(server.Artifacts)
		if containerImage == "" {
			app.BadRequest(w, r, fmt.Errorf("server %q has no usable container image artifact", serverId))
			return
		}

		result := helper.ConvertToMCPServer(server.RuntimeMetadata, helper.ConversionOptions{
			Name:           server.Name,
			ContainerImage: containerImage,
		})

		envelope := MCPServerEnvelope{
			Data: result.MCPServer,
		}

		if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
			app.ServerError(w, r, err)
		}
	}))
}
