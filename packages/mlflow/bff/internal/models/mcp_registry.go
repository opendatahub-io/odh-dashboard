package models

import "time"

// MCPServerVersionStatus represents the lifecycle status of an MCP server version.
type MCPServerVersionStatus string

const (
	MCPServerVersionStatusDraft      MCPServerVersionStatus = "draft"
	MCPServerVersionStatusActive     MCPServerVersionStatus = "active"
	MCPServerVersionStatusDeprecated MCPServerVersionStatus = "deprecated"
	MCPServerVersionStatusDeleted    MCPServerVersionStatus = "deleted"
)

// MCPTransportType represents how an MCP access endpoint is reached.
type MCPTransportType string

const (
	MCPTransportStreamableHTTP MCPTransportType = "streamable-http"
	MCPTransportSSE            MCPTransportType = "sse"
)

// MCPTool describes a single tool exposed by an MCP server version.
type MCPTool struct {
	Name         string           `json:"name"`
	Title        string           `json:"title,omitempty"`
	Description  string           `json:"description,omitempty"`
	InputSchema  map[string]any   `json:"input_schema,omitempty"`
	OutputSchema map[string]any   `json:"output_schema,omitempty"`
	Annotations  map[string]any   `json:"annotations,omitempty"`
	Icons        []map[string]any `json:"icons,omitempty"`
	Execution    map[string]any   `json:"execution,omitempty"`
}

// MCPConnectOptionSettings configures how a single connection mode is
// presented to clients when they connect to an MCP server version.
type MCPConnectOptionSettings struct {
	Hidden bool `json:"hidden"`
}

// MCPAccessEndpointSummary is a lightweight view of an access endpoint as
// returned embedded within an MCPServer.
type MCPAccessEndpointSummary struct {
	ID                   string            `json:"id"`
	ServerName           string            `json:"server_name"`
	EndpointURL          string            `json:"endpoint_url"`
	TransportType        MCPTransportType  `json:"transport_type"`
	Workspace            string            `json:"workspace,omitempty"`
	ServerVersion        string            `json:"server_version,omitempty"`
	ServerAlias          string            `json:"server_alias,omitempty"`
	ResolvedVersion      *MCPServerVersion `json:"resolved_version,omitempty"`
	CreatedBy            string            `json:"created_by,omitempty"`
	LastUpdatedBy        string            `json:"last_updated_by,omitempty"`
	CreationTimestamp    time.Time         `json:"creation_timestamp"`
	LastUpdatedTimestamp time.Time         `json:"last_updated_timestamp"`
}

// MCPServer represents an MLflow MCP Registry server entry.
type MCPServer struct {
	Name                 string                     `json:"name"`
	DisplayName          string                     `json:"display_name,omitempty"`
	Description          string                     `json:"description,omitempty"`
	Icons                []map[string]any           `json:"icons,omitempty"`
	Status               string                     `json:"status,omitempty"`
	Workspace            string                     `json:"workspace,omitempty"`
	AccessEndpoints      []MCPAccessEndpointSummary `json:"access_endpoints,omitempty"`
	LatestVersion        string                     `json:"latest_version,omitempty"`
	Aliases              map[string]string          `json:"aliases,omitempty"`
	Tags                 map[string]string          `json:"tags,omitempty"`
	CreatedBy            string                     `json:"created_by,omitempty"`
	LastUpdatedBy        string                     `json:"last_updated_by,omitempty"`
	CreationTimestamp    time.Time                  `json:"creation_timestamp"`
	LastUpdatedTimestamp time.Time                  `json:"last_updated_timestamp"`
}

// MCPServersResponse is the response for searching/listing MCP servers.
type MCPServersResponse struct {
	Servers       []MCPServer `json:"servers"`
	NextPageToken string      `json:"next_page_token,omitempty"`
}

// CreateMCPServerRequest is the request body for registering a new MCP server.
// Note: this does not include the server.json manifest, which is supplied
// separately when creating a server version (see CreateMCPServerVersionRequest).
type CreateMCPServerRequest struct {
	Name        string           `json:"name"`
	Description string           `json:"description,omitempty"`
	Icons       []map[string]any `json:"icons,omitempty"`
}

// MCPServerVersion represents a specific version of an MCP server.
type MCPServerVersion struct {
	Name                 string                              `json:"name"`
	Version              string                              `json:"version"`
	ServerJSON           map[string]any                      `json:"server_json"`
	Status               MCPServerVersionStatus              `json:"status,omitempty"`
	Workspace            string                              `json:"workspace,omitempty"`
	Tools                []MCPTool                           `json:"tools,omitempty"`
	Aliases              []string                            `json:"aliases,omitempty"`
	Tags                 map[string]string                   `json:"tags,omitempty"`
	ConnectOptions       map[string]MCPConnectOptionSettings `json:"connect_options,omitempty"`
	Source               string                              `json:"source,omitempty"`
	CreatedBy            string                              `json:"created_by,omitempty"`
	LastUpdatedBy        string                              `json:"last_updated_by,omitempty"`
	CreationTimestamp    time.Time                           `json:"creation_timestamp"`
	LastUpdatedTimestamp time.Time                           `json:"last_updated_timestamp"`
}

// MCPServerVersionsResponse is the response for listing/searching MCP server versions.
type MCPServerVersionsResponse struct {
	Versions      []MCPServerVersion `json:"versions"`
	NextPageToken string             `json:"next_page_token,omitempty"`
}

// CreateMCPServerVersionRequest is the request body for creating a new MCP
// server version. ServerJSON is the raw MCP server.json manifest describing
// how to run the server (packages, remotes, etc.) and is required. There is
// deliberately no DisplayName field; see the note on MCPServerVersion.
type CreateMCPServerVersionRequest struct {
	ServerJSON     map[string]any                      `json:"server_json"`
	Status         MCPServerVersionStatus              `json:"status,omitempty"`
	Source         string                              `json:"source,omitempty"`
	Tools          []MCPTool                           `json:"tools,omitempty"`
	ConnectOptions map[string]MCPConnectOptionSettings `json:"connect_options,omitempty"`
}

// MCPAccessEndpoint represents a concrete, reachable URL bound to an MCP
// server (optionally pinned to a version or alias).
type MCPAccessEndpoint struct {
	ID                   string            `json:"id"`
	ServerName           string            `json:"server_name"`
	EndpointURL          string            `json:"endpoint_url"`
	TransportType        MCPTransportType  `json:"transport_type"`
	Workspace            string            `json:"workspace,omitempty"`
	Tools                []MCPTool         `json:"tools,omitempty"`
	ServerVersion        string            `json:"server_version,omitempty"`
	ServerAlias          string            `json:"server_alias,omitempty"`
	ResolvedVersion      *MCPServerVersion `json:"resolved_version,omitempty"`
	CreatedBy            string            `json:"created_by,omitempty"`
	LastUpdatedBy        string            `json:"last_updated_by,omitempty"`
	CreationTimestamp    time.Time         `json:"creation_timestamp"`
	LastUpdatedTimestamp time.Time         `json:"last_updated_timestamp"`
}

// MCPAccessEndpointsResponse is the response for searching/listing MCP access endpoints.
type MCPAccessEndpointsResponse struct {
	Endpoints     []MCPAccessEndpoint `json:"endpoints"`
	NextPageToken string              `json:"next_page_token,omitempty"`
}

// CreateMCPAccessEndpointRequest is the request body for creating a new MCP
// access endpoint. ServerVersion and ServerAlias are mutually exclusive.
type CreateMCPAccessEndpointRequest struct {
	EndpointURL   string           `json:"endpoint_url"`
	TransportType MCPTransportType `json:"transport_type,omitempty"`
	ServerVersion string           `json:"server_version,omitempty"`
	ServerAlias   string           `json:"server_alias,omitempty"`
}

// UpdateMCPServerRequest is a partial-update (PATCH) request body for an
// MCP server. Pointer fields distinguish "not provided" (nil, left
// unchanged) from "provided" (updated to the given value, even if
// zero/empty), mirroring the SDK's UpdateMCPServerOption semantics.
type UpdateMCPServerRequest struct {
	DisplayName *string           `json:"display_name,omitempty"`
	Description *string           `json:"description,omitempty"`
	Icons       *[]map[string]any `json:"icons,omitempty"`
}

// UpdateMCPServerVersionRequest is a partial-update (PATCH) request body
// for an MCP server version. Pointer fields distinguish "not provided"
// (nil, left unchanged) from "provided" (updated to the given value, even
// if zero/empty), mirroring the SDK's UpdateMCPServerVersionOption
// semantics.
type UpdateMCPServerVersionRequest struct {
	Status         *MCPServerVersionStatus              `json:"status,omitempty"`
	Tools          *[]MCPTool                           `json:"tools,omitempty"`
	ConnectOptions *map[string]MCPConnectOptionSettings `json:"connect_options,omitempty"`
}

// UpdateMCPAccessEndpointRequest is a partial-update (PATCH) request body
// for an MCP access endpoint. Pointer fields distinguish "not provided"
// (nil, left unchanged) from "provided" (updated to the given value, even
// if zero/empty), mirroring the SDK's UpdateMCPAccessEndpointOption
// semantics. ServerVersion and ServerAlias are mutually exclusive when
// both are provided as non-empty values.
type UpdateMCPAccessEndpointRequest struct {
	EndpointURL   *string           `json:"endpoint_url,omitempty"`
	TransportType *MCPTransportType `json:"transport_type,omitempty"`
	ServerVersion *string           `json:"server_version,omitempty"`
	ServerAlias   *string           `json:"server_alias,omitempty"`
}

// SetMCPTagRequest is the request body for setting a tag on an MCP server
// or a specific MCP server version.
type SetMCPTagRequest struct {
	Key   string `json:"key"`
	Value string `json:"value,omitempty"`
}

// SetMCPAliasRequest is the request body for pointing an alias at a
// specific version of an MCP server.
type SetMCPAliasRequest struct {
	Alias   string `json:"alias"`
	Version string `json:"version"`
}
