package pipelineserver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"

	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

// HTTPError represents an HTTP error response from the pipeline server
type HTTPError struct {
	StatusCode int
	Message    string
}

// Error implements the error interface
func (e *HTTPError) Error() string {
	return fmt.Sprintf("pipeline server returned %d: %s", e.StatusCode, e.Message)
}

// Status returns the HTTP status code
func (e *HTTPError) Status() int {
	return e.StatusCode
}

// PipelineServerClientInterface defines the interface for interacting with Kubeflow Pipelines API
type PipelineServerClientInterface interface {
	ListRuns(ctx context.Context, params *ListRunsParams) (*models.KFPipelineRunResponse, error)
	GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error)
	CreateRun(ctx context.Context, request models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error)
	ListPipelines(ctx context.Context, filter string) (*models.KFPipelinesResponse, error)
	ListPipelineVersions(ctx context.Context, pipelineID string) (*models.KFPipelineVersionsResponse, error)
	GetPipelineVersion(ctx context.Context, pipelineID, versionID string) (*models.KFPipelineVersion, error)
	CreatePipeline(ctx context.Context, name string) (*models.KFPipeline, error)
	UploadPipelineVersion(ctx context.Context, pipelineID string, versionName string, fileContent []byte) (*models.KFPipelineVersion, error)
}

// maxPipelineErrorBodySize limits the size of error response bodies to prevent memory exhaustion.
// Error messages from upstream pipeline servers are capped at 64 KB.
const maxPipelineErrorBodySize = 64 * 1024 // 64 KB

// maxSuccessBodySize limits the size of success response bodies to prevent memory exhaustion.
// Pipeline server responses are capped at 10 MB, mirroring the bound applied to error bodies.
const maxSuccessBodySize = 10 << 20 // 10 MB

// ListRunsParams contains parameters for listing pipeline runs
type ListRunsParams struct {
	PageSize  int32
	PageToken string
	SortBy    string
	Filter    string
}

// RealPipelineServerClient implements PipelineServerClientInterface using HTTP
type RealPipelineServerClient struct {
	baseURL    string
	authToken  string
	httpClient *http.Client
}

// NewRealPipelineServerClient creates a new pipeline server client
func NewRealPipelineServerClient(baseURL string, authToken string, httpClient *http.Client) *RealPipelineServerClient {
	if httpClient == nil {
		// Use a client with timeout instead of http.DefaultClient (which has no timeout)
		httpClient = &http.Client{
			Timeout: 30 * time.Second,
		}
	}
	return &RealPipelineServerClient{
		baseURL:    baseURL,
		authToken:  authToken,
		httpClient: httpClient,
	}
}

// ListRuns queries the Kubeflow Pipelines API for runs
func (c *RealPipelineServerClient) ListRuns(ctx context.Context, params *ListRunsParams) (*models.KFPipelineRunResponse, error) {
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

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs?%s", c.baseURL, queryParams.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add auth token if provided
	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Use bounded read to prevent memory exhaustion from large error responses
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		body, _ := io.ReadAll(limitedReader)

		// Drain and close the body properly
		_, _ = io.Copy(io.Discard, resp.Body)

		errorMsg := string(body)
		// Indicate truncation if we hit the size limit
		if len(body) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Message:    errorMsg,
		}
	}

	var response models.KFPipelineRunResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// GetRun retrieves a single pipeline run by ID from the Kubeflow Pipelines API
func (c *RealPipelineServerClient) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	if runID == "" {
		return nil, fmt.Errorf("runID is required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs/%s", c.baseURL, url.PathEscape(runID))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		body, _ := io.ReadAll(limitedReader)
		_, _ = io.Copy(io.Discard, resp.Body)

		errorMsg := string(body)
		if len(body) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Message:    errorMsg,
		}
	}

	var run models.KFPipelineRun
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&run); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &run, nil
}

// GetPipelineVersion retrieves a pipeline version (including its pipeline_spec) from the KFP API
func (c *RealPipelineServerClient) GetPipelineVersion(ctx context.Context, pipelineID, versionID string) (*models.KFPipelineVersion, error) {
	if pipelineID == "" || versionID == "" {
		return nil, fmt.Errorf("pipelineID and versionID are required")
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/%s/versions/%s",
		c.baseURL, url.PathEscape(pipelineID), url.PathEscape(versionID))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		body, _ := io.ReadAll(limitedReader)
		_, _ = io.Copy(io.Discard, resp.Body)

		errorMsg := string(body)
		if len(body) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{StatusCode: resp.StatusCode, Message: errorMsg}
	}

	var version models.KFPipelineVersion
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&version); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &version, nil
}

// ListPipelines retrieves all pipelines from the Kubeflow Pipelines API v2beta1,
// paging through results until the last page is reached.
//
// An optional filter (KFP predicate JSON) can be passed to narrow results on the
// server side. Each page is fetched with a fixed page size; the next_page_token
// from each response is used to request the following page. All pipelines are
// aggregated into a single response before returning.
//
// Parameters:
//   - filter: KFP predicate JSON, or empty string for no filter
//
// Returns:
//   - *models.KFPipelinesResponse: Combined list of pipelines with IDs, names, and metadata
//   - error: If any request fails or any response cannot be decoded
func (c *RealPipelineServerClient) ListPipelines(ctx context.Context, filter string) (*models.KFPipelinesResponse, error) {
	var allPipelines []models.KFPipeline
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
		apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines?%s", c.baseURL, queryParams.Encode())

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		if c.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to execute request: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
			body, _ := io.ReadAll(limitedReader)
			_, _ = io.Copy(io.Discard, resp.Body)
			resp.Body.Close()

			errorMsg := string(body)
			if len(body) == maxPipelineErrorBodySize {
				errorMsg += " (truncated)"
			}
			return nil, &HTTPError{
				StatusCode: resp.StatusCode,
				Message:    errorMsg,
			}
		}

		var page models.KFPipelinesResponse
		err = json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&page)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}

		allPipelines = append(allPipelines, page.Pipelines...)
		totalSize = page.TotalSize // KFP reports the total across all pages on every page

		if page.NextPageToken == "" {
			break
		}
		pageToken = page.NextPageToken
	}

	return &models.KFPipelinesResponse{
		Pipelines: allPipelines,
		TotalSize: totalSize,
	}, nil
}

// ListPipelineVersions retrieves all versions for a specific pipeline from the KFP v2beta1 API,
// sorted by creation time descending so the most recently created version is first.
//
// This method queries the /apis/v2beta1/pipelines/{pipelineID}/versions endpoint to get
// all available versions of a pipeline. Used by pipeline discovery to get the version ID
// of the discovered AutoML pipeline.
//
// Parameters:
//   - pipelineID: The unique identifier of the pipeline (required)
//
// Returns:
//   - *models.KFPipelineVersionsResponse: List of versions with IDs, names, and metadata
//   - error: If pipelineID is empty, the request fails, or the response cannot be decoded
func (c *RealPipelineServerClient) ListPipelineVersions(ctx context.Context, pipelineID string) (*models.KFPipelineVersionsResponse, error) {
	if pipelineID == "" {
		return nil, fmt.Errorf("pipelineID is required")
	}

	queryParams := url.Values{}
	queryParams.Set("sort_by", "created_at desc")
	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/%s/versions?%s", c.baseURL, url.PathEscape(pipelineID), queryParams.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		body, _ := io.ReadAll(limitedReader)
		_, _ = io.Copy(io.Discard, resp.Body)

		errorMsg := string(body)
		if len(body) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Message:    errorMsg,
		}
	}

	var response models.KFPipelineVersionsResponse
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// CreateRun creates a new pipeline run via the KFP v2beta1 API.
func (c *RealPipelineServerClient) CreateRun(ctx context.Context, request models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error) {
	body, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/runs", c.baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		respBody, _ := io.ReadAll(limitedReader)
		_, _ = io.Copy(io.Discard, resp.Body)

		errorMsg := string(respBody)
		if len(respBody) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Message:    errorMsg,
		}
	}

	var runResponse models.KFPipelineRun
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&runResponse); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &runResponse, nil
}

// CreatePipeline creates a pipeline shell (no version) via JSON POST to /apis/v2beta1/pipelines.
func (c *RealPipelineServerClient) CreatePipeline(ctx context.Context, name string) (*models.KFPipeline, error) {
	if name == "" {
		return nil, fmt.Errorf("pipeline name cannot be empty")
	}

	body, err := json.Marshal(map[string]string{"display_name": name})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines", c.baseURL)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		respBody, _ := io.ReadAll(limitedReader)
		_, _ = io.Copy(io.Discard, resp.Body)
		errorMsg := string(respBody)
		if len(respBody) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{StatusCode: resp.StatusCode, Message: errorMsg}
	}

	var pipeline models.KFPipeline
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&pipeline); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}
	return &pipeline, nil
}

// UploadPipelineVersion uploads a pipeline YAML as a named version of an existing pipeline
// via multipart POST to /apis/v2beta1/pipelines/upload_version.
func (c *RealPipelineServerClient) UploadPipelineVersion(ctx context.Context, pipelineID string, versionName string, fileContent []byte) (*models.KFPipelineVersion, error) {
	if pipelineID == "" {
		return nil, fmt.Errorf("pipeline ID cannot be empty")
	}
	if versionName == "" {
		return nil, fmt.Errorf("version name cannot be empty")
	}
	if len(fileContent) == 0 {
		return nil, fmt.Errorf("pipeline file content cannot be empty")
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("uploadfile", "uploadedFile.yaml")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := part.Write(fileContent); err != nil {
		return nil, fmt.Errorf("failed to write file content: %w", err)
	}
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	queryParams := url.Values{}
	queryParams.Set("name", versionName)
	queryParams.Set("display_name", versionName)
	queryParams.Set("pipelineid", pipelineID)
	apiURL := fmt.Sprintf("%s/apis/v2beta1/pipelines/upload_version?%s", c.baseURL, queryParams.Encode())

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, &buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if c.authToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.authToken))
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		limitedReader := io.LimitReader(resp.Body, maxPipelineErrorBodySize)
		respBody, _ := io.ReadAll(limitedReader)
		_, _ = io.Copy(io.Discard, resp.Body)
		errorMsg := string(respBody)
		if len(respBody) == maxPipelineErrorBodySize {
			errorMsg += " (truncated)"
		}
		return nil, &HTTPError{StatusCode: resp.StatusCode, Message: errorMsg}
	}

	var version models.KFPipelineVersion
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxSuccessBodySize)).Decode(&version); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}
	return &version, nil
}
