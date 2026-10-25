package handlers

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/hub/ui/bff/internal/api"
	"github.com/kubeflow/hub/ui/bff/internal/constants"
	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
	"github.com/kubeflow/hub/ui/bff/internal/models"
	redhatrepos "github.com/kubeflow/hub/ui/bff/internal/redhat/repositories"
)

type McpServerDeployReadinessEnvelope api.Envelope[models.McpServerDeployReadiness, api.None]

// Keep these IDs in sync with the route keys in internal/api/app.go.
const (
	mcpServerDeployReadinessGetHandlerID = api.HandlerID("mcpServer:deployReadiness:get")
	mcpDeployReadinessGetHandlerID       = api.HandlerID("mcpDeployment:readiness:get")
)

// openShiftMcpServerCatalogName is the catalog name of the MCP server for Red Hat OpenShift.
const openShiftMcpServerCatalogName = "com.redhat/openshift-mcp-server"

// openShiftMcpServerImageRepository matches the last path segment of the MCP server for
// Red Hat OpenShift image repository (for example openshift-mcp-server-rhel9), on any
// registry or organization, so mirrored images match too.
var openShiftMcpServerImageRepository = regexp.MustCompile(`^openshift-mcp-server(-rhel[0-9]+)?$`)

var newMcpLifecycleOperatorReader = func(app *api.App) redhatrepos.MCPLifecycleOperatorReader {
	if app != nil && app.Config().MockK8Client {
		return redhatrepos.StaticMCPLifecycleOperatorReader{Object: redhatrepos.NewMockMCPLifecycleOperator()}
	}
	return redhatrepos.NewServiceAccountMCPLifecycleOperatorReader()
}

func init() {
	api.RegisterHandlerOverride(mcpServerDeployReadinessGetHandlerID, overrideMcpServerDeployReadiness)
	api.RegisterHandlerOverride(mcpDeployReadinessGetHandlerID, overrideMcpDeployReadiness)
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

// mcpImageRequiresGateway reports whether deploying the given image requires an MCP
// gateway. Only the image decides: it is what gets deployed, while MCP registry names come
// from user-editable server.json and can be reused for other images or changed for this one.
//
// Deprecated: RHOAI 3.6 stopgap for RHAISTRAT-2790, see mcpServerRequiresGateway.
func mcpImageRequiresGateway(image string) bool {
	return isOpenShiftMcpServerImage(image)
}

// isOpenShiftMcpServerImage reports whether an image reference points to the MCP server
// for Red Hat OpenShift, ignoring the registry, organization, tag, and digest.
func isOpenShiftMcpServerImage(ref string) bool {
	ref = strings.ToLower(strings.TrimSpace(ref))
	for _, scheme := range []string{"oci://", "docker://"} {
		ref = strings.TrimPrefix(ref, scheme)
	}
	if i := strings.Index(ref, "@"); i >= 0 {
		ref = ref[:i]
	}
	if i := strings.LastIndex(ref, "/"); i >= 0 {
		ref = ref[i+1:]
	}
	if i := strings.Index(ref, ":"); i >= 0 {
		ref = ref[:i]
	}
	return openShiftMcpServerImageRepository.MatchString(ref)
}

// evaluateMcpGatewayReadiness reads the MCPLifecycleOperator CR with the BFF service
// account and decides whether a server that requires an MCP gateway can be deployed.
func evaluateMcpGatewayReadiness(ctx context.Context, app *api.App, reader redhatrepos.MCPLifecycleOperatorReader, logArgs ...any) models.McpServerDeployReadiness {
	obj, getErr := reader.Get(ctx)
	readiness, evalErr := redhatrepos.EvaluateMcpGatewayReadiness(obj, getErr)
	if evalErr != nil {
		app.Logger().Error("MCP gateway readiness check failed; blocking deploy", append(logArgs, "error", evalErr)...)
	}
	return readiness
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

		readiness := models.McpServerDeployReadiness{
			Deployable:     true,
			SupportLevel:   models.McpSupportLevelTechnologyPreview,
			SupportMessage: "MCP Catalog, MCP Lifecycle, and MCP Gateway are Technology Preview features in this platform release.",
		}
		if mcpServerRequiresGateway(server) { //nolint:staticcheck // Deprecated helper is used until catalog metadata exists.
			readiness = evaluateMcpGatewayReadiness(r.Context(), app, reader, "serverId", serverId)
		}

		if err := app.WriteJSON(w, http.StatusOK, McpServerDeployReadinessEnvelope{Data: readiness}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})))
}

// overrideMcpDeployReadiness reports whether an MCP server image can be deployed to a
// namespace, for deploy entry points that have no catalog server ID (the MCP registry).
func overrideMcpDeployReadiness(app *api.App, _ func() httprouter.Handle) httprouter.Handle {
	reader := newMcpLifecycleOperatorReader(app)

	return app.AttachNamespace(func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		namespace, ok := namespaceFromContext(app, w, r)
		if !ok {
			return
		}

		image := strings.TrimSpace(r.URL.Query().Get("image"))
		if image == "" {
			app.BadRequest(w, r, fmt.Errorf("image is required"))
			return
		}

		// Other images need nothing, and saying so reveals nothing, so only the gated image
		// needs the access check (as on create). Otherwise a caller without create access
		// would see a failed check for every server.
		readiness := models.McpServerDeployReadiness{
			Deployable:     true,
			SupportLevel:   models.McpSupportLevelTechnologyPreview,
			SupportMessage: "MCP Catalog, MCP Lifecycle, and MCP Gateway are Technology Preview features in this platform release.",
		}
		if mcpImageRequiresGateway(image) { //nolint:staticcheck // Deprecated helper is used until catalog metadata exists.
			// The gateway status is read with the BFF service account, so check the caller's
			// own permission to deploy here for every auth method.
			if !requireMcpServersAccess(app, w, r, namespace, "create") {
				return
			}
			readiness = evaluateMcpGatewayReadiness(r.Context(), app, reader, "namespace", namespace, "image", image)
		}

		if err := app.WriteJSON(w, http.StatusOK, McpServerDeployReadinessEnvelope{Data: readiness}, nil); err != nil {
			app.ServerError(w, r, err)
		}
	})
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
