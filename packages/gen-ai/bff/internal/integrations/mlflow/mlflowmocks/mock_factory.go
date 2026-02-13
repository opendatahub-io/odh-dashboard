package mlflowmocks

import (
	"context"
	"sync"

	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow"
)

// MockClientFactory creates MLflow clients pointing to a local MLflow instance.
// Unlike other mocks that return fake data, this connects to a real local MLflow
// server started via uv, matching the envtest philosophy.
type MockClientFactory struct {
	client mlflow.ClientInterface
	mu     sync.Mutex
}

// NewMockClientFactory creates a factory that connects to local MLflow on port 5001.
func NewMockClientFactory() mlflow.MLflowClientFactory {
	return &MockClientFactory{}
}

// GetClient returns a shared MLflow client connected to localhost:5001.
func (f *MockClientFactory) GetClient(_ context.Context) (mlflow.ClientInterface, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.client != nil {
		return f.client, nil
	}

	client, err := mlflow.NewClient("http://localhost:5001", true)
	if err != nil {
		return nil, err
	}

	f.client = client
	return f.client, nil
}
