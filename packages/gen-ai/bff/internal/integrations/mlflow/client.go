package mlflow

import (
	"context"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
)

// ClientInterface defines the operations available on the MLflow client.
// Wraps the full mlflow.Client for future extensibility beyond prompt registry.
type ClientInterface interface {
	ListPrompts(ctx context.Context, opts ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error)
}

// Client wraps the mlflow-go SDK client.
type Client struct {
	sdk *sdkmlflow.Client
}

// NewClient creates a new MLflow client pointing at the given tracking URI.
// Set insecure to true to allow HTTP connections (required for localhost).
func NewClient(trackingURI string, insecure bool) (*Client, error) {
	opts := []sdkmlflow.Option{sdkmlflow.WithTrackingURI(trackingURI)}
	if insecure {
		opts = append(opts, sdkmlflow.WithInsecure())
	}

	sdk, err := sdkmlflow.NewClient(opts...)
	if err != nil {
		return nil, err
	}

	return &Client{sdk: sdk}, nil
}

func (c *Client) ListPrompts(ctx context.Context, opts ...promptregistry.ListPromptsOption) (*promptregistry.PromptList, error) {
	return c.sdk.PromptRegistry().ListPrompts(ctx, opts...)
}
