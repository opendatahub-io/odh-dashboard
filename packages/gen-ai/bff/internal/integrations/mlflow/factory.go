package mlflow

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"net/http"
	"time"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
)

// ErrMLflowNotConfigured is returned when no MLflow URL is configured and mock mode is disabled.
// Middleware uses this to return 503 instead of 500.
var ErrMLflowNotConfigured = errors.New("MLflow is not configured: set --mlflow-url or enable --mock-mlflow-client")

// MLflowClientFactory creates MLflow clients.
// Token and namespace are per-request: token for Bearer auth, namespace for the X-MLFLOW-WORKSPACE header.
type MLflowClientFactory interface {
	GetClient(ctx context.Context, token, namespace string) (ClientInterface, error)
}

// UnavailableClientFactory is used when MLflow is not configured.
// Every call to GetClient returns ErrMLflowNotConfigured so the BFF
// can start without an MLflow URL while MLflow-specific endpoints
// gracefully return 503.
type UnavailableClientFactory struct{}

func NewUnavailableClientFactory() MLflowClientFactory {
	return &UnavailableClientFactory{}
}

func (f *UnavailableClientFactory) GetClient(_ context.Context, _, _ string) (ClientInterface, error) {
	return nil, ErrMLflowNotConfigured
}

// RealClientFactory creates per-request MLflow clients with auth and workspace headers.
// The underlying http.Transport is shared across requests for connection pooling.
type RealClientFactory struct {
	url       string
	transport *http.Transport
}

// NewRealClientFactory creates a factory for real MLflow clients.
// rootCAs and insecureSkipVerify configure TLS on the shared transport.
func NewRealClientFactory(url string, rootCAs *x509.CertPool, insecureSkipVerify bool) MLflowClientFactory {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		RootCAs:            rootCAs,
		InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // cluster-level config, matches other integrations
		MinVersion:         tls.VersionTLS12,
	}
	transport.MaxIdleConnsPerHost = 10
	return &RealClientFactory{url: url, transport: transport}
}

// GetClient creates a per-request MLflow client with the caller's auth token and workspace namespace.
func (f *RealClientFactory) GetClient(_ context.Context, token, namespace string) (ClientInterface, error) {
	if token == "" {
		return nil, errors.New("mlflow auth token is required")
	}
	if namespace == "" {
		return nil, errors.New("mlflow workspace namespace is required")
	}

	httpClient := &http.Client{
		Transport: f.transport,
		Timeout:   30 * time.Second,
	}

	headers := map[string]string{
		"Authorization":      "Bearer " + token,
		"X-MLFLOW-WORKSPACE": namespace,
	}

	return NewClient(
		sdkmlflow.WithTrackingURI(f.url),
		sdkmlflow.WithHeaders(headers),
		sdkmlflow.WithHTTPClient(httpClient),
	)
}
