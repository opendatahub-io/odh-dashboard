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

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// maxPipelineErrorBodySize limits the size of error response bodies to prevent memory exhaustion.
const maxPipelineErrorBodySize = 64 * 1024 // 64 KB

// maxSuccessBodySize limits the size of success response bodies to prevent memory exhaustion.
const maxSuccessBodySize = 10 << 20 // 10 MB

// HttpClientInterface wraps http.Client for testing
type HttpClientInterface interface {
	Do(req *http.Request) (*http.Response, error)
}

// PipelinesClientInterface defines the contract for Pipelines API operations
type PipelinesClientInterface interface {
	// Pipeline Run operations
	CreatePipelineRun(ctx context.Context, baseURL string, req *CreatePipelineRunRequest) (*PipelineRun, error)
	GetPipelineRun(ctx context.Context, baseURL string, runID string) (*PipelineRun, error)
	ListPipelineRuns(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error)
	TerminateRun(ctx context.Context, baseURL string, runID string) error
	RetryRun(ctx context.Context, baseURL string, runID string) error
	DeleteRun(ctx context.Context, baseURL string, runID string) error

	// Pipeline operations
	ListPipelines(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error)
	GetPipelineVersion(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error)
	ListPipelineVersions(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error)
	CreatePipeline(ctx context.Context, baseURL string, name string) (*Pipeline, error)
	UploadPipelineVersion(ctx context.Context, baseURL string, pipelineID string, versionName string, fileContent []byte) (*PipelineVersion, error)
}

// PipelinesClient implements Pipelines API operations using HTTP
type PipelinesClient struct {
	HttpClient HttpClientInterface
}

// PipelinesClientConfig for injectable constructor (testing)
type PipelinesClientConfig struct {
	// Minimal config for testing with mock HTTP client
}

// DefaultPipelinesClientConfig for default constructor (production)
type DefaultPipelinesClientConfig struct {
	// InsecureSkipVerify controls whether the client verifies the server's certificate chain and host name.
	// If true, accepts any certificate presented by the server and any host name in that certificate.
	// Should only be used for local development/testing, never in production.
	InsecureSkipVerify bool
	// RootCAs defines the set of root certificate authorities that clients use when verifying server certificates.
	// If nil, the default system root CAs are used.
	RootCAs *x509.CertPool
}

// NewPipelinesClient creates a client with injectable HTTP client (for testing)
func NewPipelinesClient(cfg PipelinesClientConfig, httpClient HttpClientInterface) *PipelinesClient {
	return &PipelinesClient{
		HttpClient: httpClient,
	}
}

// NewDefaultPipelinesClient creates a client with real HTTP client configured for
// token-based authentication. The token is extracted per-request from the context
// via IdentityFromContext and injected via a RoundTripper.
func NewDefaultPipelinesClient(cfg DefaultPipelinesClientConfig) *PipelinesClient {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.MaxIdleConns = 100
	transport.MaxIdleConnsPerHost = 100

	// Configure TLS settings if provided
	if cfg.InsecureSkipVerify || cfg.RootCAs != nil {
		if transport.TLSClientConfig == nil {
			transport.TLSClientConfig = &tls.Config{}
		}
		transport.TLSClientConfig.InsecureSkipVerify = cfg.InsecureSkipVerify
		if cfg.RootCAs != nil {
			transport.TLSClientConfig.RootCAs = cfg.RootCAs
		}
	}

	httpClient := &http.Client{
		Transport: &pipelinesRoundTripper{
			base: transport,
		},
	}

	return &PipelinesClient{
		HttpClient: httpClient,
	}
}

// pipelinesRoundTripper injects bearer token into requests
type pipelinesRoundTripper struct {
	base http.RoundTripper
}

func (t *pipelinesRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	identity, err := k8s.IdentityFromContext(req.Context())
	if err != nil {
		return nil, fmt.Errorf("missing identity in context: %w", err)
	}

	reqClone := req.Clone(req.Context())
	reqClone.Header.Set("Authorization", "Bearer "+identity.Token)
	return t.base.RoundTrip(reqClone)
}

// CreatePipelineRun creates a new pipeline run
func (c *PipelinesClient) CreatePipelineRun(ctx context.Context, baseURL string, reqData *CreatePipelineRunRequest) (*PipelineRun, error) {
	// Marshal request to KFP JSON format
	kfpReq := map[string]any{
		"display_name": reqData.DisplayName,
	}
	if reqData.PipelineID != "" {
		kfpReq["pipeline_id"] = reqData.PipelineID
	}
	if reqData.PipelineVersionID != "" {
		kfpReq["pipeline_version_id"] = reqData.PipelineVersionID
	}
	if reqData.RuntimeConfig != nil {
		kfpReq["runtime_config"] = reqData.RuntimeConfig
	}

	body, err := json.Marshal(kfpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs", baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	// Parse KFP JSON response to domain model
	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPRun(kfpResp), nil
}

// GetPipelineRun retrieves a single pipeline run by ID
func (c *PipelinesClient) GetPipelineRun(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
	if runID == "" {
		return nil, fmt.Errorf("runID is required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPRun(kfpResp), nil
}

// ListPipelineRuns queries the Kubeflow Pipelines API for runs
func (c *PipelinesClient) ListPipelineRuns(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
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

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPRunsResponse(kfpResp), nil
}

// TerminateRun terminates a running pipeline
func (c *PipelinesClient) TerminateRun(ctx context.Context, baseURL string, runID string) error {
	if runID == "" {
		return fmt.Errorf("runID is required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s:terminate", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return readHTTPError(resp)
	}

	return nil
}

// RetryRun retries a failed pipeline run
func (c *PipelinesClient) RetryRun(ctx context.Context, baseURL string, runID string) error {
	if runID == "" {
		return fmt.Errorf("runID is required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s:retry", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return readHTTPError(resp)
	}

	return nil
}

// DeleteRun deletes a pipeline run
func (c *PipelinesClient) DeleteRun(ctx context.Context, baseURL string, runID string) error {
	if runID == "" {
		return fmt.Errorf("runID is required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s", baseURL, url.PathEscape(runID))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, apiURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return readHTTPError(resp)
	}

	return nil
}

// ListPipelines retrieves all pipelines, paging through results
func (c *PipelinesClient) ListPipelines(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
	var allPipelines []Pipeline
	var totalSize int32
	pageToken := ""

	for {
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

		resp, err := c.HttpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to execute request: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			err := readHTTPError(resp)
			resp.Body.Close()
			return nil, err
		}

		var kfpResp map[string]any
		err = json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		page := parseKFPPipelinesResponse(kfpResp)
		allPipelines = append(allPipelines, page.Pipelines...)
		totalSize = page.TotalSize

		if page.NextPageToken == "" {
			break
		}
		pageToken = page.NextPageToken
	}

	return &PipelinesResponse{
		Pipelines:     allPipelines,
		TotalSize:     totalSize,
		NextPageToken: "",
	}, nil
}

// GetPipelineVersion retrieves a pipeline version
func (c *PipelinesClient) GetPipelineVersion(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
	if pipelineID == "" || versionID == "" {
		return nil, fmt.Errorf("pipelineID and versionID are required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/%s/versions/%s",
		baseURL, url.PathEscape(pipelineID), url.PathEscape(versionID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPPipelineVersion(kfpResp), nil
}

// ListPipelineVersions retrieves all versions for a pipeline
func (c *PipelinesClient) ListPipelineVersions(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
	if pipelineID == "" {
		return nil, fmt.Errorf("pipelineID is required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/%s/versions", baseURL, url.PathEscape(pipelineID))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPVersionsResponse(kfpResp), nil
}

// CreatePipeline creates a new pipeline
func (c *PipelinesClient) CreatePipeline(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
	if name == "" {
		return nil, fmt.Errorf("name is required")
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

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPPipeline(kfpResp), nil
}

// UploadPipelineVersion uploads a new pipeline version from file content
func (c *PipelinesClient) UploadPipelineVersion(ctx context.Context, baseURL string, pipelineID string, versionName string, fileContent []byte) (*PipelineVersion, error) {
	if pipelineID == "" || versionName == "" {
		return nil, fmt.Errorf("pipelineID and versionName are required")
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

	resp, err := c.HttpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, readHTTPError(resp)
	}

	var kfpResp map[string]any
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&kfpResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return parseKFPPipelineVersion(kfpResp), nil
}

// readHTTPError reads and formats an HTTP error response
func readHTTPError(resp *http.Response) error {
	limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
	body, _ := io.ReadAll(limitedReader)
	_, _ = io.Copy(io.Discard, resp.Body)

	errorMsg := string(body)
	if len(body) == maxPipelineErrorBodySize {
		errorMsg += " (truncated)"
	}

	return &HTTPError{
		StatusCode: resp.StatusCode,
		Message:    errorMsg,
	}
}

// HTTPError represents an HTTP error response
type HTTPError struct {
	StatusCode int
	Message    string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("pipeline server returned %d: %s", e.StatusCode, e.Message)
}

// Helper functions to parse KFP JSON responses to domain models
// These handle the JSON unmarshaling internally - no business logic

func parseKFPRun(data map[string]any) *PipelineRun {
	run := &PipelineRun{}
	if v, ok := data["run_id"].(string); ok {
		run.RunID = v
	}
	if v, ok := data["display_name"].(string); ok {
		run.DisplayName = v
	}
	if v, ok := data["pipeline_id"].(string); ok {
		run.PipelineID = v
	}
	if v, ok := data["pipeline_version_id"].(string); ok {
		run.PipelineVersionID = v
	}
	if v, ok := data["status"].(string); ok {
		run.Status = v
	}
	// Parse timestamps, runtime_config, error if needed
	return run
}

func parseKFPRunsResponse(data map[string]any) *PipelineRunResponse {
	resp := &PipelineRunResponse{}
	if v, ok := data["total_size"].(float64); ok {
		resp.TotalSize = int32(v)
	}
	if v, ok := data["next_page_token"].(string); ok {
		resp.NextPageToken = v
	}
	if runs, ok := data["runs"].([]any); ok {
		for _, r := range runs {
			if runMap, ok := r.(map[string]any); ok {
				resp.Runs = append(resp.Runs, *parseKFPRun(runMap))
			}
		}
	}
	return resp
}

func parseKFPPipeline(data map[string]any) *Pipeline {
	p := &Pipeline{}
	if v, ok := data["pipeline_id"].(string); ok {
		p.PipelineID = v
	}
	if v, ok := data["display_name"].(string); ok {
		p.DisplayName = v
	}
	if v, ok := data["description"].(string); ok {
		p.Description = v
	}
	return p
}

func parseKFPPipelinesResponse(data map[string]any) *PipelinesResponse {
	resp := &PipelinesResponse{}
	if v, ok := data["total_size"].(float64); ok {
		resp.TotalSize = int32(v)
	}
	if v, ok := data["next_page_token"].(string); ok {
		resp.NextPageToken = v
	}
	if pipelines, ok := data["pipelines"].([]any); ok {
		for _, p := range pipelines {
			if pMap, ok := p.(map[string]any); ok {
				resp.Pipelines = append(resp.Pipelines, *parseKFPPipeline(pMap))
			}
		}
	}
	return resp
}

func parseKFPPipelineVersion(data map[string]any) *PipelineVersion {
	v := &PipelineVersion{}
	if val, ok := data["pipeline_version_id"].(string); ok {
		v.PipelineVersionID = val
	}
	if val, ok := data["pipeline_id"].(string); ok {
		v.PipelineID = val
	}
	if val, ok := data["display_name"].(string); ok {
		v.DisplayName = val
	}
	if val, ok := data["description"].(string); ok {
		v.Description = val
	}
	if val, ok := data["pipeline_spec"].(string); ok {
		v.PipelineSpec = &val
	}
	return v
}

func parseKFPVersionsResponse(data map[string]any) *PipelineVersionsResponse {
	resp := &PipelineVersionsResponse{}
	if v, ok := data["total_size"].(float64); ok {
		resp.TotalSize = int32(v)
	}
	if v, ok := data["next_page_token"].(string); ok {
		resp.NextPageToken = v
	}
	if versions, ok := data["pipeline_versions"].([]any); ok {
		for _, ver := range versions {
			if vMap, ok := ver.(map[string]any); ok {
				resp.PipelineVersions = append(resp.PipelineVersions, *parseKFPPipelineVersion(vMap))
			}
		}
	}
	return resp
}
