package mlflow

import (
	"context"
	"errors"
	"sync"
)

// ErrMLflowNotConfigured is returned when no MLflow URL is configured and mock mode is disabled.
// Middleware uses this to return 503 instead of 500.
var ErrMLflowNotConfigured = errors.New("MLflow is not configured: set --mlflow-url or enable --mock-mlflow-client")

// MLflowClientFactory creates MLflow clients.
// Uses GetClient(ctx) following the K8s factory pattern.
// The real and mock implementations both return a shared singleton.
type MLflowClientFactory interface {
	GetClient(ctx context.Context) (ClientInterface, error)
}

// UnavailableClientFactory is used when MLflow is not configured.
// Every call to GetClient returns ErrMLflowNotConfigured so the BFF
// can start without an MLflow URL while MLflow-specific endpoints
// gracefully return 503.
type UnavailableClientFactory struct{}

func NewUnavailableClientFactory() MLflowClientFactory {
	return &UnavailableClientFactory{}
}

func (f *UnavailableClientFactory) GetClient(_ context.Context) (ClientInterface, error) {
	return nil, ErrMLflowNotConfigured
}

// RealClientFactory creates a real MLflow client connecting to a production URL.
// The client is created lazily on first call and reused for subsequent calls.
type RealClientFactory struct {
	client ClientInterface
	url    string
	mu     sync.Mutex
}

// NewRealClientFactory creates a factory for real MLflow clients.
func NewRealClientFactory(url string) MLflowClientFactory {
	return &RealClientFactory{url: url}
}

// GetClient returns a shared MLflow client, creating it on first call.
func (f *RealClientFactory) GetClient(_ context.Context) (ClientInterface, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.client != nil {
		return f.client, nil
	}

	client, err := NewClient(f.url, false)
	if err != nil {
		return nil, err
	}

	f.client = client
	return f.client, nil
}
