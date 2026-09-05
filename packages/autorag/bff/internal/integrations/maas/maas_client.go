package maas

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// httpClientInterface wraps *http.Client for testing.
type httpClientInterface interface {
	Do(req *http.Request) (*http.Response, error)
}

// MaaSClientInterface defines the contract for Models as a Service client operations.
// baseURL and apiKey are passed per call so a single client instance can serve
// multiple namespaces and secrets without reconstructing the HTTP client.
type MaaSClientInterface interface {
	ListModels(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error)
	ListProviders(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error)
}

// MaaSClient communicates with an Models as a Service Distribution server.
// It is stateless — baseURL and apiKey are passed per call so a single
// instance can serve multiple namespaces and secrets.
type MaaSClient struct {
	httpClient httpClientInterface
}

// NewMaaSClient creates a client with an injectable HTTP client (for testing).
func NewMaaSClient(httpClient httpClientInterface) *MaaSClient {
	return &MaaSClient{httpClient: httpClient}
}

// MaaSClientConfig holds configuration for the default MaaS client.
type MaaSClientConfig struct {
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
	// WrapTransport optionally wraps the HTTP transport chain.
	// Pass k8s.PortForwardWrapTransport in dev mode for automatic in-cluster URL rewriting.
	WrapTransport func(http.RoundTripper) http.RoundTripper
}

// NewDefaultMaaSClient creates a client with a real HTTP client configured for
// TLS and a generous timeout suitable for model listing operations.
func NewDefaultMaaSClient(cfg MaaSClientConfig) *MaaSClient {
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
	return NewMaaSClient(&http.Client{
		Transport: rt,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	})
}

func isRetryableListStatus(statusCode int) bool {
	switch statusCode {
	case http.StatusNotFound, http.StatusMovedPermanently, http.StatusFound,
		http.StatusTemporaryRedirect, http.StatusPermanentRedirect:
		return true
	default:
		return false
	}
}

func (c *MaaSClient) getJSON(
	ctx context.Context,
	baseURL, apiKey, operation, resource string,
	maxBytes int64,
	relPaths []string,
) ([]byte, error) {
	base := strings.TrimRight(baseURL, "/")
	var lastStatus int
	var lastBody []byte
	for _, rel := range relPaths {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, base+rel, nil)
		if err != nil {
			return nil, NewConnectionError(fmt.Sprintf("failed to create request for Models as a Service %s: %s", resource, err.Error()))
		}
		req.Header.Set("Accept", "application/json")
		setAuthHeader(req, apiKey)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, wrapClientError(err, operation)
		}
		body, readErr := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
		_ = resp.Body.Close()
		if readErr != nil {
			return nil, NewMaaSError(ErrCodeInternalError,
				fmt.Sprintf("failed to read Models as a Service %s response body: %s", resource, readErr.Error()),
				http.StatusInternalServerError)
		}
		if resp.StatusCode == http.StatusOK {
			return body, nil
		}
		lastStatus = resp.StatusCode
		lastBody = body
		if !isRetryableListStatus(resp.StatusCode) {
			return nil, mapHTTPStatusToError(resp.StatusCode, body, resource)
		}
	}
	if lastStatus == 0 {
		return nil, NewMaaSError(ErrCodeInternalError, fmt.Sprintf("no request paths for Models as a Service %s", resource), http.StatusInternalServerError)
	}
	return nil, mapHTTPStatusToError(lastStatus, lastBody, resource)
}

// ListModels retrieves all available models from MaaS.
// Deserializes into MaaSNativeModel structs so that upstream schema changes are surfaced
// explicitly rather than hidden behind the OpenAI SDK.
// maas/ogx v0.4.0+ serves endpoints under /v1/; older OGX/Llama Stack images used /v1/openai/v1/.
func (c *MaaSClient) ListModels(ctx context.Context, baseURL, apiKey string) ([]models.MaaSNativeModel, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Minute)
	defer cancel()
	const maxModelsResponseBytes = 2 << 20 // 2 MiB
	body, err := c.getJSON(ctx, baseURL, apiKey, "ListModels", "models", maxModelsResponseBytes, []string{
		"/v1/models",
		"/v1/openai/v1/models",
	})
	if err != nil {
		return nil, err
	}

	var envelope struct {
		Data []models.MaaSNativeModel `json:"data"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		var bare []models.MaaSNativeModel
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewMaaSError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse Models as a Service models response: %s", err.Error()),
			http.StatusInternalServerError)
	}

	return envelope.Data, nil
}

// ListProviders retrieves all registered providers from Models as a Service via /v1/providers.
func (c *MaaSClient) ListProviders(ctx context.Context, baseURL, apiKey string) ([]models.MaaSProvider, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	const maxProvidersResponseBytes = 1 << 20 // 1 MiB
	body, err := c.getJSON(ctx, baseURL, apiKey, "ListProviders", "providers", maxProvidersResponseBytes, []string{
		"/v1/providers",
		"/v1/openai/v1/providers",
	})
	if err != nil {
		return nil, err
	}

	var envelope struct {
		Data      []models.MaaSProvider `json:"data"`
		Providers []models.MaaSProvider `json:"providers"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		var bare []models.MaaSProvider
		if errBare := json.Unmarshal(body, &bare); errBare == nil {
			return bare, nil
		}
		return nil, NewMaaSError(ErrCodeInternalError,
			fmt.Sprintf("failed to parse Models as a Service providers response: %s", err.Error()),
			http.StatusInternalServerError)
	}
	if len(envelope.Data) > 0 {
		return envelope.Data, nil
	}
	return envelope.Providers, nil
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
var _ MaaSClientInterface = (*MaaSClient)(nil)
var _ httpClientInterface = (*http.Client)(nil)
