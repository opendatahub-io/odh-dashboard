package psmocks

import (
	"context"
	"crypto/sha256"
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

// MockPipelineIDs holds deterministic, namespace-scoped UUIDs for mock pipeline fixtures.
// Because IDs are derived from the namespace, each tenant gets a distinct set — so a test
// using the wrong namespace will produce mismatching IDs and fail authorization checks.
type MockPipelineIDs struct {
	PipelineID      string // UUID for the AutoRAG pipeline
	LatestVersionID string // UUID for the most-recently-created pipeline version
	OldVersionID    string // UUID for the older pipeline version
}

// DeriveMockIDs returns a consistent MockPipelineIDs set for the given namespace by
// applying SHA-256 to distinct seeds.  Two different namespaces always produce different IDs.
func DeriveMockIDs(namespace string) MockPipelineIDs {
	return MockPipelineIDs{
		PipelineID:      hashUUID("pipeline:" + namespace),
		LatestVersionID: hashUUID("version-latest:" + namespace),
		OldVersionID:    hashUUID("version-old:" + namespace),
	}
}

// DeriveMockIDsFromName returns a consistent MockPipelineIDs set for the given pipeline name
// and namespace.  Used when multiple named pipelines exist in the same namespace.
func DeriveMockIDsFromName(namespace, name string) MockPipelineIDs {
	return MockPipelineIDs{
		PipelineID:      hashUUID("pipeline:" + name + ":" + namespace),
		LatestVersionID: hashUUID("version-latest:" + name + ":" + namespace),
		OldVersionID:    hashUUID("version-old:" + name + ":" + namespace),
	}
}

// hashUUID converts the SHA-256 digest of input into a UUID-formatted string.
func hashUUID(input string) string {
	h := sha256.Sum256([]byte(input))
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		h[0:4], h[4:6], h[6:8], h[8:10], h[10:16])
}

// defaultPipelineNamePrefix is the prefix used when PipelineNamePrefix is not set.
const defaultPipelineNamePrefix = "documents-rag-optimization-pipeline"

// MockPipelineServerClient provides mock data for development
type MockPipelineServerClient struct {
	// Namespace determines which mock data set to return (default: 5 runs, bella: empty, bento: 30 runs)
	Namespace string
	// PipelineNamePrefix is the prefix used to construct the AutoRAG pipeline's DisplayName in
	// ListPipelines.  Defaults to "documents-rag-optimization-pipeline" when empty,
	// matching the default discovery prefix in discoverOnePipeline.  Tests that exercise
	// non-default discovery prefixes can set this field to match the prefix they pass.
	// Ignored when PipelineNames is set.
	PipelineNamePrefix string
	// PipelineNames, when non-empty, overrides PipelineNamePrefix: ListPipelines returns one
	// pipeline entry per name in this slice (with IDs derived from name+namespace).
	// ListPipelineVersions returns versions for any of these pipelines' derived IDs.
	PipelineNames []string
	// LastListRunsParams records the last parameters passed to ListRuns for test assertions
	LastListRunsParams *pipelineserver.ListRunsParams
	// LastGetRunID records the last runID passed to GetRun for test assertions
	LastGetRunID string
	// LastTerminateRunID records the last runID passed to TerminateRun for test assertions
	LastTerminateRunID string
	// LastRetryRunID records the last runID passed to RetryRun for test assertions
	LastRetryRunID string
	// LastDeleteRunID records the last runID passed to DeleteRun for test assertions
	LastDeleteRunID string
}

// pipelineDisplayName returns the DisplayName used for the AutoRAG pipeline fixture,
// falling back to the default prefix when PipelineNamePrefix is not set.
func (m *MockPipelineServerClient) pipelineDisplayName() string {
	if m.PipelineNamePrefix != "" {
		return m.PipelineNamePrefix
	}
	return defaultPipelineNamePrefix
}

// CreatePipeline returns a mock pipeline shell (no version).
func (m *MockPipelineServerClient) CreatePipeline(_ context.Context, name string) (*models.KFPipeline, error) {
	m.PipelineNames = append(m.PipelineNames, name)
	ids := DeriveMockIDsFromName(m.Namespace, name)
	return &models.KFPipeline{
		PipelineID:  ids.PipelineID,
		DisplayName: name,
		Namespace:   m.Namespace,
		CreatedAt:   "2026-04-08T12:00:00Z",
	}, nil
}

// UploadPipelineVersion returns a mock pipeline version with the given version name.
func (m *MockPipelineServerClient) UploadPipelineVersion(_ context.Context, pipelineID string, versionName string, _ []byte) (*models.KFPipelineVersion, error) {
	return &models.KFPipelineVersion{
		PipelineID:        pipelineID,
		PipelineVersionID: hashUUID("version:" + pipelineID + ":" + versionName),
		DisplayName:       versionName,
		CreatedAt:         "2026-04-08T12:00:00Z",
	}, nil
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
	baseRuns := getBaseMockRuns(namespace)
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

// getBaseMockRuns returns the base run templates with IDs derived from the namespace
// so that runs from different tenants carry distinct pipeline references.
func getBaseMockRuns(namespace string) []models.KFPipelineRun {
	ids := DeriveMockIDs(namespace)
	return []models.KFPipelineRun{
		{
			RunID:        "run-abc123-def456",
			DisplayName:  "AutoRAG Optimization Run 1",
			Description:  "Test optimization run",
			ExperimentID: "exp-123",
			PipelineVersionReference: &models.PipelineVersionReference{
				PipelineID:        ids.PipelineID,
				PipelineVersionID: ids.LatestVersionID,
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
				PipelineID:        ids.PipelineID,
				PipelineVersionID: ids.LatestVersionID,
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
				PipelineID:        ids.PipelineID,
				PipelineVersionID: ids.LatestVersionID,
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

// cloneRunWithVariant returns a copy of the template run with unique IDs for the given index.
// TaskDetails are deep-copied to prevent mutations from affecting the original template.
func cloneRunWithVariant(template *models.KFPipelineRun, index int) models.KFPipelineRun {
	run := *template
	suffix := fmt.Sprintf("-%d", index)
	run.RunID = template.RunID + suffix
	run.DisplayName = template.DisplayName + " " + suffix
	if run.RunDetails != nil {
		details := *run.RunDetails
		// Deep copy the TaskDetails slice so mutations don't affect the original template
		tasks := make([]models.TaskDetail, len(details.TaskDetails))
		copy(tasks, details.TaskDetails)
		for i := range tasks {
			tasks[i].RunID = run.RunID
		}
		details.TaskDetails = tasks
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

	// Look up the run from the base mock data so that state-dependent
	// logic (terminate / retry) sees the correct State value.
	for _, run := range getBaseMockRuns(m.Namespace) {
		if run.RunID == runID {
			return &run, nil
		}
	}

	// Fallback for unknown run IDs: return a generic SUCCEEDED run
	ids := DeriveMockIDs(m.Namespace)
	mockRun := &models.KFPipelineRun{
		RunID:        runID,
		DisplayName:  "AutoRAG Optimization Run",
		Description:  "Test optimization run",
		ExperimentID: "exp-123",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        ids.PipelineID,
			PipelineVersionID: ids.LatestVersionID,
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

// GetPipelineVersion returns a mock pipeline version with a pipeline_spec for topology visualization
func (m *MockPipelineServerClient) GetPipelineVersion(_ context.Context, _, _ string) (*models.KFPipelineVersion, error) {
	return &models.KFPipelineVersion{
		PipelineID:        "9e3940d5-b275-4b64-be10-b914cd06c58e",
		PipelineVersionID: "22e57c06-030f-4c63-900d-0a808d577899",
		DisplayName:       "mock-pipeline-version",
		PipelineSpec: json.RawMessage(`{"root":{"dag":{"tasks":{
			"test-data-loader":{"taskInfo":{"name":"test-data-loader"},"dependentTasks":[],"componentRef":{"name":""}},
			"text-extraction":{"taskInfo":{"name":"text-extraction"},"dependentTasks":["test-data-loader"],"componentRef":{"name":""}},
			"leaderboard-evaluation":{"taskInfo":{"name":"leaderboard-evaluation"},"dependentTasks":["text-extraction"],"componentRef":{"name":""}}
		}}}}`),
	}, nil
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

// TerminateRun simulates terminating a pipeline run.
// Special run IDs for testing error conditions:
// - "non-existent-run-id" returns 404 error
// - "server-error-run-id" returns 500 error
func (m *MockPipelineServerClient) TerminateRun(_ context.Context, runID string) error {
	m.LastTerminateRunID = runID

	if runID == "non-existent-run-id" {
		return &pipelineserver.HTTPError{
			StatusCode: 404,
			Message:    fmt.Sprintf("Failed to terminate run: Run %s not found", runID),
		}
	}

	if runID == "server-error-run-id" {
		return &pipelineserver.HTTPError{
			StatusCode: 500,
			Message:    "Internal server error",
		}
	}

	return nil
}

// RetryRun simulates retrying a failed or terminated pipeline run.
// Special run IDs for testing error conditions:
// - "non-existent-run-id" returns 404 error
// - "server-error-run-id" returns 500 error
func (m *MockPipelineServerClient) RetryRun(_ context.Context, runID string) error {
	m.LastRetryRunID = runID

	if runID == "non-existent-run-id" {
		return &pipelineserver.HTTPError{
			StatusCode: 404,
			Message:    fmt.Sprintf("Failed to retry run: Run %s not found", runID),
		}
	}

	if runID == "server-error-run-id" {
		return &pipelineserver.HTTPError{
			StatusCode: 500,
			Message:    "Internal server error",
		}
	}

	return nil
}

// DeleteRun simulates deleting a pipeline run.
// Special run IDs for testing error conditions:
// - "non-existent-run-id" returns 404 error
// - "server-error-run-id" returns 500 error
func (m *MockPipelineServerClient) DeleteRun(_ context.Context, runID string) error {
	m.LastDeleteRunID = runID

	if runID == "non-existent-run-id" {
		return &pipelineserver.HTTPError{
			StatusCode: 404,
			Message:    fmt.Sprintf("Failed to delete run: Run %s not found", runID),
		}
	}

	if runID == "server-error-run-id" {
		return &pipelineserver.HTTPError{
			StatusCode: 500,
			Message:    "Internal server error",
		}
	}

	return nil
}

// ListPipelines returns mock pipeline data with namespace-derived IDs.
// The filter parameter is accepted but ignored by the mock (all pipelines are always returned).
// When PipelineNames is set, returns one pipeline per name with IDs derived from name+namespace.
func (m *MockPipelineServerClient) ListPipelines(ctx context.Context, filter string) (*models.KFPipelinesResponse, error) {
	if len(m.PipelineNames) > 0 {
		pipelines := make([]models.KFPipeline, 0, len(m.PipelineNames))
		for _, name := range m.PipelineNames {
			ids := DeriveMockIDsFromName(m.Namespace, name)
			pipelines = append(pipelines, models.KFPipeline{
				PipelineID:  ids.PipelineID,
				DisplayName: name,
				Description: "Managed AutoRAG pipeline",
				CreatedAt:   "2026-02-20T10:00:00Z",
				Namespace:   m.Namespace,
			})
		}
		return &models.KFPipelinesResponse{
			Pipelines:     pipelines,
			TotalSize:     int32(len(pipelines)),
			NextPageToken: "",
		}, nil
	}

	ids := DeriveMockIDs(m.Namespace)
	return &models.KFPipelinesResponse{
		Pipelines: []models.KFPipeline{
			{
				PipelineID:  ids.PipelineID,
				DisplayName: m.pipelineDisplayName(),
				Description: "Managed AutoRAG pipeline for optimizing retrieval strategies",
				CreatedAt:   "2026-02-20T10:00:00Z",
				Namespace:   m.Namespace,
			},
			{
				PipelineID:  hashUUID("other-pipeline:" + m.Namespace),
				DisplayName: "another-pipeline",
				Description: "Some other pipeline",
				CreatedAt:   "2026-02-21T10:00:00Z",
				Namespace:   m.Namespace,
			},
		},
		TotalSize:     2,
		NextPageToken: "",
	}, nil
}

// ListPipelineVersions returns mock pipeline version data sorted by created_at desc (newest first),
// matching the sort order requested by the real pipeline server client.
// When PipelineNames is set, returns versions for any matching pipeline ID derived from names.
func (m *MockPipelineServerClient) ListPipelineVersions(ctx context.Context, pipelineID string) (*models.KFPipelineVersionsResponse, error) {
	if len(m.PipelineNames) > 0 {
		for _, name := range m.PipelineNames {
			ids := DeriveMockIDsFromName(m.Namespace, name)
			if pipelineID == ids.PipelineID {
				return &models.KFPipelineVersionsResponse{
					PipelineVersions: []models.KFPipelineVersion{
						{
							PipelineID:        ids.PipelineID,
							PipelineVersionID: ids.LatestVersionID,
							DisplayName:       "v1.0.0",
							Description:       "Pipeline version",
							CreatedAt:         "2026-02-23T10:00:00Z",
						},
					},
					TotalSize:     1,
					NextPageToken: "",
				}, nil
			}
		}
		return &models.KFPipelineVersionsResponse{
			PipelineVersions: []models.KFPipelineVersion{},
			TotalSize:        0,
			NextPageToken:    "",
		}, nil
	}

	ids := DeriveMockIDs(m.Namespace)

	// Only return versions for this namespace's AutoRAG pipeline
	if pipelineID == ids.PipelineID {
		return &models.KFPipelineVersionsResponse{
			PipelineVersions: []models.KFPipelineVersion{
				{
					PipelineID:        ids.PipelineID,
					PipelineVersionID: ids.LatestVersionID,
					DisplayName:       "v2.0.0",
					Description:       "Updated AutoRAG pipeline with improved metrics",
					CreatedAt:         "2026-02-23T10:00:00Z",
				},
				{
					PipelineID:        ids.PipelineID,
					PipelineVersionID: ids.OldVersionID,
					DisplayName:       "v1.0.0",
					Description:       "Initial AutoRAG pipeline version",
					CreatedAt:         "2026-02-20T10:00:00Z",
				},
			},
			TotalSize:     2,
			NextPageToken: "",
		}, nil
	}

	// Return empty for pipelines not belonging to this namespace
	return &models.KFPipelineVersionsResponse{
		PipelineVersions: []models.KFPipelineVersion{},
		TotalSize:        0,
		NextPageToken:    "",
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
