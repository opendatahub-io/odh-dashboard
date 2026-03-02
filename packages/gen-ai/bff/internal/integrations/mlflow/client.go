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
	RegisterPrompt(ctx context.Context, name, template string, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error)
	RegisterChatPrompt(ctx context.Context, name string, messages []promptregistry.ChatMessage, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error)
	LoadPrompt(ctx context.Context, name string, opts ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error)
	ListPromptVersions(ctx context.Context, name string, opts ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error)
	DeletePrompt(ctx context.Context, name string) error
	DeletePromptVersion(ctx context.Context, name string, version int) error
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

func (c *Client) RegisterPrompt(ctx context.Context, name, template string, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	return c.sdk.PromptRegistry().RegisterPrompt(ctx, name, template, opts...)
}

func (c *Client) RegisterChatPrompt(ctx context.Context, name string, messages []promptregistry.ChatMessage, opts ...promptregistry.RegisterOption) (*promptregistry.PromptVersion, error) {
	return c.sdk.PromptRegistry().RegisterChatPrompt(ctx, name, messages, opts...)
}

func (c *Client) LoadPrompt(ctx context.Context, name string, opts ...promptregistry.LoadOption) (*promptregistry.PromptVersion, error) {
	return c.sdk.PromptRegistry().LoadPrompt(ctx, name, opts...)
}

func (c *Client) ListPromptVersions(ctx context.Context, name string, opts ...promptregistry.ListVersionsOption) (*promptregistry.PromptVersionList, error) {
	return c.sdk.PromptRegistry().ListPromptVersions(ctx, name, opts...)
}

func (c *Client) DeletePrompt(ctx context.Context, name string) error {
	return c.sdk.PromptRegistry().DeletePrompt(ctx, name)
}

func (c *Client) DeletePromptVersion(ctx context.Context, name string, version int) error {
	return c.sdk.PromptRegistry().DeletePromptVersion(ctx, name, version)
}
