package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"

	"github.com/julienschmidt/httprouter"
	k8s "github.com/opendatahub-io/mlflow/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
	"github.com/opendatahub-io/mlflow/bff/internal/repositories"
)

// mcpServerNamespaceRegex and mcpServerSlugRegex validate the two halves of
// an MCP server name; see parseMCPServerPath for the expected format.
var (
	mcpServerNamespaceRegex = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$`)
	mcpServerSlugRegex      = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$`)
)

// mcpServerReservedSlugs are slugs that collide with the sub-resource path
// segments this BFF's catch-all routing reserves.
var mcpServerReservedSlugs = map[string]bool{
	"aliases":   true,
	"endpoints": true,
	"tags":      true,
	"versions":  true,
}

// validateMCPServerName enforces the MCP server naming convention (see
// parseMCPServerPath) and rejects slugs reserved for sub-resource routing.
func validateMCPServerName(name string) error {
	namespace, slug, err := splitMCPServerName(name)
	if err != nil {
		return err
	}
	if !mcpServerNamespaceRegex.MatchString(namespace) {
		return fmt.Errorf("invalid MCP server name %q: namespace %q must start and end with an alphanumeric character and contain only alphanumerics, dots, or hyphens", name, namespace)
	}
	if !mcpServerSlugRegex.MatchString(slug) {
		return fmt.Errorf("invalid MCP server name %q: slug %q must start and end with an alphanumeric character and contain only alphanumerics, dots, underscores, or hyphens", name, slug)
	}
	if mcpServerReservedSlugs[slug] {
		return fmt.Errorf("invalid MCP server name %q: slug %q is reserved", name, slug)
	}
	return nil
}

// splitMCPServerName splits name into its namespace and slug halves,
// requiring exactly one "/" separator (mirroring Python's
// `namespace, slug = name.split("/")`, which raises if the split doesn't
// produce exactly two parts).
func splitMCPServerName(name string) (namespace, slug string, err error) {
	parts := strings.Split(name, "/")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", fmt.Errorf(`invalid MCP server name %q: must be in "<namespace>/<slug>" format with exactly one "/" (e.g. "com.example/my-server")`, name)
	}
	return parts[0], parts[1], nil
}

// mcpServerNamePathSegment renders name for use as a literal REST path
// segment (as opposed to a single opaque, fully percent-escaped value).
// Each "/"-separated part is escaped independently so the separating "/"
// itself is preserved rather than becoming "%2F".
func mcpServerNamePathSegment(name string) string {
	parts := strings.Split(name, "/")
	for i, p := range parts {
		parts[i] = url.PathEscape(p)
	}
	return strings.Join(parts, "/")
}

// mcpServerSubresource identifies which operation a parsed catch-all path
// under MCPServerCatchAllPath ("/mcp-registry/servers/*rest") addresses.
type mcpServerSubresource int

const (
	mcpSubresourceServer mcpServerSubresource = iota
	mcpSubresourceVersions
	mcpSubresourceEndpoints
	mcpSubresourceEndpoint
)

// parseMCPServerPath splits an httprouter catch-all capture (e.g.
// "/com.example/my-server/versions") into the MCP server name and which
// sub-resource, if any, the remaining segments address. endpointID is only
// set for mcpSubresourceEndpoint.
//
// MCP server names are "<namespace>/<slug>" (e.g. "com.example/my-server"):
// exactly one "/" separating two non-empty segments, always taken as the
// first two "/"-separated segments here, each starting and ending with an
// alphanumeric character. The namespace may otherwise contain dots and
// hyphens (reverse-DNS style); the slug may also contain underscores. This
// mirrors mlflow/entities/mcp_server.py's validate_mcp_server_name, so any
// name accepted here also passes validation on the real MLflow server this
// BFF proxies to.
func parseMCPServerPath(rest string) (name string, subresource mcpServerSubresource, endpointID string, err error) {
	trimmed := strings.TrimPrefix(rest, "/")
	if trimmed == "" {
		return "", 0, "", errors.New("MCP server name is required")
	}

	segments := strings.Split(trimmed, "/")
	if len(segments) < 2 {
		return "", 0, "", fmt.Errorf(`invalid MCP server name %q: must be in "<namespace>/<slug>" format with exactly one "/" (e.g. "com.example/my-server")`, trimmed)
	}

	name = segments[0] + "/" + segments[1]
	if err := validateMCPServerName(name); err != nil {
		return "", 0, "", err
	}
	remainder := segments[2:]

	switch len(remainder) {
	case 0:
		return name, mcpSubresourceServer, "", nil
	case 1:
		switch remainder[0] {
		case "versions":
			return name, mcpSubresourceVersions, "", nil
		case "endpoints":
			return name, mcpSubresourceEndpoints, "", nil
		}
	case 2:
		if remainder[0] == "endpoints" && remainder[1] != "" {
			return name, mcpSubresourceEndpoint, remainder[1], nil
		}
	}

	return "", 0, "", fmt.Errorf("unrecognized MCP registry path %q", rest)
}

// validateMCPEndpointID guards against path-traversal/path-injection
// values before they reach the MLflow Go client's own REST path
// construction, which would otherwise surface as a misleading 500 instead
// of a 400.
func validateMCPEndpointID(id string) error {
	if id == "" {
		return errors.New("endpoint id cannot be empty")
	}
	if id == "." || id == ".." || strings.Contains(id, "/") {
		return fmt.Errorf("invalid endpoint id %q: must not contain \"/\" or be \".\" or \"..\"", id)
	}
	return nil
}

// validateMCPEndpointURL requires an absolute http/https URL (mirroring
// the scheme/host validation applied to MLflow CR status.address.url) and
// rejects "localhost" and private/loopback/link-local IP hosts as SSRF
// protection, via the isPrivateIP helper below. DNS resolution of
// arbitrary hostnames is deliberately not performed here, since it would
// make every write depend on network/DNS availability for a URL this BFF
// never dials itself.
func validateMCPEndpointURL(rawURL string) error {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("invalid endpoint_url %q: must be an absolute http or https URL", rawURL)
	}
	host := parsed.Hostname()
	if strings.EqualFold(host, "localhost") {
		return fmt.Errorf("invalid endpoint_url %q: host %q is not allowed", rawURL, host)
	}
	if ip := net.ParseIP(host); ip != nil && isPrivateIP(ip) {
		return fmt.Errorf("invalid endpoint_url %q: host %q is a private address", rawURL, host)
	}
	return nil
}

func isPrivateIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsPrivate()
}

type MCPServersEnvelope = Envelope[models.MCPServersResponse, None]
type MCPServerEnvelope = Envelope[models.MCPServer, None]
type MCPServerVersionsEnvelope = Envelope[models.MCPServerVersionsResponse, None]
type MCPServerVersionEnvelope = Envelope[models.MCPServerVersion, None]
type MCPAccessEndpointsEnvelope = Envelope[models.MCPAccessEndpointsResponse, None]
type MCPAccessEndpointEnvelope = Envelope[models.MCPAccessEndpoint, None]

// enforceMCPWritePermission checks if the user has write permissions for the
// MCP Registry in the namespace. Mirrors enforceWritePermission (prompts_handler.go)
// but checks the mlflow.kubeflow.org/mcpservers pseudo-resource instead of
// registeredmodels. Returns true if allowed, false if denied or an error
// occurred (response already written).
// Delegates the auth-disabled bypass, error handling, and forbidden-response
// shape to enforceResourceWritePermission (permissions.go), shared with
// enforceWritePermission (prompts_handler.go).
func (app *App) enforceMCPWritePermission(
	ctx context.Context,
	w http.ResponseWriter,
	r *http.Request,
	workspace string,
	verb string,
) bool {
	return app.enforceResourceWritePermission(ctx, w, r, workspace, verb,
		"insufficient permissions to write to the MCP registry",
		func(k8sClient k8s.KubernetesClientInterface) resourceWriteChecker {
			return k8sClient.CanWriteMCPServersInNamespace
		})
}

// MLflowMCPServerCatchAllGetHandler handles all GET requests under
// MCPServerCatchAllPath ("/mcp-registry/servers/*rest"), dispatching to the
// server, versions, or endpoints operation based on the parsed path. See
// parseMCPServerPath for how the catch-all capture is split.
func (app *App) MLflowMCPServerCatchAllGetHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name, subresource, _, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	switch subresource {
	case mcpSubresourceServer:
		app.mlflowGetMCPServer(w, r, name)
	case mcpSubresourceVersions:
		app.mlflowListMCPServerVersions(w, r, name)
	case mcpSubresourceEndpoints:
		app.mlflowSearchMCPAccessEndpoints(w, r, name)
	default:
		app.notFoundResponse(w, r)
	}
}

// MLflowMCPServerCatchAllPostHandler handles all POST requests under
// MCPServerCatchAllPath, dispatching to version or endpoint creation.
func (app *App) MLflowMCPServerCatchAllPostHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name, subresource, _, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	switch subresource {
	case mcpSubresourceVersions:
		app.mlflowCreateMCPServerVersion(w, r, name)
	case mcpSubresourceEndpoints:
		app.mlflowCreateMCPAccessEndpoint(w, r, name)
	default:
		app.notFoundResponse(w, r)
	}
}

// MLflowMCPServerCatchAllDeleteHandler handles all DELETE requests under
// MCPServerCatchAllPath, dispatching to access-endpoint deletion.
func (app *App) MLflowMCPServerCatchAllDeleteHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	name, subresource, endpointID, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if subresource != mcpSubresourceEndpoint {
		app.notFoundResponse(w, r)
		return
	}
	if err := validateMCPEndpointID(endpointID); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	app.mlflowDeleteMCPAccessEndpoint(w, r, name, endpointID)
}

// MLflowSearchMCPServersHandler handles GET /api/v1/mcp-registry/servers
func (app *App) MLflowSearchMCPServersHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	filter := r.URL.Query().Get("filter")
	tag := r.URL.Query().Get("tag")
	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	app.logger.Debug("searching MCP servers",
		slog.String("filter", filter),
		slog.String("tag", tag),
		slog.String("max_results", maxResults))

	result, err := app.repositories.MCPRegistry.SearchServers(ctx, filter, tag, pageToken, maxResults)
	if err != nil {
		if errors.Is(err, repositories.ErrInvalidFilter) {
			app.badRequestResponse(w, r, err)
			return
		}
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, errors.New("SearchServers returned nil"))
		return
	}

	response := MCPServersEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// MLflowCreateMCPServerHandler handles POST /api/v1/mcp-registry/servers
func (app *App) MLflowCreateMCPServerHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req models.CreateMCPServerRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if err := validateMCPServerName(req.Name); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "create") {
		return
	}

	app.logger.Debug("creating MCP server",
		slog.String("workspace", workspace),
		slog.String("name", req.Name))

	result, err := app.repositories.MCPRegistry.CreateServer(ctx, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("CreateServer returned nil for %q", req.Name))
		return
	}

	response := MCPServerEnvelope{Data: *result}
	headers := http.Header{
		"Location": {fmt.Sprintf("%s/%s?workspace=%s", MCPServersPath, mcpServerNamePathSegment(result.Name), url.QueryEscape(workspace))},
	}
	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowGetMCPServer handles GET /api/v1/mcp-registry/servers/:name (routed
// via MLflowMCPServerCatchAllGetHandler).
func (app *App) mlflowGetMCPServer(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	app.logger.Debug("getting MCP server", slog.String("name", name))

	result, err := app.repositories.MCPRegistry.GetServer(ctx, name)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("GetServer returned nil for %q", name))
		return
	}

	response := MCPServerEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowListMCPServerVersions handles GET /api/v1/mcp-registry/servers/:name/versions
// (routed via MLflowMCPServerCatchAllGetHandler).
func (app *App) mlflowListMCPServerVersions(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	app.logger.Debug("listing MCP server versions",
		slog.String("name", name),
		slog.String("max_results", maxResults))

	result, err := app.repositories.MCPRegistry.ListServerVersions(ctx, name, pageToken, maxResults)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("ListServerVersions returned nil for %q", name))
		return
	}

	response := MCPServerVersionsEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowCreateMCPServerVersion handles POST /api/v1/mcp-registry/servers/:name/versions
// (routed via MLflowMCPServerCatchAllPostHandler).
func (app *App) mlflowCreateMCPServerVersion(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	var req models.CreateMCPServerVersionRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if len(req.ServerJSON) == 0 {
		app.badRequestResponse(w, r, errors.New("server_json is required"))
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "create") {
		return
	}

	app.logger.Debug("creating MCP server version",
		slog.String("workspace", workspace),
		slog.String("name", name))

	result, err := app.repositories.MCPRegistry.CreateServerVersion(ctx, name, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("CreateServerVersion returned nil for %q", name))
		return
	}

	response := MCPServerVersionEnvelope{Data: *result}
	headers := http.Header{
		"Location": {fmt.Sprintf("%s/%s/versions/%s?workspace=%s", MCPServersPath, mcpServerNamePathSegment(name), url.PathEscape(result.Version), url.QueryEscape(workspace))},
	}
	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowCreateMCPAccessEndpoint handles POST /api/v1/mcp-registry/servers/:name/endpoints
// (routed via MLflowMCPServerCatchAllPostHandler).
func (app *App) mlflowCreateMCPAccessEndpoint(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	var req models.CreateMCPAccessEndpointRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.EndpointURL == "" {
		app.badRequestResponse(w, r, errors.New("endpoint_url is required"))
		return
	}
	if err := validateMCPEndpointURL(req.EndpointURL); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if req.ServerVersion != "" && req.ServerAlias != "" {
		app.badRequestResponse(w, r, errors.New("server_version and server_alias are mutually exclusive"))
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "create") {
		return
	}

	app.logger.Debug("creating MCP access endpoint",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("endpoint_url", req.EndpointURL))

	result, err := app.repositories.MCPRegistry.CreateAccessEndpoint(ctx, name, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("CreateAccessEndpoint returned nil for %q", name))
		return
	}

	response := MCPAccessEndpointEnvelope{Data: *result}
	headers := http.Header{
		"Location": {fmt.Sprintf("%s/%s/endpoints/%s?workspace=%s", MCPServersPath, mcpServerNamePathSegment(name), url.PathEscape(result.ID), url.QueryEscape(workspace))},
	}
	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowSearchMCPAccessEndpoints handles GET /api/v1/mcp-registry/servers/:name/endpoints
// (routed via MLflowMCPServerCatchAllGetHandler).
func (app *App) mlflowSearchMCPAccessEndpoints(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	pageToken := r.URL.Query().Get("page_token")
	maxResults := r.URL.Query().Get("max_results")

	app.logger.Debug("searching MCP access endpoints",
		slog.String("name", name),
		slog.String("max_results", maxResults))

	result, err := app.repositories.MCPRegistry.SearchAccessEndpoints(ctx, name, pageToken, maxResults)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("SearchAccessEndpoints returned nil for %q", name))
		return
	}

	response := MCPAccessEndpointsEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowDeleteMCPAccessEndpoint handles DELETE /api/v1/mcp-registry/servers/:name/endpoints/:endpointId
// (routed via MLflowMCPServerCatchAllDeleteHandler).
func (app *App) mlflowDeleteMCPAccessEndpoint(w http.ResponseWriter, r *http.Request, name, endpointID string) {
	ctx := r.Context()

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	app.logger.Debug("deleting MCP access endpoint",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("endpoint_id", endpointID))

	if err := app.repositories.MCPRegistry.DeleteAccessEndpoint(ctx, name, endpointID); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
