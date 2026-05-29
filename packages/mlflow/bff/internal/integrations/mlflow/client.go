package mlflow

import (
	"context"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
)

// ClientInterface defines the operations available on the MLflow tracking client.
type ClientInterface interface {
	SearchExperiments(ctx context.Context, opts ...tracking.SearchExperimentsOption) (*tracking.ExperimentList, error)
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
