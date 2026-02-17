package mlflow

import (
	"context"
	"sync"
)

// MLflowClientFactory creates MLflow clients.
// Uses GetClient(ctx) following the K8s factory pattern.
// The real and mock implementations both return a shared singleton.
type MLflowClientFactory interface {
	GetClient(ctx context.Context) (ClientInterface, error)
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
