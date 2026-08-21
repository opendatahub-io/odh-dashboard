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
	mcpSubresourceVersion
	mcpSubresourceVersionTags
	mcpSubresourceVersionTag
	mcpSubresourceTags
	mcpSubresourceTag
	mcpSubresourceAliases
	mcpSubresourceAlias
	mcpSubresourceEndpoints
	mcpSubresourceEndpoint
)

// mcpServerPath is the result of parsing an httprouter catch-all capture
// under MCPServerCatchAllPath into an MCP server name and which
// sub-resource, if any, the remaining path segments address. Only the
// fields relevant to Subresource are populated; the others are "".
type mcpServerPath struct {
	Name        string
	Subresource mcpServerSubresource
	Version     string
	Key         string
	Alias       string
	EndpointID  string
}

// parseMCPServerPath splits an httprouter catch-all capture (e.g.
// "/com.example/my-server/versions") into the MCP server name and which
// sub-resource, if any, the remaining segments address, matching the
// MLflow Go SDK's REST path shapes 1:1 (see mcpregistry/client.go):
//
//   - "" (bare name)                        -> mcpSubresourceServer
//   - "/versions"                           -> mcpSubresourceVersions
//   - "/versions/:version"                  -> mcpSubresourceVersion
//   - "/versions/:version/tags"             -> mcpSubresourceVersionTags
//   - "/versions/:version/tags/:key"        -> mcpSubresourceVersionTag
//   - "/tags"                               -> mcpSubresourceTags
//   - "/tags/:key"                          -> mcpSubresourceTag
//   - "/aliases"                            -> mcpSubresourceAliases
//   - "/aliases/:alias"                     -> mcpSubresourceAlias
//   - "/endpoints"                          -> mcpSubresourceEndpoints
//   - "/endpoints/:id"                      -> mcpSubresourceEndpoint
//
// MCP server names are "<namespace>/<slug>" (e.g. "com.example/my-server"):
// exactly one "/" separating two non-empty segments, always taken as the
// first two "/"-separated segments here, each starting and ending with an
// alphanumeric character. The namespace may otherwise contain dots and
// hyphens (reverse-DNS style); the slug may also contain underscores. This
// mirrors mlflow/entities/mcp_server.py's validate_mcp_server_name, so any
// name accepted here also passes validation on the real MLflow server this
// BFF proxies to.
func parseMCPServerPath(rest string) (*mcpServerPath, error) {
	trimmed := strings.TrimPrefix(rest, "/")
	if trimmed == "" {
		return nil, errors.New("MCP server name is required")
	}

	segments := strings.Split(trimmed, "/")
	if len(segments) < 2 {
		return nil, fmt.Errorf(`invalid MCP server name %q: must be in "<namespace>/<slug>" format with exactly one "/" (e.g. "com.example/my-server")`, trimmed)
	}

	name := segments[0] + "/" + segments[1]
	if err := validateMCPServerName(name); err != nil {
		return nil, err
	}
	remainder := segments[2:]

	switch len(remainder) {
	case 0:
		return &mcpServerPath{Name: name, Subresource: mcpSubresourceServer}, nil
	case 1:
		switch remainder[0] {
		case "versions":
			return &mcpServerPath{Name: name, Subresource: mcpSubresourceVersions}, nil
		case "endpoints":
			return &mcpServerPath{Name: name, Subresource: mcpSubresourceEndpoints}, nil
		case "tags":
			return &mcpServerPath{Name: name, Subresource: mcpSubresourceTags}, nil
		case "aliases":
			return &mcpServerPath{Name: name, Subresource: mcpSubresourceAliases}, nil
		}
	case 2:
		switch remainder[0] {
		case "endpoints":
			if remainder[1] != "" {
				if err := validateMCPPathSegment("endpoint id", remainder[1]); err != nil {
					return nil, err
				}
				return &mcpServerPath{Name: name, Subresource: mcpSubresourceEndpoint, EndpointID: remainder[1]}, nil
			}
		case "versions":
			if remainder[1] != "" {
				if err := validateMCPPathSegment("version", remainder[1]); err != nil {
					return nil, err
				}
				return &mcpServerPath{Name: name, Subresource: mcpSubresourceVersion, Version: remainder[1]}, nil
			}
		case "tags":
			if remainder[1] != "" {
				if err := validateMCPPathSegment("tag key", remainder[1]); err != nil {
					return nil, err
				}
				return &mcpServerPath{Name: name, Subresource: mcpSubresourceTag, Key: remainder[1]}, nil
			}
		case "aliases":
			if remainder[1] != "" {
				if err := validateMCPPathSegment("alias", remainder[1]); err != nil {
					return nil, err
				}
				return &mcpServerPath{Name: name, Subresource: mcpSubresourceAlias, Alias: remainder[1]}, nil
			}
		}
	case 3:
		if remainder[0] == "versions" && remainder[1] != "" && remainder[2] == "tags" {
			if err := validateMCPPathSegment("version", remainder[1]); err != nil {
				return nil, err
			}
			return &mcpServerPath{Name: name, Subresource: mcpSubresourceVersionTags, Version: remainder[1]}, nil
		}
	case 4:
		if remainder[0] == "versions" && remainder[1] != "" && remainder[2] == "tags" && remainder[3] != "" {
			if err := validateMCPPathSegment("version", remainder[1]); err != nil {
				return nil, err
			}
			if err := validateMCPPathSegment("tag key", remainder[3]); err != nil {
				return nil, err
			}
			return &mcpServerPath{Name: name, Subresource: mcpSubresourceVersionTag, Version: remainder[1], Key: remainder[3]}, nil
		}
	}

	return nil, fmt.Errorf("unrecognized MCP registry path %q", rest)
}

// percentEncodedPattern matches a percent-encoded byte (e.g. "%2F", "%2e"),
// used by validateMCPPathSegment to reject values that could decode into
// "/", ".", or ".." further down the line (e.g. in the MLflow Go client's
// own REST path construction, or if the upstream MLflow server itself
// decodes path segments before use).
var percentEncodedPattern = regexp.MustCompile(`%[0-9a-fA-F]{2}`)

// validateMCPPathSegment guards against path-traversal/path-injection
// values in a resource-identifier path segment (a version, tag key, or
// alias) before it reaches the MLflow Go client's own REST path
// construction, which would otherwise surface as a misleading 500 instead
// of a 400.
func validateMCPPathSegment(kind, value string) error {
	if value == "" {
		return fmt.Errorf("%s cannot be empty", kind)
	}
	if value == "." || value == ".." || strings.Contains(value, "/") {
		return fmt.Errorf("invalid %s %q: must not contain \"/\" or be \".\" or \"..\"", kind, value)
	}
	if percentEncodedPattern.MatchString(value) {
		return fmt.Errorf("invalid %s %q: must not contain percent-encoded characters", kind, value)
	}
	return nil
}

// validateMCPEndpointURL requires an absolute http/https URL (mirroring
// the scheme/host validation applied to MLflow CR status.address.url) and
// rejects "localhost" and private/loopback/link-local IP hosts as SSRF
// protection, via the isPrivateIP helper below. DNS resolution of
// arbitrary hostnames is deliberately not performed here, since it would
// make every write depend on network/DNS availability for a URL this BFF
// never dials itself. Embedded userinfo (e.g. "user:token@host") is
// rejected outright, since endpoint_url is logged and credentials
// embedded there would otherwise leak into application logs (CWE-532).
func validateMCPEndpointURL(rawURL string) error {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("invalid endpoint_url %q: must be an absolute http or https URL", rawURL)
	}
	if parsed.User != nil {
		return fmt.Errorf("invalid endpoint_url %q: must not contain userinfo (e.g. \"user:pass@\")", rawURL)
	}
	// A single trailing "." denotes the DNS root and is resolved identically
	// to the name without it (e.g. "localhost." == "localhost"), so it must
	// not be usable to slip past the literal "localhost" comparison below.
	host := strings.TrimSuffix(parsed.Hostname(), ".")
	if strings.EqualFold(host, "localhost") {
		return fmt.Errorf("invalid endpoint_url %q: host %q is not allowed", rawURL, host)
	}
	if ip := net.ParseIP(host); ip != nil && isPrivateIP(ip) {
		return fmt.Errorf("invalid endpoint_url %q: host %q is a private address", rawURL, host)
	}
	return nil
}

var cgnatBlock = &net.IPNet{IP: net.IPv4(100, 64, 0, 0), Mask: net.CIDRMask(10, 32)}

func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsUnspecified() || ip.IsPrivate() || cgnatBlock.Contains(ip) {
		return true
	}
	if compat := ipv4CompatibleIPv6To4(ip); compat != nil {
		return isPrivateIP(compat)
	}
	return false
}

func ipv4CompatibleIPv6To4(ip net.IP) net.IP {
	ip16 := ip.To16()
	if ip16 == nil || ip.To4() != nil {
		return nil
	}
	for _, b := range ip16[:12] {
		if b != 0 {
			return nil
		}
	}
	return net.IP(ip16[12:16])
}

type MCPServersEnvelope = Envelope[models.MCPServersResponse, None]
type MCPServerEnvelope = Envelope[models.MCPServer, None]
type MCPServerVersionsEnvelope = Envelope[models.MCPServerVersionsResponse, None]
type MCPServerVersionEnvelope = Envelope[models.MCPServerVersion, None]
type MCPAccessEndpointsEnvelope = Envelope[models.MCPAccessEndpointsResponse, None]
type MCPAccessEndpointEnvelope = Envelope[models.MCPAccessEndpoint, None]
type MCPTagEnvelope = Envelope[models.SetMCPTagRequest, None]
type MCPRegisterEnvelope = Envelope[models.RegisterMCPServerResult, None]

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
	return app.enforceResourceWritePermission(ctx, w, r, workspace, verb, "mcpservers",
		"insufficient permissions to write to the MCP registry",
		func(k8sClient k8s.KubernetesClientInterface) resourceWriteChecker {
			return k8sClient.CanWriteMCPServersInNamespace
		})
}

// MLflowMCPServerCatchAllGetHandler handles all GET requests under
// MCPServerCatchAllPath ("/mcp-registry/servers/*rest"), dispatching to the
// server, version, alias, or endpoint operation based on the parsed path.
// See parseMCPServerPath for how the catch-all capture is split.
func (app *App) MLflowMCPServerCatchAllGetHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	p, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	switch p.Subresource {
	case mcpSubresourceServer:
		app.mlflowGetMCPServer(w, r, p.Name)
	case mcpSubresourceVersions:
		app.mlflowListMCPServerVersions(w, r, p.Name)
	case mcpSubresourceVersion:
		app.mlflowGetMCPServerVersion(w, r, p.Name, p.Version)
	case mcpSubresourceAlias:
		app.mlflowGetMCPServerVersionByAlias(w, r, p.Name, p.Alias)
	case mcpSubresourceEndpoints:
		app.mlflowSearchMCPAccessEndpoints(w, r, p.Name)
	case mcpSubresourceEndpoint:
		app.mlflowGetMCPAccessEndpoint(w, r, p.Name, p.EndpointID)
	default:
		app.notFoundResponse(w, r)
	}
}

// MLflowMCPServerCatchAllPostHandler handles all POST requests under
// MCPServerCatchAllPath, dispatching to version/endpoint creation or
// tag/alias setting.
func (app *App) MLflowMCPServerCatchAllPostHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	p, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	switch p.Subresource {
	case mcpSubresourceVersions:
		app.mlflowCreateMCPServerVersion(w, r, p.Name)
	case mcpSubresourceEndpoints:
		app.mlflowCreateMCPAccessEndpoint(w, r, p.Name)
	case mcpSubresourceTags:
		app.mlflowSetMCPServerTag(w, r, p.Name)
	case mcpSubresourceAliases:
		app.mlflowSetMCPServerAlias(w, r, p.Name)
	case mcpSubresourceVersionTags:
		app.mlflowSetMCPServerVersionTag(w, r, p.Name, p.Version)
	default:
		app.notFoundResponse(w, r)
	}
}

// MLflowMCPServerCatchAllPatchHandler handles all PATCH requests under
// MCPServerCatchAllPath, dispatching to server, version, or endpoint
// partial updates.
func (app *App) MLflowMCPServerCatchAllPatchHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	p, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	switch p.Subresource {
	case mcpSubresourceServer:
		app.mlflowUpdateMCPServer(w, r, p.Name)
	case mcpSubresourceVersion:
		app.mlflowUpdateMCPServerVersion(w, r, p.Name, p.Version)
	case mcpSubresourceEndpoint:
		app.mlflowUpdateMCPAccessEndpoint(w, r, p.Name, p.EndpointID)
	default:
		app.notFoundResponse(w, r)
	}
}

// MLflowMCPServerCatchAllDeleteHandler handles all DELETE requests under
// MCPServerCatchAllPath, dispatching to server, version, tag, alias, or
// access-endpoint deletion.
func (app *App) MLflowMCPServerCatchAllDeleteHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	p, err := parseMCPServerPath(ps.ByName("rest"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	switch p.Subresource {
	case mcpSubresourceServer:
		app.mlflowDeleteMCPServer(w, r, p.Name)
	case mcpSubresourceVersion:
		app.mlflowDeleteMCPServerVersion(w, r, p.Name, p.Version)
	case mcpSubresourceVersionTag:
		app.mlflowDeleteMCPServerVersionTag(w, r, p.Name, p.Version, p.Key)
	case mcpSubresourceTag:
		app.mlflowDeleteMCPServerTag(w, r, p.Name, p.Key)
	case mcpSubresourceAlias:
		app.mlflowDeleteMCPServerAlias(w, r, p.Name, p.Alias)
	case mcpSubresourceEndpoint:
		app.mlflowDeleteMCPAccessEndpoint(w, r, p.Name, p.EndpointID)
	default:
		app.notFoundResponse(w, r)
	}
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

// mlflowUpdateMCPServer handles PATCH /api/v1/mcp-registry/servers/:name
// (routed via MLflowMCPServerCatchAllPatchHandler).
func (app *App) mlflowUpdateMCPServer(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	var req models.UpdateMCPServerRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "update") {
		return
	}

	app.logger.Debug("updating MCP server",
		slog.String("workspace", workspace),
		slog.String("name", name))

	result, err := app.repositories.MCPRegistry.UpdateServer(ctx, name, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("UpdateServer returned nil for %q", name))
		return
	}

	response := MCPServerEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowDeleteMCPServer handles DELETE /api/v1/mcp-registry/servers/:name
// (routed via MLflowMCPServerCatchAllDeleteHandler).
func (app *App) mlflowDeleteMCPServer(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	app.logger.Debug("deleting MCP server",
		slog.String("workspace", workspace),
		slog.String("name", name))

	if err := app.repositories.MCPRegistry.DeleteServer(ctx, name); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// mlflowSetMCPServerTag handles POST /api/v1/mcp-registry/servers/:name/tags
// (routed via MLflowMCPServerCatchAllPostHandler).
func (app *App) mlflowSetMCPServerTag(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	var req models.SetMCPTagRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if req.Key == "" {
		app.badRequestResponse(w, r, errors.New("key is required"))
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "update") {
		return
	}

	app.logger.Debug("setting MCP server tag",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("key", req.Key))

	if err := app.repositories.MCPRegistry.SetServerTag(ctx, name, req); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MCPTagEnvelope{Data: req}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowDeleteMCPServerTag handles DELETE /api/v1/mcp-registry/servers/:name/tags/:key
// (routed via MLflowMCPServerCatchAllDeleteHandler).
func (app *App) mlflowDeleteMCPServerTag(w http.ResponseWriter, r *http.Request, name, key string) {
	ctx := r.Context()

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	app.logger.Debug("deleting MCP server tag",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("key", key))

	if err := app.repositories.MCPRegistry.DeleteServerTag(ctx, name, key); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// mlflowSetMCPServerAlias handles POST /api/v1/mcp-registry/servers/:name/aliases
// (routed via MLflowMCPServerCatchAllPostHandler).
func (app *App) mlflowSetMCPServerAlias(w http.ResponseWriter, r *http.Request, name string) {
	ctx := r.Context()

	var req models.SetMCPAliasRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if req.Alias == "" {
		app.badRequestResponse(w, r, errors.New("alias is required"))
		return
	}
	if req.Version == "" {
		app.badRequestResponse(w, r, errors.New("version is required"))
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "update") {
		return
	}

	app.logger.Debug("setting MCP server alias",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("alias", req.Alias),
		slog.String("version", req.Version))

	if err := app.repositories.MCPRegistry.SetServerAlias(ctx, name, req); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// mlflowGetMCPServerVersionByAlias handles GET /api/v1/mcp-registry/servers/:name/aliases/:alias
// (routed via MLflowMCPServerCatchAllGetHandler).
func (app *App) mlflowGetMCPServerVersionByAlias(w http.ResponseWriter, r *http.Request, name, alias string) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	app.logger.Debug("getting MCP server version by alias",
		slog.String("name", name),
		slog.String("alias", alias))

	result, err := app.repositories.MCPRegistry.GetServerVersionByAlias(ctx, name, alias)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("GetServerVersionByAlias returned nil for %q/%q", name, alias))
		return
	}

	response := MCPServerVersionEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowDeleteMCPServerAlias handles DELETE /api/v1/mcp-registry/servers/:name/aliases/:alias
// (routed via MLflowMCPServerCatchAllDeleteHandler).
func (app *App) mlflowDeleteMCPServerAlias(w http.ResponseWriter, r *http.Request, name, alias string) {
	ctx := r.Context()

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	app.logger.Debug("deleting MCP server alias",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("alias", alias))

	if err := app.repositories.MCPRegistry.DeleteServerAlias(ctx, name, alias); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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

	if err := validateMCPServerJSON(req.ServerJSON, name); err != nil {
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
		"Location": {mcpServerVersionLocation(name, result.Version, workspace)},
	}
	if err := app.WriteJSON(w, http.StatusCreated, response, headers); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowGetMCPServerVersion handles GET /api/v1/mcp-registry/servers/:name/versions/:version
// (routed via MLflowMCPServerCatchAllGetHandler).
func (app *App) mlflowGetMCPServerVersion(w http.ResponseWriter, r *http.Request, name, version string) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	app.logger.Debug("getting MCP server version",
		slog.String("name", name),
		slog.String("version", version))

	result, err := app.repositories.MCPRegistry.GetServerVersion(ctx, name, version)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("GetServerVersion returned nil for %q/%q", name, version))
		return
	}

	response := MCPServerVersionEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowUpdateMCPServerVersion handles PATCH /api/v1/mcp-registry/servers/:name/versions/:version
// (routed via MLflowMCPServerCatchAllPatchHandler).
func (app *App) mlflowUpdateMCPServerVersion(w http.ResponseWriter, r *http.Request, name, version string) {
	ctx := r.Context()

	var req models.UpdateMCPServerVersionRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "update") {
		return
	}

	app.logger.Debug("updating MCP server version",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("version", version))

	result, err := app.repositories.MCPRegistry.UpdateServerVersion(ctx, name, version, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("UpdateServerVersion returned nil for %q/%q", name, version))
		return
	}

	response := MCPServerVersionEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowDeleteMCPServerVersion handles DELETE /api/v1/mcp-registry/servers/:name/versions/:version
// (routed via MLflowMCPServerCatchAllDeleteHandler).
func (app *App) mlflowDeleteMCPServerVersion(w http.ResponseWriter, r *http.Request, name, version string) {
	ctx := r.Context()

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	app.logger.Debug("deleting MCP server version",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("version", version))

	if err := app.repositories.MCPRegistry.DeleteServerVersion(ctx, name, version); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// mlflowSetMCPServerVersionTag handles POST /api/v1/mcp-registry/servers/:name/versions/:version/tags
// (routed via MLflowMCPServerCatchAllPostHandler).
func (app *App) mlflowSetMCPServerVersionTag(w http.ResponseWriter, r *http.Request, name, version string) {
	ctx := r.Context()

	var req models.SetMCPTagRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if req.Key == "" {
		app.badRequestResponse(w, r, errors.New("key is required"))
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "update") {
		return
	}

	app.logger.Debug("setting MCP server version tag",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("version", version),
		slog.String("key", req.Key))

	if err := app.repositories.MCPRegistry.SetServerVersionTag(ctx, name, version, req); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	response := MCPTagEnvelope{Data: req}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowDeleteMCPServerVersionTag handles DELETE /api/v1/mcp-registry/servers/:name/versions/:version/tags/:key
// (routed via MLflowMCPServerCatchAllDeleteHandler).
func (app *App) mlflowDeleteMCPServerVersionTag(w http.ResponseWriter, r *http.Request, name, version, key string) {
	ctx := r.Context()

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "delete") {
		return
	}

	app.logger.Debug("deleting MCP server version tag",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("version", version),
		slog.String("key", key))

	if err := app.repositories.MCPRegistry.DeleteServerVersionTag(ctx, name, version, key); err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
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
		slog.String("endpoint_url", sanitizeURL(req.EndpointURL)))

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

// mlflowGetMCPAccessEndpoint handles GET /api/v1/mcp-registry/servers/:name/endpoints/:endpointId
// (routed via MLflowMCPServerCatchAllGetHandler).
func (app *App) mlflowGetMCPAccessEndpoint(w http.ResponseWriter, r *http.Request, name, endpointID string) {
	ctx := r.Context()

	if _, ok := app.extractAndValidateWorkspace(ctx, w, r); !ok {
		return
	}

	app.logger.Debug("getting MCP access endpoint",
		slog.String("name", name),
		slog.String("endpoint_id", endpointID))

	result, err := app.repositories.MCPRegistry.GetAccessEndpoint(ctx, name, endpointID)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("GetAccessEndpoint returned nil for %q/%q", name, endpointID))
		return
	}

	response := MCPAccessEndpointEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// mlflowUpdateMCPAccessEndpoint handles PATCH /api/v1/mcp-registry/servers/:name/endpoints/:endpointId
// (routed via MLflowMCPServerCatchAllPatchHandler).
func (app *App) mlflowUpdateMCPAccessEndpoint(w http.ResponseWriter, r *http.Request, name, endpointID string) {
	ctx := r.Context()

	var req models.UpdateMCPAccessEndpointRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.EndpointURL != nil {
		if err := validateMCPEndpointURL(*req.EndpointURL); err != nil {
			app.badRequestResponse(w, r, err)
			return
		}
	}
	if req.ServerVersion != nil && req.ServerAlias != nil && *req.ServerVersion != "" && *req.ServerAlias != "" {
		app.badRequestResponse(w, r, errors.New("server_version and server_alias are mutually exclusive"))
		return
	}

	workspace, ok := app.extractAndValidateWorkspace(ctx, w, r)
	if !ok {
		return
	}

	if !app.enforceMCPWritePermission(ctx, w, r, workspace, "update") {
		return
	}

	app.logger.Debug("updating MCP access endpoint",
		slog.String("workspace", workspace),
		slog.String("name", name),
		slog.String("endpoint_id", endpointID))

	result, err := app.repositories.MCPRegistry.UpdateAccessEndpoint(ctx, name, endpointID, req)
	if err != nil {
		app.handleMLflowClientError(w, r, err)
		return
	}
	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("UpdateAccessEndpoint returned nil for %q/%q", name, endpointID))
		return
	}

	response := MCPAccessEndpointEnvelope{Data: *result}
	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
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
