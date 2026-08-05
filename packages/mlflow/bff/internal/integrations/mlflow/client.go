package mlflow

import (
	"context"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
)

// ClientInterface defines the operations available on the MLflow client.
type ClientInterface interface {
	// Tracking
	SearchExperiments(ctx context.Context, opts ...tracking.SearchExperimentsOption) (*tracking.ExperimentList, error)

	// Prompt Registry
	ListPrompts(ctx context.Context, opts ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error)
	RegisterPrompt(ctx context.Context, name, template string, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error)
	RegisterChatPrompt(ctx context.Context, name string, messages []promptregistry.ChatMessage, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error)
	LoadPrompt(ctx context.Context, name string, opts ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error)
	ListPromptVersions(ctx context.Context, name string, opts ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error)
	DeletePrompt(ctx context.Context, name string) error
	DeletePromptVersion(ctx context.Context, name string, version int) error

	// MCP Registry
	SearchMCPServers(ctx context.Context, opts ...mcpregistry.SearchMCPServersOption) (*mcpregistry.MCPServerList, error)
	CreateMCPServer(ctx context.Context, name string, opts ...mcpregistry.CreateMCPServerOption) (*mcpregistry.MCPServer, error)
	GetMCPServer(ctx context.Context, name string) (*mcpregistry.MCPServer, error)
	UpdateMCPServer(ctx context.Context, name string, opts ...mcpregistry.UpdateMCPServerOption) (*mcpregistry.MCPServer, error)
	DeleteMCPServer(ctx context.Context, name string) error
	SetMCPServerTag(ctx context.Context, name, key, value string) error
	DeleteMCPServerTag(ctx context.Context, name, key string) error
	SetMCPServerAlias(ctx context.Context, name, alias, version string) error
	GetMCPServerVersionByAlias(ctx context.Context, name, alias string) (*mcpregistry.MCPServerVersion, error)
	DeleteMCPServerAlias(ctx context.Context, name, alias string) error
	SearchMCPServerVersions(ctx context.Context, name string, opts ...mcpregistry.SearchMCPServerVersionsOption) (*mcpregistry.MCPServerVersionList, error)
	CreateMCPServerVersion(ctx context.Context, name string, serverJSON map[string]any, opts ...mcpregistry.CreateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error)
	GetMCPServerVersion(ctx context.Context, name, version string) (*mcpregistry.MCPServerVersion, error)
	UpdateMCPServerVersion(ctx context.Context, name, version string, opts ...mcpregistry.UpdateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error)
	DeleteMCPServerVersion(ctx context.Context, name, version string) error
	SetMCPServerVersionTag(ctx context.Context, name, version, key, value string) error
	DeleteMCPServerVersionTag(ctx context.Context, name, version, key string) error
	CreateMCPAccessEndpoint(ctx context.Context, serverName, endpointURL string, opts ...mcpregistry.CreateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error)
	GetMCPAccessEndpoint(ctx context.Context, serverName, endpointID string) (*mcpregistry.MCPAccessEndpoint, error)
	UpdateMCPAccessEndpoint(ctx context.Context, serverName, endpointID string, opts ...mcpregistry.UpdateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error)
	SearchMCPAccessEndpoints(ctx context.Context, opts ...mcpregistry.SearchMCPAccessEndpointsOption) (*mcpregistry.MCPAccessEndpointList, error)
	DeleteMCPAccessEndpoint(ctx context.Context, serverName, endpointID string) error
}

// Client wraps the mlflow-go SDK client.
type Client struct {
	sdk *sdkmlflow.Client
}

// NewClient creates a new MLflow client with the given SDK options.
func NewClient(opts ...sdkmlflow.Option) (*Client, error) {
	sdk, err := sdkmlflow.NewClient(opts...)
	if err != nil {
		return nil, err
	}

	return &Client{sdk: sdk}, nil
}

// SearchExperiments returns a paginated list of experiments matching the given options.
func (c *Client) SearchExperiments(ctx context.Context, opts ...tracking.SearchExperimentsOption) (*tracking.ExperimentList, error) {
	return c.sdk.Tracking().SearchExperiments(ctx, opts...)
}

// ListPrompts returns a paginated list of prompts matching the given options.
func (c *Client) ListPrompts(ctx context.Context, opts ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error) {
	return c.sdk.PromptRegistry().ListPrompts(ctx, opts...)
}

// RegisterPrompt creates a new text prompt or adds a new version to an existing one.
func (c *Client) RegisterPrompt(ctx context.Context, name, template string, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	return c.sdk.PromptRegistry().RegisterPrompt(ctx, name, template, opts...)
}

// RegisterChatPrompt creates a new chat prompt or adds a new version to an existing one.
func (c *Client) RegisterChatPrompt(ctx context.Context, name string, messages []promptregistry.ChatMessage, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	return c.sdk.PromptRegistry().RegisterChatPrompt(ctx, name, messages, opts...)
}

// LoadPrompt retrieves a specific prompt, optionally at a given version.
func (c *Client) LoadPrompt(ctx context.Context, name string, opts ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error) {
	return c.sdk.PromptRegistry().LoadPrompt(ctx, name, opts...)
}

// ListPromptVersions returns a paginated list of versions for a named prompt.
func (c *Client) ListPromptVersions(ctx context.Context, name string, opts ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error) {
	return c.sdk.PromptRegistry().ListPromptVersions(ctx, name, opts...)
}

// DeletePrompt removes an entire prompt and all its versions.
func (c *Client) DeletePrompt(ctx context.Context, name string) error {
	return c.sdk.PromptRegistry().DeletePrompt(ctx, name)
}

// DeletePromptVersion removes a specific version of a prompt.
func (c *Client) DeletePromptVersion(ctx context.Context, name string, version int) error {
	return c.sdk.PromptRegistry().DeletePromptVersion(ctx, name, version)
}

// SearchMCPServers returns a paginated list of MCP servers matching the given options.
func (c *Client) SearchMCPServers(ctx context.Context, opts ...mcpregistry.SearchMCPServersOption) (*mcpregistry.MCPServerList, error) {
	return c.sdk.MCPRegistry().SearchMCPServers(ctx, opts...)
}

// CreateMCPServer registers a new MCP server entry.
func (c *Client) CreateMCPServer(ctx context.Context, name string, opts ...mcpregistry.CreateMCPServerOption) (*mcpregistry.MCPServer, error) {
	return c.sdk.MCPRegistry().CreateMCPServer(ctx, name, opts...)
}

// GetMCPServer retrieves a single MCP server by name.
func (c *Client) GetMCPServer(ctx context.Context, name string) (*mcpregistry.MCPServer, error) {
	return c.sdk.MCPRegistry().GetMCPServer(ctx, name)
}

// UpdateMCPServer updates mutable fields on an existing MCP server.
func (c *Client) UpdateMCPServer(ctx context.Context, name string, opts ...mcpregistry.UpdateMCPServerOption) (*mcpregistry.MCPServer, error) {
	return c.sdk.MCPRegistry().UpdateMCPServer(ctx, name, opts...)
}

// DeleteMCPServer removes an MCP server and all of its versions, access endpoints, aliases, and tags.
func (c *Client) DeleteMCPServer(ctx context.Context, name string) error {
	return c.sdk.MCPRegistry().DeleteMCPServer(ctx, name)
}

// SetMCPServerTag sets a tag on an MCP server.
func (c *Client) SetMCPServerTag(ctx context.Context, name, key, value string) error {
	return c.sdk.MCPRegistry().SetMCPServerTag(ctx, name, key, value)
}

// DeleteMCPServerTag removes a tag from an MCP server.
func (c *Client) DeleteMCPServerTag(ctx context.Context, name, key string) error {
	return c.sdk.MCPRegistry().DeleteMCPServerTag(ctx, name, key)
}

// SetMCPServerAlias points an alias at a specific version of an MCP server.
func (c *Client) SetMCPServerAlias(ctx context.Context, name, alias, version string) error {
	return c.sdk.MCPRegistry().SetMCPServerAlias(ctx, name, alias, version)
}

// GetMCPServerVersionByAlias resolves an alias to the MCP server version it currently points to.
func (c *Client) GetMCPServerVersionByAlias(ctx context.Context, name, alias string) (*mcpregistry.MCPServerVersion, error) {
	return c.sdk.MCPRegistry().GetMCPServerVersionByAlias(ctx, name, alias)
}

// DeleteMCPServerAlias removes an alias from an MCP server.
func (c *Client) DeleteMCPServerAlias(ctx context.Context, name, alias string) error {
	return c.sdk.MCPRegistry().DeleteMCPServerAlias(ctx, name, alias)
}

// SearchMCPServerVersions returns a paginated list of versions for a named MCP server.
func (c *Client) SearchMCPServerVersions(ctx context.Context, name string, opts ...mcpregistry.SearchMCPServerVersionsOption) (*mcpregistry.MCPServerVersionList, error) {
	return c.sdk.MCPRegistry().SearchMCPServerVersions(ctx, name, opts...)
}

// CreateMCPServerVersion creates a new version of an MCP server from its server.json document.
func (c *Client) CreateMCPServerVersion(ctx context.Context, name string, serverJSON map[string]any, opts ...mcpregistry.CreateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error) {
	return c.sdk.MCPRegistry().CreateMCPServerVersion(ctx, name, serverJSON, opts...)
}

// GetMCPServerVersion retrieves a specific version of an MCP server.
func (c *Client) GetMCPServerVersion(ctx context.Context, name, version string) (*mcpregistry.MCPServerVersion, error) {
	return c.sdk.MCPRegistry().GetMCPServerVersion(ctx, name, version)
}

// UpdateMCPServerVersion updates mutable fields on an existing MCP server version.
func (c *Client) UpdateMCPServerVersion(ctx context.Context, name, version string, opts ...mcpregistry.UpdateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error) {
	return c.sdk.MCPRegistry().UpdateMCPServerVersion(ctx, name, version, opts...)
}

// DeleteMCPServerVersion removes a specific version of an MCP server.
func (c *Client) DeleteMCPServerVersion(ctx context.Context, name, version string) error {
	return c.sdk.MCPRegistry().DeleteMCPServerVersion(ctx, name, version)
}

// SetMCPServerVersionTag sets a tag on a specific version of an MCP server.
func (c *Client) SetMCPServerVersionTag(ctx context.Context, name, version, key, value string) error {
	return c.sdk.MCPRegistry().SetMCPServerVersionTag(ctx, name, version, key, value)
}

// DeleteMCPServerVersionTag removes a tag from a specific version of an MCP server.
func (c *Client) DeleteMCPServerVersionTag(ctx context.Context, name, version, key string) error {
	return c.sdk.MCPRegistry().DeleteMCPServerVersionTag(ctx, name, version, key)
}

// CreateMCPAccessEndpoint creates a new access endpoint for an MCP server.
func (c *Client) CreateMCPAccessEndpoint(ctx context.Context, serverName, endpointURL string, opts ...mcpregistry.CreateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error) {
	return c.sdk.MCPRegistry().CreateMCPAccessEndpoint(ctx, serverName, endpointURL, opts...)
}

// GetMCPAccessEndpoint retrieves a single access endpoint by ID.
func (c *Client) GetMCPAccessEndpoint(ctx context.Context, serverName, endpointID string) (*mcpregistry.MCPAccessEndpoint, error) {
	return c.sdk.MCPRegistry().GetMCPAccessEndpoint(ctx, serverName, endpointID)
}

// UpdateMCPAccessEndpoint updates mutable fields on an existing access endpoint.
func (c *Client) UpdateMCPAccessEndpoint(ctx context.Context, serverName, endpointID string, opts ...mcpregistry.UpdateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error) {
	return c.sdk.MCPRegistry().UpdateMCPAccessEndpoint(ctx, serverName, endpointID, opts...)
}

// SearchMCPAccessEndpoints returns a paginated list of access endpoints matching the given options.
func (c *Client) SearchMCPAccessEndpoints(ctx context.Context, opts ...mcpregistry.SearchMCPAccessEndpointsOption) (*mcpregistry.MCPAccessEndpointList, error) {
	return c.sdk.MCPRegistry().SearchMCPAccessEndpoints(ctx, opts...)
}

// DeleteMCPAccessEndpoint removes an access endpoint from an MCP server.
func (c *Client) DeleteMCPAccessEndpoint(ctx context.Context, serverName, endpointID string) error {
	return c.sdk.MCPRegistry().DeleteMCPAccessEndpoint(ctx, serverName, endpointID)
}
