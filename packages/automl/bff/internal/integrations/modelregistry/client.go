package modelregistry

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// ModelRegistryClientInterface defines the contract for Model Registry API HTTP operations.
// baseURL is passed per call so a single client instance can serve multiple registry endpoints.
type ModelRegistryClientInterface interface {
	POST(ctx context.Context, baseURL, path string, body io.Reader) ([]byte, error)
}

// httpClientInterface wraps *http.Client for testing.
type httpClientInterface interface {
	Do(req *http.Request) (*http.Response, error)
}

// ModelRegistryClientConfig holds configuration for the default Model Registry client.
type ModelRegistryClientConfig struct {
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
	// WrapTransport optionally wraps the HTTP transport chain.
	// Pass corek8s.NewBearerTokenRoundTripper for user_token auth to inject
	// the calling user's Bearer token into every outbound request.
	WrapTransport func(http.RoundTripper) http.RoundTripper
}

// ModelRegistryClient is a stateless HTTP client for the Model Registry REST API.
// It holds no per-endpoint or per-request state — baseURL and auth are resolved at call time.
type ModelRegistryClient struct {
	httpClient httpClientInterface
}

// NewModelRegistryClient creates a client with an injectable HTTP client (for testing).
func NewModelRegistryClient(httpClient httpClientInterface) *ModelRegistryClient {
	return &ModelRegistryClient{httpClient: httpClient}
}

// NewDefaultModelRegistryClient creates a client with a real HTTP client.
func NewDefaultModelRegistryClient(cfg ModelRegistryClientConfig) *ModelRegistryClient {
	tlsCfg := &tls.Config{
		InsecureSkipVerify: cfg.InsecureSkipVerify, //nolint:gosec // caller-controlled knob
		MinVersion:         tls.VersionTLS12,
	}
	if cfg.RootCAs != nil {
		tlsCfg.RootCAs = cfg.RootCAs
	}

	var rt http.RoundTripper = &http.Transport{TLSClientConfig: tlsCfg}
	if cfg.WrapTransport != nil {
		rt = cfg.WrapTransport(rt)
	}

	return NewModelRegistryClient(&http.Client{
		Transport: rt,
		Timeout:   30 * time.Second,
	})
}

// POST makes a POST request to baseURL+path with the given body.
func (c *ModelRegistryClient) POST(ctx context.Context, baseURL, path string, body io.Reader) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+path, body)
	if err != nil {
		return nil, fmt.Errorf("failed to build POST request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("POST %s%s: %w", baseURL, path, err)
	}
	defer resp.Body.Close()

	const maxBytes = 10 * 1024 * 1024 // 10 MB
	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if err != nil {
		return nil, fmt.Errorf("reading response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, parseErrorResponse(resp.StatusCode, responseBody)
	}
	return responseBody, nil
}

// Compile-time checks.
var _ ModelRegistryClientInterface = (*ModelRegistryClient)(nil)
var _ httpClientInterface = (*http.Client)(nil)

// ErrorResponse represents an error response from the Model Registry API.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// HTTPError wraps Model Registry HTTP error responses.
type HTTPError struct {
	StatusCode int `json:"-"`
	ErrorResponse
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("model registry returned %d: %s", e.StatusCode, e.Message)
}

func parseErrorResponse(statusCode int, body []byte) *HTTPError {
	var errResp ErrorResponse
	if err := json.Unmarshal(body, &errResp); err != nil {
		errResp = ErrorResponse{
			Code:    strconv.Itoa(statusCode),
			Message: string(body),
		}
	}
	if errResp.Code == "" {
		errResp.Code = strconv.Itoa(statusCode)
	}
	return &HTTPError{StatusCode: statusCode, ErrorResponse: errResp}
}
