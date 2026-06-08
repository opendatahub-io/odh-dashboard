package modelregistry

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	neturl "net/url"
	"strconv"
	"strings"
	"time"

	"github.com/kubeflow/model-registry/pkg/openapi"
)

const (
	registeredModelsPath = "/registered_models"
	versionsPath         = "versions"
	modelVersionsPath    = "/model_versions"
	artifactsPath        = "artifacts"

	// DefaultArtifactType is the artifact type expected by the Model Registry API
	// for model binary artifacts.
	DefaultArtifactType = "model-artifact"
)

// ModelRegistryClientConfig holds configuration for the default Model Registry client.
type ModelRegistryClientConfig struct {
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool

	// WrapTransport optionally wraps the HTTP transport chain.
	// Pass corek8s.NewBearerTokenRoundTripper for user_token auth to inject
	// the calling user's Bearer token into every outbound request.
	// Pass corek8s.NewSATokenTransportWrapper for internal auth to inject
	// the pod's service account token.
	WrapTransport func(http.RoundTripper) http.RoundTripper
}

// ModelRegistryClient is a stateless HTTP client for the Model Registry REST API.
// It owns path construction, JSON marshaling/unmarshaling, and URL validation.
type ModelRegistryClient struct {
	httpClient httpClientInterface
}

// httpClientInterface wraps *http.Client for testing.
type httpClientInterface interface {
	Do(req *http.Request) (*http.Response, error)
}

// ModelRegistryClientInterface defines the contract for Model Registry API operations.
// baseURL is passed per call so a single client instance can serve multiple registry endpoints.
type ModelRegistryClientInterface interface {
	CreateRegisteredModel(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error)
	CreateModelVersion(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error)
	CreateModelArtifact(ctx context.Context, baseURL, versionID string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error)
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
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	})
}

func (c *ModelRegistryClient) CreateRegisteredModel(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
	if err := validateModelRegistryURL(baseURL); err != nil {
		return nil, err
	}
	resp, err := c.postJSON(ctx, baseURL, registeredModelsPath, body)
	if err != nil {
		return nil, fmt.Errorf("creating registered model: %w", err)
	}
	var result openapi.RegisteredModel
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("decoding registered model response: %w", err)
	}
	return &result, nil
}

func (c *ModelRegistryClient) CreateModelVersion(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
	if err := validateModelRegistryURL(baseURL); err != nil {
		return nil, err
	}
	path, err := neturl.JoinPath(registeredModelsPath, modelID, versionsPath)
	if err != nil {
		return nil, fmt.Errorf("building model version path: %w", err)
	}
	resp, err := c.postJSON(ctx, baseURL, path, body)
	if err != nil {
		return nil, fmt.Errorf("creating model version: %w", err)
	}
	var result openapi.ModelVersion
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("decoding model version response: %w", err)
	}
	return &result, nil
}

func (c *ModelRegistryClient) CreateModelArtifact(ctx context.Context, baseURL, versionID string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error) {
	if err := validateModelRegistryURL(baseURL); err != nil {
		return nil, err
	}
	if body.ArtifactType == nil {
		t := DefaultArtifactType
		body.ArtifactType = &t
	}
	path, err := neturl.JoinPath(modelVersionsPath, versionID, artifactsPath)
	if err != nil {
		return nil, fmt.Errorf("building model artifact path: %w", err)
	}
	resp, err := c.postJSON(ctx, baseURL, path, body)
	if err != nil {
		return nil, fmt.Errorf("creating model artifact: %w", err)
	}
	var result openapi.ModelArtifact
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("decoding model artifact response: %w", err)
	}
	return &result, nil
}

// postJSON marshals body to JSON and POSTs it to baseURL+path, returning the response bytes.
func (c *ModelRegistryClient) postJSON(ctx context.Context, baseURL, path string, body any) ([]byte, error) {
	b, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+path, bytes.NewBuffer(b))
	if err != nil {
		return nil, fmt.Errorf("building POST request: %w", err)
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

// validateModelRegistryURL ensures the registry URL is safe to use.
// Requires HTTPS unconditionally — registry URLs are always constructed
// with https:// by buildRegistryURLs, and HTTP is unsafe in all auth modes.
func validateModelRegistryURL(serverURL string) error {
	u, err := neturl.Parse(serverURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("invalid model registry URL: %q", serverURL)
	}
	if u.Scheme != "https" {
		return fmt.Errorf("model registry URL must use HTTPS (got %q)", serverURL)
	}
	if !strings.Contains(u.Path, "/api/model_registry/") {
		return fmt.Errorf("model registry URL path must contain /api/model_registry/: %q", serverURL)
	}
	return nil
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
