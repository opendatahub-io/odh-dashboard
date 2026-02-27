package pipelineserver

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// PipelineServerClientInterface defines the interface for interacting with Kubeflow Pipelines API
type PipelineServerClientInterface interface {
	ListRuns(ctx context.Context, params *ListRunsParams) (*models.KFPipelineRunResponse, error)
	CreateRun(ctx context.Context, request models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error)
}

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
	httpClient *http.Client
}

// NewRealPipelineServerClient creates a new pipeline server client
func NewRealPipelineServerClient(baseURL string, httpClient *http.Client) *RealPipelineServerClient {
	return &RealPipelineServerClient{
		baseURL:    baseURL,
		httpClient: httpClient,
	}
}

// ListRuns queries the Kubeflow Pipelines API for runs
func (c *RealPipelineServerClient) ListRuns(ctx context.Context, params *ListRunsParams) (*models.KFPipelineRunResponse, error) {
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

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("pipeline server returned %d: %s", resp.StatusCode, string(body))
	}

	var response models.KFPipelineRunResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// CreateRun creates a new pipeline run via the KFP v2beta1 API.
// KFP returns 200 OK (not 201) for successful POST to /apis/v2beta1/runs.
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

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("pipeline server returned %d: %s", resp.StatusCode, string(respBody))
	}

	var runResponse models.KFPipelineRun
	if err := json.Unmarshal(respBody, &runResponse); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &runResponse, nil
}
