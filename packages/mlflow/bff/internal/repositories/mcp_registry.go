package repositories

import (
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"context"

	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	helper "github.com/opendatahub-io/mlflow/bff/internal/helpers"
	"github.com/opendatahub-io/mlflow/bff/internal/models"
)

// ErrInvalidFilter is returned by combineFilters (and thus SearchServers)
// when a filter fragment has unbalanced parentheses. Callers should map it
// to a 400 Bad Request rather than treating it as an upstream MLflow error.
var ErrInvalidFilter = errors.New("filter contains unbalanced parentheses")

// validTagKey allowlists characters MLflow's own tag-name validation
// accepts, preventing identifier injection into the generated search filter.
var validTagKey = regexp.MustCompile(`^[a-zA-Z0-9_/.\- :]+$`)

// MCPRegistryRepository handles MLflow MCP Registry operations and data transformations.
type MCPRegistryRepository struct{}

// NewMCPRegistryRepository creates a new MCP registry repository.
func NewMCPRegistryRepository() *MCPRegistryRepository {
	return &MCPRegistryRepository{}
}

// buildTagFilter converts a "key=value" tag query param into an MLflow
// SQL-like filter fragment, e.g. tags.`key` = 'value'. Returns "" if tag is
// empty, malformed, or the key contains disallowed characters.
func buildTagFilter(tag string) string {
	if tag == "" {
		return ""
	}
	key, value, ok := strings.Cut(tag, "=")
	if !ok || key == "" || !validTagKey.MatchString(key) {
		return ""
	}
	// Escape backslashes before quotes so a value ending in a lone
	// backslash can't leave the string literal open.
	escapedValue := strings.ReplaceAll(value, `\`, `\\`)
	escapedValue = strings.ReplaceAll(escapedValue, "'", "\\'")
	escapedKey := strings.ReplaceAll(key, "`", "``")
	return fmt.Sprintf("tags.`%s` = '%s'", escapedKey, escapedValue)
}

// hasBalancedParens reports whether every ")" in s is matched by a
// preceding "(", which combineFilters requires before wrapping a fragment
// in parens to preserve its precedence.
func hasBalancedParens(s string) bool {
	depth := 0
	for _, r := range s {
		switch r {
		case '(':
			depth++
		case ')':
			depth--
			if depth < 0 {
				return false
			}
		}
	}
	return depth == 0
}

// combineFilters ANDs together non-empty filter fragments, parenthesizing
// each one so a boolean operator inside one fragment can't change
// precedence relative to the other. Returns ErrInvalidFilter if a fragment
// has unbalanced parentheses.
func combineFilters(fragments ...string) (string, error) {
	var nonEmpty []string
	for _, f := range fragments {
		if f == "" {
			continue
		}
		if !hasBalancedParens(f) {
			return "", ErrInvalidFilter
		}
		nonEmpty = append(nonEmpty, "("+f+")")
	}
	return strings.Join(nonEmpty, " AND "), nil
}

// parseMaxResults converts a max_results query string to an int, returning
// (n, true) when the value is a valid positive integer, or (0, false) when it
// is empty, non-numeric, or non-positive (silently ignored, matching the
// upstream MLflow behavior for malformed pagination hints).
func parseMaxResults(s string) (int, bool) {
	if s == "" {
		return 0, false
	}
	n, err := strconv.Atoi(s)
	if err != nil || n <= 0 {
		return 0, false
	}
	return n, true
}

// SearchServers returns a paginated list of MCP servers, optionally filtered by tag.
func (r *MCPRegistryRepository) SearchServers(ctx context.Context, filter, tag, pageToken, maxResults string) (*models.MCPServersResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.SearchMCPServersOption
	combined, err := combineFilters(filter, buildTagFilter(tag))
	if err != nil {
		return nil, err
	}
	if combined != "" {
		opts = append(opts, mcpregistry.WithServersFilter(combined))
	}
	if pageToken != "" {
		opts = append(opts, mcpregistry.WithServersPageToken(pageToken))
	}
	if n, ok := parseMaxResults(maxResults); ok {
		opts = append(opts, mcpregistry.WithServersMaxResults(n))
	}

	result, err := client.SearchMCPServers(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("searching MCP servers: %w", err)
	}

	servers := make([]models.MCPServer, len(result.Servers))
	for i, s := range result.Servers {
		servers[i] = toMCPServer(&s)
	}

	return &models.MCPServersResponse{
		Servers:       servers,
		NextPageToken: result.NextPageToken,
	}, nil
}

// CreateServer registers a new MCP server entry.
func (r *MCPRegistryRepository) CreateServer(ctx context.Context, req models.CreateMCPServerRequest) (*models.MCPServer, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.CreateMCPServerOption
	if req.Description != "" {
		opts = append(opts, mcpregistry.WithServerDescription(req.Description))
	}
	if len(req.Icons) > 0 {
		opts = append(opts, mcpregistry.WithServerIcons(req.Icons))
	}

	server, err := client.CreateMCPServer(ctx, req.Name, opts...)
	if err != nil {
		return nil, fmt.Errorf("creating MCP server %q: %w", req.Name, err)
	}

	result := toMCPServer(server)
	return &result, nil
}

// GetServer retrieves a single MCP server by name.
func (r *MCPRegistryRepository) GetServer(ctx context.Context, name string) (*models.MCPServer, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	server, err := client.GetMCPServer(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("getting MCP server %q: %w", name, err)
	}

	result := toMCPServer(server)
	return &result, nil
}

// ListServerVersions returns a paginated list of versions for a named MCP server.
func (r *MCPRegistryRepository) ListServerVersions(ctx context.Context, name, pageToken, maxResults string) (*models.MCPServerVersionsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.SearchMCPServerVersionsOption
	if pageToken != "" {
		opts = append(opts, mcpregistry.WithVersionsPageToken(pageToken))
	}
	if n, ok := parseMaxResults(maxResults); ok {
		opts = append(opts, mcpregistry.WithVersionsMaxResults(n))
	}

	result, err := client.SearchMCPServerVersions(ctx, name, opts...)
	if err != nil {
		return nil, fmt.Errorf("listing versions for MCP server %q: %w", name, err)
	}

	versions := make([]models.MCPServerVersion, len(result.Versions))
	for i, v := range result.Versions {
		versions[i] = toMCPServerVersion(&v)
	}

	return &models.MCPServerVersionsResponse{
		Versions:      versions,
		NextPageToken: result.NextPageToken,
	}, nil
}

// CreateServerVersion creates a new version of an MCP server from a server.json document.
func (r *MCPRegistryRepository) CreateServerVersion(ctx context.Context, name string, req models.CreateMCPServerVersionRequest) (*models.MCPServerVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.CreateMCPServerVersionOption
	if req.DisplayName != "" {
		opts = append(opts, mcpregistry.WithVersionDisplayName(req.DisplayName))
	}
	if req.Status != "" {
		opts = append(opts, mcpregistry.WithVersionStatus(mcpregistry.MCPServerVersionStatus(req.Status)))
	}
	if req.Source != "" {
		opts = append(opts, mcpregistry.WithVersionSource(req.Source))
	}
	if len(req.Tools) > 0 {
		opts = append(opts, mcpregistry.WithVersionTools(fromMCPTools(req.Tools)))
	}
	if len(req.ConnectOptions) > 0 {
		opts = append(opts, mcpregistry.WithVersionConnectOptions(fromConnectOptions(req.ConnectOptions)))
	}

	version, err := client.CreateMCPServerVersion(ctx, name, req.ServerJSON, opts...)
	if err != nil {
		return nil, fmt.Errorf("creating version for MCP server %q: %w", name, err)
	}

	result := toMCPServerVersion(version)
	return &result, nil
}

// CreateAccessEndpoint creates a new access endpoint for an MCP server.
func (r *MCPRegistryRepository) CreateAccessEndpoint(ctx context.Context, serverName string, req models.CreateMCPAccessEndpointRequest) (*models.MCPAccessEndpoint, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.CreateMCPAccessEndpointOption
	if req.TransportType != "" {
		opts = append(opts, mcpregistry.WithAccessEndpointTransportType(mcpregistry.MCPTransportType(req.TransportType)))
	}
	if req.ServerVersion != "" {
		opts = append(opts, mcpregistry.WithAccessEndpointServerVersion(req.ServerVersion))
	}
	if req.ServerAlias != "" {
		opts = append(opts, mcpregistry.WithAccessEndpointServerAlias(req.ServerAlias))
	}

	endpoint, err := client.CreateMCPAccessEndpoint(ctx, serverName, req.EndpointURL, opts...)
	if err != nil {
		return nil, fmt.Errorf("creating access endpoint for MCP server %q: %w", serverName, err)
	}

	result := toMCPAccessEndpoint(endpoint)
	return &result, nil
}

// SearchAccessEndpoints returns a paginated list of access endpoints for a named MCP server.
func (r *MCPRegistryRepository) SearchAccessEndpoints(ctx context.Context, serverName, pageToken, maxResults string) (*models.MCPAccessEndpointsResponse, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	opts := []mcpregistry.SearchMCPAccessEndpointsOption{
		mcpregistry.WithAccessEndpointsServerName(serverName),
	}
	if pageToken != "" {
		opts = append(opts, mcpregistry.WithAccessEndpointsPageToken(pageToken))
	}
	if n, ok := parseMaxResults(maxResults); ok {
		opts = append(opts, mcpregistry.WithAccessEndpointsMaxResults(n))
	}

	result, err := client.SearchMCPAccessEndpoints(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("searching access endpoints for MCP server %q: %w", serverName, err)
	}

	endpoints := make([]models.MCPAccessEndpoint, len(result.Endpoints))
	for i, e := range result.Endpoints {
		endpoints[i] = toMCPAccessEndpoint(&e)
	}

	return &models.MCPAccessEndpointsResponse{
		Endpoints:     endpoints,
		NextPageToken: result.NextPageToken,
	}, nil
}

// DeleteAccessEndpoint removes an access endpoint from an MCP server.
func (r *MCPRegistryRepository) DeleteAccessEndpoint(ctx context.Context, serverName, endpointID string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeleteMCPAccessEndpoint(ctx, serverName, endpointID); err != nil {
		return fmt.Errorf("deleting access endpoint %q for MCP server %q: %w", endpointID, serverName, err)
	}
	return nil
}

func toMCPServer(s *mcpregistry.MCPServer) models.MCPServer {
	var endpoints []models.MCPAccessEndpointSummary
	if len(s.AccessEndpoints) > 0 {
		endpoints = make([]models.MCPAccessEndpointSummary, len(s.AccessEndpoints))
		for i, e := range s.AccessEndpoints {
			endpoints[i] = models.MCPAccessEndpointSummary{
				ID:                   e.ID,
				ServerName:           e.ServerName,
				EndpointURL:          e.EndpointURL,
				TransportType:        models.MCPTransportType(e.TransportType),
				Workspace:            e.Workspace,
				ServerVersion:        e.ServerVersion,
				ServerAlias:          e.ServerAlias,
				CreatedBy:            e.CreatedBy,
				LastUpdatedBy:        e.LastUpdatedBy,
				CreationTimestamp:    e.CreationTimestamp,
				LastUpdatedTimestamp: e.LastUpdatedTimestamp,
			}
		}
	}

	return models.MCPServer{
		Name:                 s.Name,
		DisplayName:          s.DisplayName,
		Description:          s.Description,
		Icons:                s.Icons,
		Status:               s.Status,
		Workspace:            s.Workspace,
		AccessEndpoints:      endpoints,
		LatestVersion:        s.LatestVersion,
		Aliases:              s.Aliases,
		Tags:                 s.Tags,
		CreatedBy:            s.CreatedBy,
		LastUpdatedBy:        s.LastUpdatedBy,
		CreationTimestamp:    s.CreationTimestamp,
		LastUpdatedTimestamp: s.LastUpdatedTimestamp,
	}
}

func toMCPServerVersion(v *mcpregistry.MCPServerVersion) models.MCPServerVersion {
	return models.MCPServerVersion{
		Name:                 v.Name,
		Version:              v.Version,
		ServerJSON:           v.ServerJSON,
		DisplayName:          v.DisplayName,
		Status:               models.MCPServerVersionStatus(v.Status),
		Workspace:            v.Workspace,
		Tools:                toMCPTools(v.Tools),
		Aliases:              v.Aliases,
		Tags:                 v.Tags,
		ConnectOptions:       toConnectOptions(v.ConnectOptions),
		Source:               v.Source,
		CreatedBy:            v.CreatedBy,
		LastUpdatedBy:        v.LastUpdatedBy,
		CreationTimestamp:    v.CreationTimestamp,
		LastUpdatedTimestamp: v.LastUpdatedTimestamp,
	}
}

func toMCPAccessEndpoint(e *mcpregistry.MCPAccessEndpoint) models.MCPAccessEndpoint {
	return models.MCPAccessEndpoint{
		ID:                   e.ID,
		ServerName:           e.ServerName,
		EndpointURL:          e.EndpointURL,
		TransportType:        models.MCPTransportType(e.TransportType),
		Workspace:            e.Workspace,
		Tools:                toMCPTools(e.Tools),
		ServerVersion:        e.ServerVersion,
		ServerAlias:          e.ServerAlias,
		CreatedBy:            e.CreatedBy,
		LastUpdatedBy:        e.LastUpdatedBy,
		CreationTimestamp:    e.CreationTimestamp,
		LastUpdatedTimestamp: e.LastUpdatedTimestamp,
	}
}

func toMCPTools(tools []mcpregistry.MCPTool) []models.MCPTool {
	if len(tools) == 0 {
		return nil
	}
	result := make([]models.MCPTool, len(tools))
	for i, t := range tools {
		result[i] = models.MCPTool{
			Name:         t.Name,
			Title:        t.Title,
			Description:  t.Description,
			InputSchema:  t.InputSchema,
			OutputSchema: t.OutputSchema,
			Annotations:  t.Annotations,
			Icons:        t.Icons,
			Execution:    t.Execution,
		}
	}
	return result
}

func fromMCPTools(tools []models.MCPTool) []mcpregistry.MCPTool {
	if len(tools) == 0 {
		return nil
	}
	result := make([]mcpregistry.MCPTool, len(tools))
	for i, t := range tools {
		result[i] = mcpregistry.MCPTool{
			Name:         t.Name,
			Title:        t.Title,
			Description:  t.Description,
			InputSchema:  t.InputSchema,
			OutputSchema: t.OutputSchema,
			Annotations:  t.Annotations,
			Icons:        t.Icons,
			Execution:    t.Execution,
		}
	}
	return result
}

func toConnectOptions(opts map[string]mcpregistry.ConnectOptionSettings) map[string]models.MCPConnectOptionSettings {
	if len(opts) == 0 {
		return nil
	}
	result := make(map[string]models.MCPConnectOptionSettings, len(opts))
	for k, v := range opts {
		result[k] = models.MCPConnectOptionSettings{Hidden: v.Hidden}
	}
	return result
}

func fromConnectOptions(opts map[string]models.MCPConnectOptionSettings) map[string]mcpregistry.ConnectOptionSettings {
	if len(opts) == 0 {
		return nil
	}
	result := make(map[string]mcpregistry.ConnectOptionSettings, len(opts))
	for k, v := range opts {
		result[k] = mcpregistry.ConnectOptionSettings{Hidden: v.Hidden}
	}
	return result
}
