package pipelines

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// maxPipelineErrorBodySize limits the size of error response bodies to prevent memory exhaustion.
const maxPipelineErrorBodySize = 64 * 1024 // 64 KB

// maxSuccessBodySize limits the size of success response bodies to prevent memory exhaustion.
const maxSuccessBodySize = 10 << 20 // 10 MB

// maxPaginationPages caps auto-paginating client methods to prevent unbounded iteration.
const maxPaginationPages = 100

// HTTPClient wraps http.Client for testing.
type HTTPClient interface {
	Do(req *http.Request) (*http.Response, error)
}

// ClientConfig configures the pipelines client.
type ClientConfig struct {
	InsecureSkipVerify bool
	RootCAs            *x509.CertPool
	// WrapTransport optionally wraps the HTTP transport chain.
	// Used by consumers (e.g. automl dev mode) to inject port-forwarding
	// or other transport-level concerns without leaking them into the service layer.
	WrapTransport func(http.RoundTripper) http.RoundTripper
}

// NewClient creates a client with an injectable HTTP client (for testing).
func NewClient(c HTTPClient) Client {
	return &client{
		HTTPClient: c,
	}
}

// NewDefaultClient creates a client with a real HTTP client configured for
// token-based authentication. The token is extracted per-request from the context
// via IdentityFromContext and injected via a RoundTripper.
func NewDefaultClient(cfg ClientConfig) Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.MaxIdleConns = 100
	transport.MaxIdleConnsPerHost = 100
	transport.ResponseHeaderTimeout = 20 * time.Second

	if cfg.InsecureSkipVerify || cfg.RootCAs != nil {
		if transport.TLSClientConfig == nil {
			transport.TLSClientConfig = &tls.Config{}
		}
		transport.TLSClientConfig.InsecureSkipVerify = cfg.InsecureSkipVerify
		if cfg.RootCAs != nil {
			transport.TLSClientConfig.RootCAs = cfg.RootCAs
		}
	}

	// Transport chain: auth (outermost) → caller wrapper (e.g. port-forward) → base HTTP
	var base http.RoundTripper = transport
	if cfg.WrapTransport != nil {
		base = cfg.WrapTransport(base)
	}

	hc := &http.Client{
		Transport: k8s.NewBearerTokenRoundTripper(base),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	return &client{
		HTTPClient: hc,
	}
}

// client implements Client using HTTP
type client struct {
	HTTPClient HTTPClient
}

// CreatePipelineRun creates a new pipeline run
func (c *client) CreatePipelineRun(ctx context.Context, baseURL string, input *CreatePipelineRunInput) (*PipelineRun, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	body, err := json.Marshal(input)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs", baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var run PipelineRun
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&run); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &run, nil
}

// GetPipelineRun retrieves a single pipeline run by ID
func (c *client) GetPipelineRun(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if runID == "" {
		return nil, fmt.Errorf("%w: runID is required", ErrInvalidInput)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var run PipelineRun
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&run); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &run, nil
}

// ListPipelineRuns queries the Kubeflow Pipelines API for runs
func (c *client) ListPipelineRuns(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if params == nil {
		params = &ListRunsParams{}
	}

	queryParams := url.Values{}
	if params.PageSize > 0 {
		queryParams.Set("page_size", fmt.Sprintf("%d", params.PageSize))
	}
	if params.PageToken != "" {
		queryParams.Set("page_token", params.PageToken)
	}
	if params.SortBy != "" {
		queryParams.Set("sort_by", params.SortBy)
	}
	if params.Filter != "" {
		queryParams.Set("filter", params.Filter)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs?%s", baseURL, queryParams.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var response PipelineRunResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// TerminateRun terminates a running pipeline
func (c *client) TerminateRun(ctx context.Context, baseURL string, runID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if runID == "" {
		return fmt.Errorf("%w: runID is required", ErrInvalidInput)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s:terminate", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return readhttpError(resp)
	}

	return nil
}

// RetryRun retries a failed pipeline run
func (c *client) RetryRun(ctx context.Context, baseURL string, runID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if runID == "" {
		return fmt.Errorf("%w: runID is required", ErrInvalidInput)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s:retry", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return readhttpError(resp)
	}

	return nil
}

// DeleteRun deletes a pipeline run
func (c *client) DeleteRun(ctx context.Context, baseURL string, runID string) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if runID == "" {
		return fmt.Errorf("%w: runID is required", ErrInvalidInput)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return readhttpError(resp)
	}

	return nil
}

// ListPipelines retrieves all pipelines, paging through results.
// Capped at maxPaginationPages to prevent unbounded iteration from a malicious server.
func (c *client) ListPipelines(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var allPipelines []Pipeline
	var totalSize int32
	pageToken := ""

	for range maxPaginationPages {
		queryParams := url.Values{}
		if filter != "" {
			queryParams.Set("filter", filter)
		}
		if pageToken != "" {
			queryParams.Set("page_token", pageToken)
		}

		apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines?%s", baseURL, queryParams.Encode())
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to execute request: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			err := readhttpError(resp)
			resp.Body.Close()
			return nil, err
		}

		var page PipelinesResponse
		err = json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&page)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		allPipelines = append(allPipelines, page.Pipelines...)
		totalSize = page.TotalSize

		if page.NextPageToken == "" {
			return &PipelinesResponse{
				Pipelines: allPipelines,
				TotalSize: totalSize,
			}, nil
		}
		pageToken = page.NextPageToken
	}

	return nil, fmt.Errorf("pipeline listing exceeded maximum pagination pages (%d)", maxPaginationPages)
}

// GetPipelineVersion retrieves a pipeline version
func (c *client) GetPipelineVersion(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if pipelineID == "" || versionID == "" {
		return nil, fmt.Errorf("%w: pipelineID and versionID are required", ErrInvalidInput)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/%s/versions/%s",
		baseURL, url.PathEscape(pipelineID), url.PathEscape(versionID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var version PipelineVersion
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&version); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &version, nil
}

// ListPipelineVersions retrieves all versions for a pipeline
func (c *client) ListPipelineVersions(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if pipelineID == "" {
		return nil, fmt.Errorf("%w: pipelineID is required", ErrInvalidInput)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/%s/versions", baseURL, url.PathEscape(pipelineID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var response PipelineVersionsResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// CreatePipeline creates a new pipeline
func (c *client) CreatePipeline(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	if name == "" {
		return nil, fmt.Errorf("%w: name is required", ErrInvalidInput)
	}

	requestBody := map[string]string{"display_name": name}
	body, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines", baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var pipeline Pipeline
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&pipeline); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &pipeline, nil
}

// UploadPipelineVersion uploads a new pipeline version from file content
func (c *client) UploadPipelineVersion(ctx context.Context, baseURL string, pipelineID string, versionName string, fileContent []byte) (*PipelineVersion, error) {
	ctx, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	if pipelineID == "" || versionName == "" {
		return nil, fmt.Errorf("%w: pipelineID and versionName are required", ErrInvalidInput)
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("uploadfile", "pipeline.yaml")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := part.Write(fileContent); err != nil {
		return nil, fmt.Errorf("failed to write file content: %w", err)
	}
	if err := writer.WriteField("name", versionName); err != nil {
		return nil, fmt.Errorf("failed to write name field: %w", err)
	}
	if err := writer.WriteField("pipelineid", pipelineID); err != nil {
		return nil, fmt.Errorf("failed to write pipelineid field: %w", err)
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/upload_version", baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, &buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readhttpError(resp)
	}

	var version PipelineVersion
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&version); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &version, nil
}

// httpError represents an unhandled HTTP error response from the pipeline server.
// Known status codes (404, 409) are translated to domain errors by readhttpError;
// this type is returned only for codes without a domain mapping.
type httpError struct {
	StatusCode int
	Message    string
}

func (e *httpError) Error() string {
	return fmt.Sprintf("pipeline server returned %d: %s", e.StatusCode, e.Message)
}

// readhttpError reads an HTTP error response and translates known status codes
// into domain errors so the service layer never needs to inspect HTTP codes.
func readhttpError(resp *http.Response) error {
	limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
	body, _ := io.ReadAll(limitedReader)

	errorMsg := string(body)
	if len(body) == maxPipelineErrorBodySize {
		errorMsg += " (truncated)"
	}

	httpErr := &httpError{
		StatusCode: resp.StatusCode,
		Message:    errorMsg,
	}

	switch resp.StatusCode {
	case http.StatusNotFound:
		return fmt.Errorf("%w: %s", ErrPipelineNotFound, httpErr)
	case http.StatusConflict:
		return fmt.Errorf("%w: %s", k8s.ErrConflict, httpErr)
	default:
		return httpErr
	}
}

// Compile-time interface checks.
var _ Client = (*client)(nil)
var _ HTTPClient = (*http.Client)(nil)
