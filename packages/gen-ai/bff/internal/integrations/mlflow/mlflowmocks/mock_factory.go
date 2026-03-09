package mlflowmocks

import (
	"context"
	"fmt"
	"os"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"

	"github.com/opendatahub-io/gen-ai/internal/integrations/mlflow"
)

// MockClientFactory creates MLflow clients pointing to a local MLflow instance.
// Unlike other mocks that return fake data, this connects to a real local MLflow
// server started via uv, matching the envtest philosophy.
type MockClientFactory struct{}

// NewMockClientFactory creates a factory that connects to local MLflow.
// Uses MLFLOW_TRACKING_URI env var if set, otherwise derives the URI from MLFLOW_PORT.
func NewMockClientFactory() mlflow.MLflowClientFactory {
	return &MockClientFactory{}
}

// GetClient creates a per-request MLflow client for the local instance.
// Token and namespace are ignored — local MLflow has no auth or workspace isolation.
// Uses the same creation logic as the real factory for consistency.
func (f *MockClientFactory) GetClient(_ context.Context, _, _ string) (mlflow.ClientInterface, error) {
	trackingURI := os.Getenv("MLFLOW_TRACKING_URI")
	if trackingURI == "" {
		trackingURI = fmt.Sprintf("http://127.0.0.1:%d", mlflowPort())
	}

	return mlflow.NewClient(
		sdkmlflow.WithTrackingURI(trackingURI),
		sdkmlflow.WithInsecure(),
	)
}
