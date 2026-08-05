package mlflowmocks

import (
	"context"
	"fmt"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
)

// staticExperiments returns the comprehensive set of mock experiments.
// Kept as a function so each call gets fresh timestamps relative to "now".
func staticExperiments() []tracking.Experiment {
	now := time.Now()
	return []tracking.Experiment{
		{
			ID:               "0",
			Name:             "env-static-mock",
			ArtifactLocation: "mlflow-artifacts:/0",
			LifecycleStage:   "active",
			Tags:             map[string]string{"source": "static-mock", "description": "Identifies this as the fully-mocked (in-memory) environment"},
			CreationTime:     now.Add(-30 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-7 * 24 * time.Hour),
		},
		{
			ID:               "1",
			Name:             "fraud-detection-classifier",
			ArtifactLocation: "mlflow-artifacts:/1",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "ml-platform", "project": "fraud-detection", "priority": "high"},
			CreationTime:     now.Add(-14 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-1 * time.Hour),
		},
		{
			ID:               "2",
			Name:             "demand-forecasting-regression",
			ArtifactLocation: "mlflow-artifacts:/2",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "data-science", "project": "supply-chain"},
			CreationTime:     now.Add(-10 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-3 * time.Hour),
		},
		{
			ID:               "3",
			Name:             "sentiment-analysis-nlp",
			ArtifactLocation: "mlflow-artifacts:/3",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "nlp", "project": "customer-feedback", "framework": "transformers"},
			CreationTime:     now.Add(-7 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-30 * time.Minute),
		},
		{
			ID:               "4",
			Name:             "image-classification-cnn",
			ArtifactLocation: "mlflow-artifacts:/4",
			LifecycleStage:   "active",
			Tags:             map[string]string{"team": "computer-vision", "project": "product-catalog"},
			CreationTime:     now.Add(-5 * 24 * time.Hour),
			LastUpdateTime:   now.Add(-2 * time.Hour),
		},
	}
}

func staticPrompts() []promptregistry.Prompt {
	now := time.Now()
	return []promptregistry.Prompt{
		{Name: "vet-appointment-dora", Description: "Schedule a veterinary appointment for Dora", LatestVersion: 1, Tags: map[string]string{"pet": "dora", "category": "health"}, CreationTimestamp: now.Add(-14 * 24 * time.Hour)},
		{Name: "pet-health-bella", Description: "Pet health check for Bella", LatestVersion: 1, Tags: map[string]string{"pet": "bella"}, CreationTimestamp: now.Add(-10 * 24 * time.Hour)},
		{Name: "medication-reminder-ellie", Description: "Medication reminder prompt", LatestVersion: 1, Tags: map[string]string{"pet": "ellie"}, CreationTimestamp: now.Add(-7 * 24 * time.Hour)},
		{Name: "pet-adoption-letter", Description: "Generate pet adoption letters", LatestVersion: 1, Tags: map[string]string{"category": "adoption"}, CreationTimestamp: now.Add(-5 * 24 * time.Hour)},
	}
}

func staticPromptVersion(name string) *promptregistry.PromptVersion {
	now := time.Now()
	return &promptregistry.PromptVersion{
		Name:          name,
		Version:       1,
		Template:      fmt.Sprintf("Hello {{name}}, this is the %s prompt.", name),
		CommitMessage: "initial version",
		CreatedAt:     now.Add(-14 * 24 * time.Hour),
		UpdatedAt:     now.Add(-14 * 24 * time.Hour),
	}
}

// staticMCPServers returns canned MCP Registry servers.
func staticMCPServers() []mcpregistry.MCPServer {
	now := time.Now()
	return []mcpregistry.MCPServer{
		{
			Name:                 "io.github.example/weather-server",
			DisplayName:          "Weather Server",
			Description:          "Provides current weather and forecast tools.",
			Status:               "active",
			LatestVersion:        "1.0.0",
			Tags:                 map[string]string{"category": "weather"},
			CreatedBy:            "static-mock",
			LastUpdatedBy:        "static-mock",
			CreationTimestamp:    now.Add(-7 * 24 * time.Hour),
			LastUpdatedTimestamp: now.Add(-1 * time.Hour),
		},
		{
			Name:                 "io.github.example/github-server",
			DisplayName:          "GitHub Server",
			Description:          "Exposes GitHub issue and PR management tools.",
			Status:               "active",
			LatestVersion:        "2.1.0",
			Tags:                 map[string]string{"category": "devtools"},
			CreatedBy:            "static-mock",
			LastUpdatedBy:        "static-mock",
			CreationTimestamp:    now.Add(-14 * 24 * time.Hour),
			LastUpdatedTimestamp: now.Add(-3 * time.Hour),
		},
	}
}

func staticMCPServer(name string) *mcpregistry.MCPServer {
	for _, s := range staticMCPServers() {
		if s.Name == name {
			return &s
		}
	}
	now := time.Now()
	return &mcpregistry.MCPServer{
		Name:                 name,
		Status:               "active",
		CreatedBy:            "static-mock",
		LastUpdatedBy:        "static-mock",
		CreationTimestamp:    now,
		LastUpdatedTimestamp: now,
	}
}

func staticMCPServerVersion(name string) *mcpregistry.MCPServerVersion {
	now := time.Now()
	return &mcpregistry.MCPServerVersion{
		Name:    name,
		Version: "1.0.0",
		ServerJSON: map[string]any{
			"name":        name,
			"description": "Static mock server.json",
			"version":     "1.0.0",
		},
		Status:               mcpregistry.MCPServerVersionStatusActive,
		CreatedBy:            "static-mock",
		LastUpdatedBy:        "static-mock",
		CreationTimestamp:    now.Add(-24 * time.Hour),
		LastUpdatedTimestamp: now.Add(-24 * time.Hour),
	}
}

func staticMCPAccessEndpoint(serverName string) mcpregistry.MCPAccessEndpoint {
	now := time.Now()
	return mcpregistry.MCPAccessEndpoint{
		ID:                   "static-endpoint-1",
		ServerName:           serverName,
		EndpointURL:          fmt.Sprintf("https://mcp.example.com/%s", serverName),
		TransportType:        mcpregistry.MCPTransportStreamableHTTP,
		CreatedBy:            "static-mock",
		LastUpdatedBy:        "static-mock",
		CreationTimestamp:    now.Add(-24 * time.Hour),
		LastUpdatedTimestamp: now.Add(-24 * time.Hour),
	}
}

// StaticMockClient implements ClientInterface with hardcoded data.
// Used for contract tests and fully-mocked dev mode so no real MLflow server
// (and therefore no uv/Python) is required.
type StaticMockClient struct{}

func (c *StaticMockClient) SearchExperiments(_ context.Context, _ ...tracking.SearchExperimentsOption) (*tracking.ExperimentList, error) {
	return &tracking.ExperimentList{Experiments: staticExperiments()}, nil
}

func (c *StaticMockClient) ListPrompts(_ context.Context, _ ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error) {
	return &promptregistry.PromptList{Prompts: staticPrompts()}, nil
}

func (c *StaticMockClient) RegisterPrompt(_ context.Context, name, template string, _ ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	now := time.Now()
	return &promptregistry.PromptVersion{
		Name: name, Version: 1, Template: template,
		CreatedAt: now, UpdatedAt: now,
	}, nil
}

func (c *StaticMockClient) RegisterChatPrompt(_ context.Context, name string, messages []promptregistry.ChatMessage, _ ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	now := time.Now()
	return &promptregistry.PromptVersion{
		Name: name, Version: 1, Messages: messages,
		CreatedAt: now, UpdatedAt: now,
	}, nil
}

func (c *StaticMockClient) LoadPrompt(_ context.Context, name string, _ ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error) {
	return staticPromptVersion(name), nil
}

func (c *StaticMockClient) ListPromptVersions(_ context.Context, _ string, _ ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error) {
	now := time.Now()
	return &promptregistry.PromptVersionList{
		Versions: []promptregistry.PromptVersion{
			{Version: 1, CommitMessage: "initial version", CreatedAt: now.Add(-14 * 24 * time.Hour), UpdatedAt: now.Add(-14 * 24 * time.Hour)},
		},
	}, nil
}

func (c *StaticMockClient) DeletePrompt(_ context.Context, _ string) error { return nil }

func (c *StaticMockClient) DeletePromptVersion(_ context.Context, _ string, _ int) error { return nil }

func (c *StaticMockClient) SearchMCPServers(_ context.Context, _ ...mcpregistry.SearchMCPServersOption) (*mcpregistry.MCPServerList, error) {
	return &mcpregistry.MCPServerList{Servers: staticMCPServers()}, nil
}

func (c *StaticMockClient) CreateMCPServer(_ context.Context, name string, _ ...mcpregistry.CreateMCPServerOption) (*mcpregistry.MCPServer, error) {
	now := time.Now()
	return &mcpregistry.MCPServer{
		Name:                 name,
		Status:               "active",
		CreatedBy:            "static-mock",
		LastUpdatedBy:        "static-mock",
		CreationTimestamp:    now,
		LastUpdatedTimestamp: now,
	}, nil
}

func (c *StaticMockClient) GetMCPServer(_ context.Context, name string) (*mcpregistry.MCPServer, error) {
	return staticMCPServer(name), nil
}

// UpdateMCPServer returns the static server for name with the last-updated
// timestamp bumped. The SDK's UpdateMCPServerOption values can't be
// introspected here since their backing struct is unexported to this
// package (by design, so callers can't bypass the functional-options API),
// so this mock can't reflect specific field changes back in the response
// the way a real server-side PATCH would.
func (c *StaticMockClient) UpdateMCPServer(_ context.Context, name string, _ ...mcpregistry.UpdateMCPServerOption) (*mcpregistry.MCPServer, error) {
	updated := staticMCPServer(name)
	updated.LastUpdatedBy = "static-mock"
	updated.LastUpdatedTimestamp = time.Now()
	return updated, nil
}

func (c *StaticMockClient) DeleteMCPServer(_ context.Context, _ string) error { return nil }

func (c *StaticMockClient) SetMCPServerTag(_ context.Context, _, _, _ string) error { return nil }

func (c *StaticMockClient) DeleteMCPServerTag(_ context.Context, _, _ string) error { return nil }

func (c *StaticMockClient) SetMCPServerAlias(_ context.Context, _, _, _ string) error { return nil }

func (c *StaticMockClient) GetMCPServerVersionByAlias(_ context.Context, name, alias string) (*mcpregistry.MCPServerVersion, error) {
	version := staticMCPServerVersion(name)
	version.Aliases = []string{alias}
	return version, nil
}

func (c *StaticMockClient) DeleteMCPServerAlias(_ context.Context, _, _ string) error { return nil }

func (c *StaticMockClient) SearchMCPServerVersions(_ context.Context, name string, _ ...mcpregistry.SearchMCPServerVersionsOption) (*mcpregistry.MCPServerVersionList, error) {
	return &mcpregistry.MCPServerVersionList{Versions: []mcpregistry.MCPServerVersion{*staticMCPServerVersion(name)}}, nil
}

func (c *StaticMockClient) CreateMCPServerVersion(_ context.Context, name string, serverJSON map[string]any, _ ...mcpregistry.CreateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error) {
	now := time.Now()
	return &mcpregistry.MCPServerVersion{
		Name:                 name,
		Version:              "1.0.0",
		ServerJSON:           serverJSON,
		Status:               mcpregistry.MCPServerVersionStatusDraft,
		CreatedBy:            "static-mock",
		LastUpdatedBy:        "static-mock",
		CreationTimestamp:    now,
		LastUpdatedTimestamp: now,
	}, nil
}

func (c *StaticMockClient) GetMCPServerVersion(_ context.Context, name, version string) (*mcpregistry.MCPServerVersion, error) {
	v := staticMCPServerVersion(name)
	v.Version = version
	return v, nil
}

// UpdateMCPServerVersion returns the static version for name/version with
// the last-updated timestamp bumped. See UpdateMCPServer for why the
// supplied options aren't reflected in the response.
func (c *StaticMockClient) UpdateMCPServerVersion(_ context.Context, name, version string, _ ...mcpregistry.UpdateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error) {
	v := staticMCPServerVersion(name)
	v.Version = version
	v.LastUpdatedBy = "static-mock"
	v.LastUpdatedTimestamp = time.Now()
	return v, nil
}

func (c *StaticMockClient) DeleteMCPServerVersion(_ context.Context, _, _ string) error { return nil }

func (c *StaticMockClient) SetMCPServerVersionTag(_ context.Context, _, _, _, _ string) error {
	return nil
}

func (c *StaticMockClient) DeleteMCPServerVersionTag(_ context.Context, _, _, _ string) error {
	return nil
}

func (c *StaticMockClient) CreateMCPAccessEndpoint(_ context.Context, serverName, endpointURL string, _ ...mcpregistry.CreateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error) {
	now := time.Now()
	return &mcpregistry.MCPAccessEndpoint{
		ID:                   "static-endpoint-1",
		ServerName:           serverName,
		EndpointURL:          endpointURL,
		TransportType:        mcpregistry.MCPTransportStreamableHTTP,
		CreatedBy:            "static-mock",
		LastUpdatedBy:        "static-mock",
		CreationTimestamp:    now,
		LastUpdatedTimestamp: now,
	}, nil
}

func (c *StaticMockClient) GetMCPAccessEndpoint(_ context.Context, serverName, endpointID string) (*mcpregistry.MCPAccessEndpoint, error) {
	endpoint := staticMCPAccessEndpoint(serverName)
	endpoint.ID = endpointID
	return &endpoint, nil
}

// UpdateMCPAccessEndpoint returns the static endpoint for serverName/
// endpointID with the last-updated timestamp bumped. See UpdateMCPServer
// for why the supplied options aren't reflected in the response.
func (c *StaticMockClient) UpdateMCPAccessEndpoint(_ context.Context, serverName, endpointID string, _ ...mcpregistry.UpdateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error) {
	endpoint := staticMCPAccessEndpoint(serverName)
	endpoint.ID = endpointID
	endpoint.LastUpdatedBy = "static-mock"
	endpoint.LastUpdatedTimestamp = time.Now()
	return &endpoint, nil
}

func (c *StaticMockClient) SearchMCPAccessEndpoints(_ context.Context, _ ...mcpregistry.SearchMCPAccessEndpointsOption) (*mcpregistry.MCPAccessEndpointList, error) {
	return &mcpregistry.MCPAccessEndpointList{Endpoints: []mcpregistry.MCPAccessEndpoint{staticMCPAccessEndpoint("io.github.example/weather-server")}}, nil
}

func (c *StaticMockClient) DeleteMCPAccessEndpoint(_ context.Context, _, _ string) error { return nil }

// StaticMockClientFactory returns a StaticMockClient for every request.
// Token and namespace are ignored since there is no real server.
type StaticMockClientFactory struct{}

// NewStaticMockClientFactory creates a factory that returns in-memory mock data.
func NewStaticMockClientFactory() mlflow.MLflowClientFactory {
	return &StaticMockClientFactory{}
}

// GetClient returns a StaticMockClient.
func (f *StaticMockClientFactory) GetClient(_ context.Context, _, _ string) (mlflow.ClientInterface, error) {
	return &StaticMockClient{}, nil
}
