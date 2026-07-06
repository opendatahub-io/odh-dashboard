package mlflowmocks

import (
	"context"
	"fmt"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"

	"github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
)

// MockClientFactory creates MLflow clients pointing to a local MLflow instance.
// Unlike other mocks that return fake data, this connects to a real local MLflow
// server started via uv, matching the envtest philosophy.
type MockClientFactory struct {
	trackingURI string
}

// NewMockClientFactory creates a factory that connects to local MLflow at the
// given tracking URI. If trackingURI is empty, a default is derived from MLFLOW_PORT.
func NewMockClientFactory(trackingURI string) mlflow.MLflowClientFactory {
	if trackingURI == "" {
		trackingURI = fmt.Sprintf("http://127.0.0.1:%d", mlflowPort())
	}
	return &MockClientFactory{trackingURI: trackingURI}
}

// GetClient creates a per-request MLflow client for the local instance.
// Token and namespace are ignored — local MLflow has no auth or workspace isolation.
func (f *MockClientFactory) GetClient(_ context.Context, _, _ string) (mlflow.ClientInterface, error) {
	return mlflow.NewClient(
		sdkmlflow.WithTrackingURI(f.trackingURI),
		sdkmlflow.WithInsecure(),
	)
}
