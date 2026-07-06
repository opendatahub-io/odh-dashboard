package mlflow

import (
	"context"

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
