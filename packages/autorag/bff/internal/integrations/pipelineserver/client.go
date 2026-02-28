package pipelineserver

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// PipelineServerClientInterface defines the interface for interacting with Kubeflow Pipelines API
type PipelineServerClientInterface interface {
	ListRuns(ctx context.Context, params *ListRunsParams) (*models.KFPipelineRunResponse, error)
	GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error)
}

// maxPipelineErrorBodySize limits the size of error response bodies to prevent memory exhaustion
// Error messages from upstream pipeline servers are capped at 64KB
const maxPipelineErrorBodySize = 64 * 1024 // 64 KB

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
		return nil, fmt.Errorf("pipeline server returned %d: %s", resp.StatusCode, errorMsg)
	}

	var response models.KFPipelineRunResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
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
		return nil, fmt.Errorf("pipeline server returned %d: %s", resp.StatusCode, errorMsg)
	}

	var run models.KFPipelineRun
	if err := json.NewDecoder(resp.Body).Decode(&run); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &run, nil
}
