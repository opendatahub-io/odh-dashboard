package mlflow

import (
	"context"

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
