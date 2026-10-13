package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type McpServerDeployReadinessEnvelope api.Envelope[models.McpServerDeployReadiness, api.None]

// Keep this ID in sync with the route key in internal/api/app.go.
const mcpServerDeployReadinessGetHandlerID = api.HandlerID("mcpServer:deployReadiness:get")

// openShiftMcpServerCatalogName is the catalog name of the MCP server for Red Hat OpenShift.
const openShiftMcpServerCatalogName = "com.redhat/openshift-mcp-server"

var newMcpLifecycleOperatorReader = func(app *api.App) redhatrepos.MCPLifecycleOperatorReader {
	if app != nil && app.Config().MockK8Client {
		return redhatrepos.StaticMCPLifecycleOperatorReader{Object: redhatrepos.NewMockMCPLifecycleOperator()}
	}
	return redhatrepos.NewServiceAccountMCPLifecycleOperatorReader()
}

func init() {
	api.RegisterHandlerOverride(mcpServerDeployReadinessGetHandlerID, overrideMcpServerDeployReadiness)
}

// mcpServerRequiresGateway reports whether a catalog server may only be deployed when an
// MCP gateway is available.
//
// Deprecated: RHOAI 3.6 stopgap for RHAISTRAT-2790 that hardcodes the MCP server for Red
// Hat OpenShift. Replace with catalog metadata that declares the prerequisite; do not add
// more servers here.
func mcpServerRequiresGateway(server *models.McpServer) bool {
	return server != nil && server.Name == openShiftMcpServerCatalogName
}

func overrideMcpServerDeployReadiness(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	reader := newMcpLifecycleOperatorReader(app)

	// Same access gate as the upstream MCP catalog routes (list, get, tools, logo).
	return app.AttachNamespace(app.RequireListServiceAccessInNamespace(app.AttachModelCatalogRESTClient(func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
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
			mcpCatalogLookupError(app, w, r, err)
			return
		}
		// The catalog decoder accepts an empty or null body. Without a name the server
		// cannot be classified, so fail instead of treating it as not requiring a gateway.
		if server == nil || strings.TrimSpace(server.Name) == "" {
			app.ServerError(w, r, fmt.Errorf("catalog returned MCP server %q without a name", serverId))
			return
		}

		readiness := models.McpServerDeployReadiness{Deployable: true}
		if mcpServerRequiresGateway(server) { //nolint:staticcheck // Deprecated helper is used until catalog metadata exists.
			obj, getErr := reader.Get(r.Context())
			var evalErr error
			readiness, evalErr = redhatrepos.EvaluateMcpGatewayReadiness(obj, getErr)
			if evalErr != nil {
				app.Logger().Error("MCP gateway readiness check failed; blocking deploy", "serverId", serverId, "error", evalErr)
			}
		}

		if err := app.WriteJSON(w, http.StatusOK, McpServerDeployReadinessEnvelope{Data: readiness}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})))
}

// mcpCatalogLookupError forwards the catalog's HTTP status (for example 404 for an unknown
// server) and reports anything else as a server error.
func mcpCatalogLookupError(app *api.App, w http.ResponseWriter, r *http.Request, err error) {
	var httpErr *httpclient.HTTPError
	if errors.As(err, &httpErr) {
		if writeErr := app.WriteJSON(w, httpErr.StatusCode, api.ErrorEnvelope{Error: httpErr}, nil); writeErr != nil {
			app.ServerError(w, r, writeErr)
		}
		return
	}
	app.ServerError(w, r, fmt.Errorf("failed to fetch MCP server: %w", err))
}
