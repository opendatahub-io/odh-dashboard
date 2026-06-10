package ogx

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// httpClientInterface wraps *http.Client for testing.
type httpClientInterface interface {
	Do(req *http.Request) (*http.Response, error)
}

// OGXClientInterface defines the contract for Open GenAI Stack client operations.
// baseURL and apiKey are passed per call so a single client instance can serve
// multiple namespaces and secrets without reconstructing the HTTP client.
type OGXClientInterface interface {
	ListModels(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error)
	ListProviders(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error)
}

// OGXClient communicates with an Open GenAI Stack Distribution server.
// It is stateless — baseURL and apiKey are passed per call so a single
// instance can serve multiple namespaces and secrets.
type OGXClient struct {
	httpClient httpClientInterface
}

// NewOGXClient creates a client with an injectable HTTP client (for testing).
func NewOGXClient(httpClient httpClientInterface) *OGXClient {
	return &OGXClient{httpClient: httpClient}
}

// OGXClientConfig holds configuration for the default OGX client.
type OGXClientConfig struct {
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
	// WrapTransport optionally wraps the HTTP transport chain.
	// Pass k8s.PortForwardWrapTransport in dev mode for automatic in-cluster URL rewriting.
	WrapTransport func(http.RoundTripper) http.RoundTripper
}

// NewDefaultOGXClient creates a client with a real HTTP client configured for
// TLS and a generous timeout suitable for model listing operations.
func NewDefaultOGXClient(cfg OGXClientConfig) *OGXClient {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // caller-controlled knob
		MinVersion:         tls.VersionTLS13,
	}
	if cfg.RootCAs != nil {
		tlsConfig.RootCAs = cfg.RootCAs
	}
	var rt http.RoundTripper = &http.Transport{TLSClientConfig: tlsConfig}
	if cfg.WrapTransport != nil {
		rt = cfg.WrapTransport(rt)
	}
	return NewOGXClient(&http.Client{
		Transport: rt,
		Timeout:   8 * time.Minute,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	})
}

// ListModels retrieves all available models from OGX.
// ogx v0.4.0+ serves all endpoints directly under /v1/ (removed the /v1/openai/v1/ prefix).
func (c *OGXClient) ListModels(ctx context.Context, baseURL, apiKey string) ([]models.OGXNativeModel, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/v1/models", nil)
	if err != nil {
		return nil, NewConnectionError(fmt.Sprintf("failed to create request for Open GenAI Stack models: %s", err.Error()))
	}

	req.Header.Set("Accept", "application/json")
	setAuthHeader(req, apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, wrapClientError(err, "ListModels")
	}
	defer resp.Body.Close()

	const maxModelsResponseBytes = 2 << 20 // 2 MiB
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxModelsResponseBytes))
	if err != nil {
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to read Open GenAI Stack models response body: %s", err.Error()),
			http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode, body, "models")
	}

	var envelope struct {
		Data []models.OGXNativeModel `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		var bare []models.OGXNativeModel
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse Open GenAI Stack models response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}

// ListProviders retrieves all registered providers from Open GenAI Stack via /v1/providers.
func (c *OGXClient) ListProviders(ctx context.Context, baseURL, apiKey string) ([]models.OGXProvider, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/v1/providers", nil)
	if err != nil {
		return nil, NewConnectionError(fmt.Sprintf("failed to create request for Open GenAI Stack providers: %s", err.Error()))
	}

	req.Header.Set("Accept", "application/json")
	setAuthHeader(req, apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, wrapClientError(err, "ListProviders")
	}
	defer resp.Body.Close()

	const maxProvidersResponseBytes = 1 << 20 // 1 MiB
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxProvidersResponseBytes))
	if err != nil {
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to read Open GenAI Stack providers response body: %s", err.Error()),
			http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, mapHTTPStatusToError(resp.StatusCode, body, "providers")
	}

	var envelope struct {
		Data []models.OGXProvider `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		var bare []models.OGXProvider
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewOGXError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse Open GenAI Stack providers response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}

// setAuthHeader sets the Authorization header when an API key is provided.
// The header is omitted over plain HTTP (except localhost) to avoid leaking tokens.
func setAuthHeader(req *http.Request, apiKey string) {
	if apiKey == "" {
		return
	}
	isLocalhost := req.URL.Hostname() == "localhost" || req.URL.Hostname() == "127.0.0.1"
	if req.URL.Scheme == "https" || isLocalhost {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
}

// Compile-time interface checks.
var _ OGXClientInterface = (*OGXClient)(nil)
var _ httpClientInterface = (*http.Client)(nil)
