package mlflow

import (
	"context"

	"github.com/opendatahub-io/mlflow-go/mlflow/mcpregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
	"github.com/stretchr/testify/mock"
)

// MockClient implements ClientInterface for testing.
type MockClient struct {
	mock.Mock
}

func (m *MockClient) SearchExperiments(ctx context.Context, opts ...tracking.SearchExperimentsOption) (*tracking.ExperimentList, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*tracking.ExperimentList), args.Error(1)
}

func (m *MockClient) ListPrompts(ctx context.Context, opts ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*promptregistry.PromptList), args.Error(1)
}

func (m *MockClient) RegisterPrompt(ctx context.Context, name, template string, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	args := m.Called(ctx, name, template, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*promptregistry.PromptVersion), args.Error(1)
}

func (m *MockClient) RegisterChatPrompt(ctx context.Context, name string, messages []promptregistry.ChatMessage, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	args := m.Called(ctx, name, messages, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*promptregistry.PromptVersion), args.Error(1)
}

func (m *MockClient) LoadPrompt(ctx context.Context, name string, opts ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error) {
	args := m.Called(ctx, name, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*promptregistry.PromptVersion), args.Error(1)
}

func (m *MockClient) ListPromptVersions(ctx context.Context, name string, opts ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error) {
	args := m.Called(ctx, name, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*promptregistry.PromptVersionList), args.Error(1)
}

func (m *MockClient) DeletePrompt(ctx context.Context, name string) error {
	args := m.Called(ctx, name)
	return args.Error(0)
}

func (m *MockClient) DeletePromptVersion(ctx context.Context, name string, version int) error {
	args := m.Called(ctx, name, version)
	return args.Error(0)
}

func (m *MockClient) SearchMCPServers(ctx context.Context, opts ...mcpregistry.SearchMCPServersOption) (*mcpregistry.MCPServerList, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPServerList), args.Error(1)
}

func (m *MockClient) CreateMCPServer(ctx context.Context, name string, opts ...mcpregistry.CreateMCPServerOption) (*mcpregistry.MCPServer, error) {
	args := m.Called(ctx, name, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPServer), args.Error(1)
}

func (m *MockClient) GetMCPServer(ctx context.Context, name string) (*mcpregistry.MCPServer, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPServer), args.Error(1)
}

func (m *MockClient) SearchMCPServerVersions(ctx context.Context, name string, opts ...mcpregistry.SearchMCPServerVersionsOption) (*mcpregistry.MCPServerVersionList, error) {
	args := m.Called(ctx, name, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPServerVersionList), args.Error(1)
}

func (m *MockClient) CreateMCPServerVersion(ctx context.Context, name string, serverJSON map[string]any, opts ...mcpregistry.CreateMCPServerVersionOption) (*mcpregistry.MCPServerVersion, error) {
	args := m.Called(ctx, name, serverJSON, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPServerVersion), args.Error(1)
}

func (m *MockClient) CreateMCPAccessEndpoint(ctx context.Context, serverName, endpointURL string, opts ...mcpregistry.CreateMCPAccessEndpointOption) (*mcpregistry.MCPAccessEndpoint, error) {
	args := m.Called(ctx, serverName, endpointURL, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPAccessEndpoint), args.Error(1)
}

func (m *MockClient) SearchMCPAccessEndpoints(ctx context.Context, opts ...mcpregistry.SearchMCPAccessEndpointsOption) (*mcpregistry.MCPAccessEndpointList, error) {
	args := m.Called(ctx, opts)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*mcpregistry.MCPAccessEndpointList), args.Error(1)
}

func (m *MockClient) DeleteMCPAccessEndpoint(ctx context.Context, serverName, endpointID string) error {
	args := m.Called(ctx, serverName, endpointID)
	return args.Error(0)
}

// MockFactory implements MLflowClientFactory for testing.
type MockFactory struct {
	mock.Mock
}

func (m *MockFactory) GetClient(ctx context.Context, token, namespace string) (ClientInterface, error) {
	args := m.Called(ctx, token, namespace)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(ClientInterface), args.Error(1)
}
