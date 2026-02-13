package mlflowmocks

import (
	"context"
	"os"
	"sync"

	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow"
)

const defaultTrackingURI = "http://127.0.0.1:5001"

// MockClientFactory creates MLflow clients pointing to a local MLflow instance.
// Unlike other mocks that return fake data, this connects to a real local MLflow
// server started via uv, matching the envtest philosophy.
type MockClientFactory struct {
	client mlflow.ClientInterface
	mu     sync.Mutex
}

// NewMockClientFactory creates a factory that connects to local MLflow.
// Uses MLFLOW_TRACKING_URI env var if set, otherwise defaults to http://127.0.0.1:5001.
func NewMockClientFactory() mlflow.MLflowClientFactory {
	return &MockClientFactory{}
}

// GetClient returns a shared MLflow client connected to the local MLflow instance.
func (f *MockClientFactory) GetClient(_ context.Context) (mlflow.ClientInterface, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.client != nil {
		return f.client, nil
	}

	trackingURI := os.Getenv("MLFLOW_TRACKING_URI")
	if trackingURI == "" {
		trackingURI = defaultTrackingURI
	}

	client, err := mlflow.NewClient(trackingURI, true)
	if err != nil {
		return nil, err
	}

	f.client = client
	return f.client, nil
}
