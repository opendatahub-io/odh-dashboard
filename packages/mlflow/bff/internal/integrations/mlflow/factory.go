package mlflow

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	sdkmlflow "github.com/opendatahub-io/mlflow-go/mlflow"
)

var (
	// ErrMLflowNotConfigured is returned when no MLflow URL is configured.
	// Middleware uses this to return 503 instead of 500.
	ErrMLflowNotConfigured = errors.New("MLflow is not configured: set --mlflow-url")

	// ErrTokenRequired may be returned by factory implementations that require auth.
	// RealClientFactory allows empty tokens (for AUTH_METHOD=disabled) and omits
	// the Authorization header in that case.
	ErrTokenRequired = errors.New("mlflow auth token is required")

	// ErrNamespaceRequired is returned when the workspace namespace is empty or whitespace-only.
	ErrNamespaceRequired = errors.New("mlflow workspace namespace is required")
)

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

// NewUnavailableClientFactory returns a factory that signals MLflow is not configured.
func NewUnavailableClientFactory() MLflowClientFactory {
	return &UnavailableClientFactory{}
}

// GetClient returns ErrMLflowNotConfigured.
func (f *UnavailableClientFactory) GetClient(_ context.Context, _, _ string) (ClientInterface, error) {
	return nil, ErrMLflowNotConfigured
}

// RealClientFactory creates per-request MLflow clients with auth and workspace headers.
// The underlying http.Transport is shared across requests for connection pooling and TLS.
type RealClientFactory struct {
	trackingURL string
	transport   *http.Transport
	logger      *slog.Logger
}

// RealClientFactoryConfig holds configuration for creating a RealClientFactory.
type RealClientFactoryConfig struct {
	TrackingURL        string
	RootCAs            *x509.CertPool
	InsecureSkipVerify bool
	Logger             *slog.Logger
}

// NewRealClientFactory creates a factory for real MLflow clients.
func NewRealClientFactory(cfg RealClientFactoryConfig) MLflowClientFactory {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.TLSClientConfig = &tls.Config{
		RootCAs:            cfg.RootCAs,
		InsecureSkipVerify: cfg.InsecureSkipVerify, // #nosec G402 -- dev-only flag
		MinVersion:         tls.VersionTLS12,
	}
	transport.MaxIdleConnsPerHost = 10

	return &RealClientFactory{
		trackingURL: cfg.TrackingURL,
		transport:   transport,
		logger:      cfg.Logger,
	}
}

// GetClient creates a per-request MLflow client with the caller's auth token and workspace namespace.
// When token is empty (e.g. AUTH_METHOD=disabled), the Authorization header is omitted.
func (f *RealClientFactory) GetClient(_ context.Context, token, namespace string) (ClientInterface, error) {
	token = strings.TrimSpace(token)
	namespace = strings.TrimSpace(namespace)

	if namespace == "" {
		return nil, ErrNamespaceRequired
	}

	httpClient := &http.Client{
		Transport: f.transport,
		Timeout:   30 * time.Second,
	}

	headers := map[string]string{
		"X-MLFLOW-WORKSPACE": namespace,
	}
	if token != "" {
		headers["Authorization"] = "Bearer " + token
	}

	opts := []sdkmlflow.Option{
		sdkmlflow.WithTrackingURI(f.trackingURL),
		sdkmlflow.WithHTTPClient(httpClient),
		sdkmlflow.WithHeaders(headers),
	}

	if f.logger != nil {
		opts = append(opts, sdkmlflow.WithLogger(f.logger.Handler()))
	}

	if strings.HasPrefix(f.trackingURL, "http://") {
		opts = append(opts, sdkmlflow.WithInsecure())
	}

	return NewClient(opts...)
}
