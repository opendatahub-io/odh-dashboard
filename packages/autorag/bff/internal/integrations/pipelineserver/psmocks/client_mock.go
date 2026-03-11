package psmocks

import (
	"context"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MockPipelineServerClient provides mock data for development
type MockPipelineServerClient struct {
	// Namespace determines which mock data set to return (default: 5 runs, bella: empty, bento: 30 runs)
	Namespace string
	// LastListRunsParams records the last parameters passed to ListRuns for test assertions
	LastListRunsParams *pipelineserver.ListRunsParams
	// LastGetRunID records the last runID passed to GetRun for test assertions
	LastGetRunID string
}

// NewMockPipelineServerClient creates a new mock pipeline server client.
// baseURL can be "mock://namespace" to get namespace-specific mock data for UX testing.
func NewMockPipelineServerClient(baseURL string) *MockPipelineServerClient {
	namespace := ""
	if strings.HasPrefix(baseURL, "mock://") {
		namespace = strings.TrimPrefix(baseURL, "mock://")
	}
	return &MockPipelineServerClient{Namespace: namespace}
}

// getMockRunCount returns the number of runs per namespace for UX testing:
// - default: 5 runs
// - bella: 0 runs (empty state)
// - bento: 30 runs (pagination testing, >25)
// - test-namespace: 3 runs (for unit tests)
// - other: 5 runs (fallback)
func getMockRunCount(namespace string) int {
	switch strings.ToLower(namespace) {
	case "default":
		return 5
	case "bella-namespace":
		return 0
	case "bento-namespace":
		return 30
	case "test-namespace":
		return 3
	default:
		return 5
	}
}

// ListRuns returns mock pipeline run data with support for filtering and pagination.
// Returns namespace-specific counts for UX testing: default=5, bella=0, bento=30.
func (m *MockPipelineServerClient) ListRuns(ctx context.Context, params *pipelineserver.ListRunsParams) (*models.KFPipelineRunResponse, error) {
	// Record params for test assertions
	m.LastListRunsParams = params

	// Get runs for this namespace (count varies for UX testing)
	allRuns := getMockRunsForNamespace(m.Namespace)

	// Apply filtering if filter parameter is provided
	filteredRuns := allRuns
	if params != nil && params.Filter != "" {
		pipelineVersionID := extractPipelineVersionIDFromFilter(params.Filter)
		if pipelineVersionID != "" {
			var matched []models.KFPipelineRun
			for _, run := range allRuns {
				if run.PipelineVersionReference != nil &&
					run.PipelineVersionReference.PipelineVersionID == pipelineVersionID {
					matched = append(matched, run)
				}
			}
			filteredRuns = matched
		}
	}

	// Apply pagination
	pageSize := int32(20) // default page size
	if params != nil && params.PageSize > 0 {
		pageSize = params.PageSize
	}

	// Parse page token to get offset
	offset := int32(0)
	if params != nil && params.PageToken != "" {
		if parsedOffset, err := strconv.ParseInt(params.PageToken, 10, 32); err == nil {
			offset = int32(parsedOffset)
		}
	}

	// Calculate slice bounds
	start := offset
	end := offset + pageSize
	totalSize := int32(len(filteredRuns))

	// Ensure bounds are within range
	if start > totalSize {
		start = totalSize
	}
	if end > totalSize {
		end = totalSize
	}

	// Get the page slice
	pagedRuns := filteredRuns[start:end]

	// Calculate next page token
	nextPageToken := ""
	if end < totalSize {
		nextPageToken = fmt.Sprintf("%d", end)
	}

	return &models.KFPipelineRunResponse{
		Runs:          pagedRuns,
		TotalSize:     totalSize,
		NextPageToken: nextPageToken,
	}, nil
}

// getMockRunsForNamespace returns mock runs for the given namespace.
// Uses getMockRunCount for UX testing: default=5, bella=0, bento=30.
func getMockRunsForNamespace(namespace string) []models.KFPipelineRun {
	count := getMockRunCount(namespace)
	if count == 0 {
		return nil
	}
	baseRuns := getBaseMockRuns()
	if count <= len(baseRuns) {
		return baseRuns[:count]
	}
	// Expand: cycle through base runs with unique IDs
	result := make([]models.KFPipelineRun, 0, count)
	for i := 0; i < count; i++ {
		template := &baseRuns[i%len(baseRuns)]
		run := cloneRunWithVariant(template, i)
		result = append(result, run)
	}
	return result
}

// getBaseMockRuns returns the base run templates
func getBaseMockRuns() []models.KFPipelineRun {
	return []models.KFPipelineRun{
		{
			RunID:        "run-abc123-def456",
			DisplayName:  "AutoRAG Optimization Run 1",
			Description:  "Test optimization run",
			ExperimentID: "exp-123",
			PipelineVersionReference: &models.PipelineVersionReference{
				PipelineID:        "9e3940d5-b275-4b64-be10-b914cd06c58e",
				PipelineVersionID: "22e57c06-030f-4c63-900d-0a808d577899",
			},
			State:          "SUCCEEDED",
			StorageState:   "AVAILABLE",
			ServiceAccount: "pipeline-runner-dspa",
			CreatedAt:      "2026-02-24T10:30:00Z",
			ScheduledAt:    "2026-02-24T10:30:00Z",
			FinishedAt:     "2026-02-24T11:15:00Z",
			StateHistory: []models.RuntimeStatus{
				{
					UpdateTime: "2026-02-24T10:30:00Z",
					State:      "RUNNING",
				},
				{
					UpdateTime: "2026-02-24T11:15:00Z",
					State:      "SUCCEEDED",
				},
			},
			RunDetails: &models.RunDetails{
				TaskDetails: []models.TaskDetail{
					{
						RunID:       "run-abc123-def456",
						TaskID:      "task-data-preprocessing",
						DisplayName: "Data Preprocessing",
						CreateTime:  "2026-02-24T10:30:00Z",
						StartTime:   "2026-02-24T10:30:05Z",
						EndTime:     "2026-02-24T10:35:00Z",
						State:       "SUCCEEDED",
						ChildTasks: []models.ChildTask{
							{PodName: "data-preprocessing-pod-abc123"},
						},
					},
					{
						RunID:       "run-abc123-def456",
						TaskID:      "task-model-training",
						DisplayName: "Model Training",
						CreateTime:  "2026-02-24T10:30:00Z",
						StartTime:   "2026-02-24T10:35:10Z",
						EndTime:     "2026-02-24T11:10:00Z",
						State:       "SUCCEEDED",
						ChildTasks: []models.ChildTask{
							{PodName: "model-training-pod-def456"},
						},
					},
					{
						RunID:       "run-abc123-def456",
						TaskID:      "task-model-evaluation",
						DisplayName: "Model Evaluation",
						CreateTime:  "2026-02-24T10:30:00Z",
						StartTime:   "2026-02-24T11:10:10Z",
						EndTime:     "2026-02-24T11:15:00Z",
						State:       "SUCCEEDED",
						ChildTasks: []models.ChildTask{
							{PodName: "model-evaluation-pod-ghi789"},
						},
					},
				},
			},
		},
		{
			RunID:        "run-ghi789-jkl012",
			DisplayName:  "AutoRAG Optimization Run 2",
			Description:  "Another test run",
			ExperimentID: "exp-456",
			PipelineVersionReference: &models.PipelineVersionReference{
				PipelineID:        "9e3940d5-b275-4b64-be10-b914cd06c58e",
				PipelineVersionID: "version-v2",
			},
			State:          "RUNNING",
			StorageState:   "AVAILABLE",
			ServiceAccount: "pipeline-runner-dspa",
			CreatedAt:      "2026-02-24T12:00:00Z",
			ScheduledAt:    "2026-02-24T12:00:00Z",
			StateHistory: []models.RuntimeStatus{
				{
					UpdateTime: "2026-02-24T12:00:00Z",
					State:      "RUNNING",
				},
			},
			RunDetails: &models.RunDetails{
				TaskDetails: []models.TaskDetail{
					{
						RunID:       "run-ghi789-jkl012",
						TaskID:      "task-data-loading",
						DisplayName: "Data Loading",
						CreateTime:  "2026-02-24T12:00:00Z",
						StartTime:   "2026-02-24T12:00:05Z",
						EndTime:     "2026-02-24T12:02:00Z",
						State:       "SUCCEEDED",
						ChildTasks: []models.ChildTask{
							{PodName: "data-loading-pod-xyz123"},
						},
					},
					{
						RunID:       "run-ghi789-jkl012",
						TaskID:      "task-feature-engineering",
						DisplayName: "Feature Engineering",
						CreateTime:  "2026-02-24T12:00:00Z",
						StartTime:   "2026-02-24T12:02:10Z",
						State:       "RUNNING",
						ChildTasks: []models.ChildTask{
							{PodName: "feature-engineering-pod-xyz456"},
						},
					},
				},
			},
		},
		{
			RunID:        "run-mno345-pqr678",
			DisplayName:  "AutoRAG Baseline Run",
			Description:  "Baseline comparison run",
			ExperimentID: "exp-123",
			PipelineVersionReference: &models.PipelineVersionReference{
				PipelineID:        "9e3940d5-b275-4b64-be10-b914cd06c58e",
				PipelineVersionID: "22e57c06-030f-4c63-900d-0a808d577899",
			},
			State:          "FAILED",
			StorageState:   "AVAILABLE",
			ServiceAccount: "pipeline-runner-dspa",
			CreatedAt:      "2026-02-23T14:00:00Z",
			ScheduledAt:    "2026-02-23T14:00:00Z",
			FinishedAt:     "2026-02-23T14:30:00Z",
			Error: &models.ErrorInfo{
				Code:    500,
				Message: "Pipeline execution failed: unable to connect to data source",
			},
			StateHistory: []models.RuntimeStatus{
				{
					UpdateTime: "2026-02-23T14:00:00Z",
					State:      "RUNNING",
				},
				{
					UpdateTime: "2026-02-23T14:30:00Z",
					State:      "FAILED",
					Error: &models.ErrorInfo{
						Code:    500,
						Message: "Pipeline execution failed: unable to connect to data source",
					},
				},
			},
			RunDetails: &models.RunDetails{
				TaskDetails: []models.TaskDetail{
					{
						RunID:       "run-mno345-pqr678",
						TaskID:      "task-data-validation",
						DisplayName: "Data Validation",
						CreateTime:  "2026-02-23T14:00:00Z",
						StartTime:   "2026-02-23T14:00:05Z",
						EndTime:     "2026-02-23T14:05:00Z",
						State:       "SUCCEEDED",
						ChildTasks: []models.ChildTask{
							{PodName: "data-validation-pod-abc987"},
						},
					},
					{
						RunID:       "run-mno345-pqr678",
						TaskID:      "task-data-fetch",
						DisplayName: "Data Fetch",
						CreateTime:  "2026-02-23T14:00:00Z",
						StartTime:   "2026-02-23T14:05:10Z",
						EndTime:     "2026-02-23T14:30:00Z",
						State:       "FAILED",
						Error: &models.ErrorInfo{
							Code:    500,
							Message: "Unable to connect to data source: connection timeout",
						},
						ChildTasks: []models.ChildTask{
							{PodName: "data-fetch-pod-def654"},
						},
					},
				},
			},
		},
	}
}

// cloneRunWithVariant returns a copy of the template run with unique IDs for the given index
func cloneRunWithVariant(template *models.KFPipelineRun, index int) models.KFPipelineRun {
	run := *template
	suffix := fmt.Sprintf("-%d", index)
	run.RunID = template.RunID + suffix
	run.DisplayName = template.DisplayName + " " + suffix
	if run.RunDetails != nil {
		details := *run.RunDetails
		for i := range details.TaskDetails {
			details.TaskDetails[i].RunID = run.RunID
		}
		run.RunDetails = &details
	}
	return run
}

// extractPipelineVersionIDFromFilter parses the filter JSON and extracts pipeline_version_id if present
func extractPipelineVersionIDFromFilter(filter string) string {
	var filterObj struct {
		Predicates []struct {
			Key         string `json:"key"`
			StringValue string `json:"string_value"`
		} `json:"predicates"`
	}

	if err := json.Unmarshal([]byte(filter), &filterObj); err != nil {
		return ""
	}

	for _, predicate := range filterObj.Predicates {
		if predicate.Key == "pipeline_version_id" {
			return predicate.StringValue
		}
	}

	return ""
}

// GetRun returns a mock pipeline run by ID
// Special run IDs for testing error conditions:
// - "non-existent-run-id" returns 404 error
// - "server-error-run-id" returns 500 error
func (m *MockPipelineServerClient) GetRun(ctx context.Context, runID string) (*models.KFPipelineRun, error) {
	// Record runID for test assertions
	m.LastGetRunID = runID

	// Simulate 404 error for non-existent run
	if runID == "non-existent-run-id" {
		return nil, &pipelineserver.HTTPError{
			StatusCode: 404,
			Message:    `{"code":5, "message":"Failed to get a run: Failed to fetch run non-existent-run-id: ResourceNotFoundError: Run non-existent-run-id not found"}`,
		}
	}

	// Simulate 500 error for server errors
	if runID == "server-error-run-id" {
		return nil, &pipelineserver.HTTPError{
			StatusCode: 500,
			Message:    "Internal server error",
		}
	}

	// Return mock data based on the run ID
	mockRun := &models.KFPipelineRun{
		RunID:        runID,
		DisplayName:  "AutoRAG Optimization Run",
		Description:  "Test optimization run",
		ExperimentID: "exp-123",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        "9e3940d5-b275-4b64-be10-b914cd06c58e",
			PipelineVersionID: "22e57c06-030f-4c63-900d-0a808d577899",
		},
		State:          "SUCCEEDED",
		StorageState:   "AVAILABLE",
		ServiceAccount: "pipeline-runner-dspa",
		CreatedAt:      "2026-02-24T10:30:00Z",
		ScheduledAt:    "2026-02-24T10:30:00Z",
		FinishedAt:     "2026-02-24T11:15:00Z",
		StateHistory: []models.RuntimeStatus{
			{
				UpdateTime: "2026-02-24T10:30:00Z",
				State:      "RUNNING",
			},
			{
				UpdateTime: "2026-02-24T11:15:00Z",
				State:      "SUCCEEDED",
			},
		},
		RunDetails: &models.RunDetails{
			TaskDetails: []models.TaskDetail{
				{
					RunID:       runID,
					TaskID:      "task-prepare-data",
					DisplayName: "Prepare Data",
					CreateTime:  "2026-02-24T10:30:00Z",
					StartTime:   "2026-02-24T10:30:05Z",
					EndTime:     "2026-02-24T10:32:00Z",
					State:       "SUCCEEDED",
					ChildTasks: []models.ChildTask{
						{PodName: "prepare-data-pod"},
					},
				},
				{
					RunID:       runID,
					TaskID:      "task-train-model",
					DisplayName: "Train Model",
					CreateTime:  "2026-02-24T10:30:00Z",
					StartTime:   "2026-02-24T10:32:10Z",
					EndTime:     "2026-02-24T11:15:00Z",
					State:       "SUCCEEDED",
					ChildTasks: []models.ChildTask{
						{PodName: "train-model-pod"},
					},
				},
			},
		},
	}
	return mockRun, nil
}

// CreateRun returns a mock pipeline run response matching real KFP v2beta1 output
func (m *MockPipelineServerClient) CreateRun(_ context.Context, request models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error) {
	now := time.Now().UTC()
	runID := uuid.New().String()

	return &models.KFPipelineRun{
		RunID:        runID,
		ExperimentID: uuid.New().String(),
		DisplayName:  request.DisplayName,
		Description:  request.Description,
		StorageState: "AVAILABLE",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        request.PipelineVersionReference.PipelineID,
			PipelineVersionID: request.PipelineVersionReference.PipelineVersionID,
		},
		RuntimeConfig:  &request.RuntimeConfig,
		ServiceAccount: "pipeline-runner-dspa",
		State:          "PENDING",
		CreatedAt:      now.Format(time.RFC3339),
		ScheduledAt:    now.Format(time.RFC3339),
		StateHistory: []models.RuntimeStatus{
			{
				UpdateTime: now.Format(time.RFC3339),
				State:      "PENDING",
			},
		},
		RunDetails: &models.RunDetails{
			TaskDetails: []models.TaskDetail{
				{
					RunID:       runID,
					TaskID:      uuid.New().String(),
					DisplayName: "root-driver",
					CreateTime:  now.Format(time.RFC3339),
					StartTime:   now.Format(time.RFC3339),
					State:       "PENDING",
					StateHistory: []models.RuntimeStatus{
						{UpdateTime: now.Format(time.RFC3339), State: "PENDING"},
					},
					ChildTasks: []models.ChildTask{
						{PodName: fmt.Sprintf("%s-%s", request.DisplayName, runID[:8])},
					},
				},
			},
		},
	}, nil
}

// MockClientFactory creates mock pipeline server clients
type MockClientFactory struct{}

// NewMockClientFactory creates a new mock client factory
func NewMockClientFactory() *MockClientFactory {
	return &MockClientFactory{}
}

// CreateClient creates a mock pipeline server client.
// When baseURL is "mock://namespace", returns namespace-specific mock data for UX testing.
func (f *MockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) pipelineserver.PipelineServerClientInterface {
	return NewMockPipelineServerClient(baseURL)
}
