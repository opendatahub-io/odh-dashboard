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

// ErrInvalidFilter is returned by buildTagFilter (malformed/disallowed tag)
// and combineFilters (unbalanced parentheses). Callers should map it to a
// 400 Bad Request rather than treating it as an upstream MLflow error.
var ErrInvalidFilter = errors.New("invalid search filter")

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
func buildTagFilter(tag string) (string, error) {
	if tag == "" {
		return "", nil
	}
	key, value, ok := strings.Cut(tag, "=")
	if !ok || key == "" || !validTagKey.MatchString(key) {
		return "", fmt.Errorf("%w: malformed or disallowed tag %q", ErrInvalidFilter, tag)
	}
	// Escape backslashes before quotes so a value ending in a lone
	// backslash can't leave the string literal open.
	escapedValue := strings.ReplaceAll(value, `\`, `\\`)
	escapedValue = strings.ReplaceAll(escapedValue, "'", "\\'")
	escapedKey := strings.ReplaceAll(key, "`", "``")
	return fmt.Sprintf("tags.`%s` = '%s'", escapedKey, escapedValue), nil
}

// hasBalancedParens reports whether every ")" in s is matched by a
// preceding "(". Parens inside a quoted string literal (single or double
// quotes) don't count, so a tag value like "see(details" isn't falsely
// rejected.
func hasBalancedParens(s string) bool {
	depth := 0
	var quote byte
	for i := 0; i < len(s); i++ {
		b := s[i]
		if quote != 0 {
			switch b {
			case '\\':
				i++
			case quote:
				quote = 0
			}
			continue
		}
		switch b {
		case '\'', '"':
			quote = b
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
	nonEmpty := make([]string, 0, len(fragments))
	for _, f := range fragments {
		if f == "" {
			continue
		}
		if !hasBalancedParens(f) {
			return "", fmt.Errorf("%w: unbalanced parentheses in filter fragment %q", ErrInvalidFilter, f)
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
	tagFilter, err := buildTagFilter(tag)
	if err != nil {
		return nil, err
	}
	combined, err := combineFilters(filter, tagFilter)
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
	if result == nil {
		return nil, fmt.Errorf("SearchMCPServers returned nil result")
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
	if server == nil {
		return nil, fmt.Errorf("CreateMCPServer returned nil for %q", req.Name)
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
	if server == nil {
		return nil, fmt.Errorf("GetMCPServer returned nil for %q", name)
	}

	result := toMCPServer(server)
	return &result, nil
}

// UpdateServer applies a partial update to an MCP server. Only fields set
// (non-nil) on req are modified; omitted fields are left unchanged
// server-side.
func (r *MCPRegistryRepository) UpdateServer(ctx context.Context, name string, req models.UpdateMCPServerRequest) (*models.MCPServer, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.UpdateMCPServerOption
	if req.DisplayName != nil {
		opts = append(opts, mcpregistry.WithUpdatedServerDisplayName(*req.DisplayName))
	}
	if req.Description != nil {
		opts = append(opts, mcpregistry.WithUpdatedServerDescription(*req.Description))
	}
	if req.Icons != nil {
		opts = append(opts, mcpregistry.WithUpdatedServerIcons(*req.Icons))
	}

	if _, err := client.UpdateMCPServer(ctx, name, opts...); err != nil {
		return nil, fmt.Errorf("updating MCP server %q: %w", name, err)
	}

	// MLflow PATCH/GET may return sparse bodies; re-fetch then overlay fields
	// we just asked to update so callers see the new values.
	result, err := r.GetServer(ctx, name)
	if err != nil {
		return nil, err
	}
	applyMCPServerUpdate(result, req)
	return result, nil
}

func applyMCPServerUpdate(server *models.MCPServer, req models.UpdateMCPServerRequest) {
	if req.DisplayName != nil {
		server.DisplayName = *req.DisplayName
	}
	if req.Description != nil {
		server.Description = *req.Description
	}
	if req.Icons != nil {
		server.Icons = *req.Icons
	}
}

// DeleteServer removes an MCP server and all of its versions, access
// endpoints, aliases, and tags.
func (r *MCPRegistryRepository) DeleteServer(ctx context.Context, name string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeleteMCPServer(ctx, name); err != nil {
		return fmt.Errorf("deleting MCP server %q: %w", name, err)
	}
	return nil
}

func (r *MCPRegistryRepository) SetServerTag(ctx context.Context, name string, req models.SetMCPTagRequest) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.SetMCPServerTag(ctx, name, req.Key, req.Value); err != nil {
		return fmt.Errorf("setting tag %q on MCP server %q: %w", req.Key, name, err)
	}
	return nil
}

func (r *MCPRegistryRepository) DeleteServerTag(ctx context.Context, name, key string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeleteMCPServerTag(ctx, name, key); err != nil {
		return fmt.Errorf("deleting tag %q from MCP server %q: %w", key, name, err)
	}
	return nil
}

func (r *MCPRegistryRepository) SetServerAlias(ctx context.Context, name string, req models.SetMCPAliasRequest) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.SetMCPServerAlias(ctx, name, req.Alias, req.Version); err != nil {
		return fmt.Errorf("setting alias %q on MCP server %q: %w", req.Alias, name, err)
	}
	return nil
}

func (r *MCPRegistryRepository) GetServerVersionByAlias(ctx context.Context, name, alias string) (*models.MCPServerVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	version, err := client.GetMCPServerVersionByAlias(ctx, name, alias)
	if err != nil {
		return nil, fmt.Errorf("getting version by alias %q for MCP server %q: %w", alias, name, err)
	}
	if version == nil {
		return nil, fmt.Errorf("GetMCPServerVersionByAlias returned nil for %q", alias)
	}

	result := toMCPServerVersion(version)
	return &result, nil
}

func (r *MCPRegistryRepository) DeleteServerAlias(ctx context.Context, name, alias string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeleteMCPServerAlias(ctx, name, alias); err != nil {
		return fmt.Errorf("deleting alias %q from MCP server %q: %w", alias, name, err)
	}
	return nil
}

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
	if result == nil {
		return nil, fmt.Errorf("SearchMCPServerVersions returned nil result")
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

func (r *MCPRegistryRepository) CreateServerVersion(ctx context.Context, name string, req models.CreateMCPServerVersionRequest) (*models.MCPServerVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.CreateMCPServerVersionOption
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

	version, err := client.CreateMCPServerVersion(ctx, name, req.ServerJSON.AsMap(), opts...)
	if err != nil {
		return nil, fmt.Errorf("creating version for MCP server %q: %w", name, err)
	}
	if version == nil {
		return nil, fmt.Errorf("CreateMCPServerVersion returned nil for %q", name)
	}

	result := toMCPServerVersion(version)
	return &result, nil
}

func (r *MCPRegistryRepository) GetServerVersion(ctx context.Context, name, version string) (*models.MCPServerVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	v, err := client.GetMCPServerVersion(ctx, name, version)
	if err != nil {
		return nil, fmt.Errorf("getting version %q for MCP server %q: %w", version, name, err)
	}
	if v == nil {
		return nil, fmt.Errorf("GetMCPServerVersion returned nil for %q", version)
	}

	result := toMCPServerVersion(v)
	return &result, nil
}

// UpdateServerVersion applies a partial update to a specific version of an
// MCP server. Only fields set (non-nil) on req are modified; omitted
// fields are left unchanged server-side.
func (r *MCPRegistryRepository) UpdateServerVersion(ctx context.Context, name, version string, req models.UpdateMCPServerVersionRequest) (*models.MCPServerVersion, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.UpdateMCPServerVersionOption
	if req.Status != nil {
		opts = append(opts, mcpregistry.WithUpdatedVersionStatus(mcpregistry.MCPServerVersionStatus(*req.Status)))
	}
	if req.Tools != nil {
		opts = append(opts, mcpregistry.WithUpdatedVersionTools(fromMCPTools(*req.Tools)))
	}
	if req.ConnectOptions != nil {
		opts = append(opts, mcpregistry.WithUpdatedVersionConnectOptions(fromConnectOptions(*req.ConnectOptions)))
	}

	v, err := client.UpdateMCPServerVersion(ctx, name, version, opts...)
	if err != nil {
		return nil, fmt.Errorf("updating version %q for MCP server %q: %w", version, name, err)
	}
	if v == nil {
		return nil, fmt.Errorf("UpdateMCPServerVersion returned nil for version %q of %q", version, name)
	}

	result := toMCPServerVersion(v)
	return &result, nil
}

func (r *MCPRegistryRepository) DeleteServerVersion(ctx context.Context, name, version string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeleteMCPServerVersion(ctx, name, version); err != nil {
		return fmt.Errorf("deleting version %q for MCP server %q: %w", version, name, err)
	}
	return nil
}

func (r *MCPRegistryRepository) SetServerVersionTag(ctx context.Context, name, version string, req models.SetMCPTagRequest) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.SetMCPServerVersionTag(ctx, name, version, req.Key, req.Value); err != nil {
		return fmt.Errorf("setting tag %q on version %q of MCP server %q: %w", req.Key, version, name, err)
	}
	return nil
}

func (r *MCPRegistryRepository) DeleteServerVersionTag(ctx context.Context, name, version, key string) error {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return err
	}
	if err := client.DeleteMCPServerVersionTag(ctx, name, version, key); err != nil {
		return fmt.Errorf("deleting tag %q from version %q of MCP server %q: %w", key, version, name, err)
	}
	return nil
}

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
	if endpoint == nil {
		return nil, fmt.Errorf("CreateMCPAccessEndpoint returned nil for %q", serverName)
	}

	result := toMCPAccessEndpoint(endpoint)
	return &result, nil
}

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
	if result == nil {
		return nil, fmt.Errorf("SearchMCPAccessEndpoints returned nil result")
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

func (r *MCPRegistryRepository) GetAccessEndpoint(ctx context.Context, serverName, endpointID string) (*models.MCPAccessEndpoint, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	endpoint, err := client.GetMCPAccessEndpoint(ctx, serverName, endpointID)
	if err != nil {
		return nil, fmt.Errorf("getting access endpoint %q for MCP server %q: %w", endpointID, serverName, err)
	}
	if endpoint == nil {
		return nil, fmt.Errorf("GetMCPAccessEndpoint returned nil for %q", endpointID)
	}

	result := toMCPAccessEndpoint(endpoint)
	return &result, nil
}

// UpdateAccessEndpoint applies a partial update to an access endpoint. Only
// fields set (non-nil) on req are modified; omitted fields are left
// unchanged server-side.
func (r *MCPRegistryRepository) UpdateAccessEndpoint(ctx context.Context, serverName, endpointID string, req models.UpdateMCPAccessEndpointRequest) (*models.MCPAccessEndpoint, error) {
	client, err := helper.GetContextMLflowClient(ctx)
	if err != nil {
		return nil, err
	}

	var opts []mcpregistry.UpdateMCPAccessEndpointOption
	if req.EndpointURL != nil {
		opts = append(opts, mcpregistry.WithUpdatedEndpointURL(*req.EndpointURL))
	}
	if req.TransportType != nil {
		opts = append(opts, mcpregistry.WithUpdatedEndpointTransportType(mcpregistry.MCPTransportType(*req.TransportType)))
	}
	if req.ServerVersion != nil {
		opts = append(opts, mcpregistry.WithUpdatedEndpointServerVersion(*req.ServerVersion))
	}
	if req.ServerAlias != nil {
		opts = append(opts, mcpregistry.WithUpdatedEndpointServerAlias(*req.ServerAlias))
	}

	if _, err := client.UpdateMCPAccessEndpoint(ctx, serverName, endpointID, opts...); err != nil {
		return nil, fmt.Errorf("updating access endpoint %q for MCP server %q: %w", endpointID, serverName, err)
	}

	// MLflow PATCH/GET may return sparse bodies; re-fetch then overlay fields
	// we just asked to update so callers see the new values.
	result, err := r.GetAccessEndpoint(ctx, serverName, endpointID)
	if err != nil {
		return nil, err
	}
	applyMCPAccessEndpointUpdate(result, req)
	return result, nil
}

func applyMCPAccessEndpointUpdate(endpoint *models.MCPAccessEndpoint, req models.UpdateMCPAccessEndpointRequest) {
	if req.EndpointURL != nil {
		endpoint.EndpointURL = *req.EndpointURL
	}
	if req.TransportType != nil {
		endpoint.TransportType = *req.TransportType
	}
	if req.ServerVersion != nil {
		endpoint.ServerVersion = *req.ServerVersion
	}
	if req.ServerAlias != nil {
		endpoint.ServerAlias = *req.ServerAlias
	}
}

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

func toMCPAccessEndpointSummary(e *mcpregistry.MCPAccessEndpointSummary) models.MCPAccessEndpointSummary {
	return models.MCPAccessEndpointSummary{
		ID:                   e.ID,
		ServerName:           e.ServerName,
		EndpointURL:          e.EndpointURL,
		TransportType:        models.MCPTransportType(e.TransportType),
		Workspace:            e.Workspace,
		ServerVersion:        e.ServerVersion,
		ServerAlias:          e.ServerAlias,
		ResolvedVersion:      toMCPServerVersionPtr(e.ResolvedVersion),
		CreatedBy:            e.CreatedBy,
		LastUpdatedBy:        e.LastUpdatedBy,
		CreationTimestamp:    e.CreationTimestamp,
		LastUpdatedTimestamp: e.LastUpdatedTimestamp,
	}
}

func toMCPServer(s *mcpregistry.MCPServer) models.MCPServer {
	var endpoints []models.MCPAccessEndpointSummary
	if len(s.AccessEndpoints) > 0 {
		endpoints = make([]models.MCPAccessEndpointSummary, len(s.AccessEndpoints))
		for i := range s.AccessEndpoints {
			endpoints[i] = toMCPAccessEndpointSummary(&s.AccessEndpoints[i])
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
		ResolvedVersion:      toMCPServerVersionPtr(e.ResolvedVersion),
		CreatedBy:            e.CreatedBy,
		LastUpdatedBy:        e.LastUpdatedBy,
		CreationTimestamp:    e.CreationTimestamp,
		LastUpdatedTimestamp: e.LastUpdatedTimestamp,
	}
}

func toMCPServerVersionPtr(v *mcpregistry.MCPServerVersion) *models.MCPServerVersion {
	if v == nil {
		return nil
	}
	result := toMCPServerVersion(v)
	return &result
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
