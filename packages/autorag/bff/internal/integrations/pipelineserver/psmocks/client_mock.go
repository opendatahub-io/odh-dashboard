package psmocks

import (
	"context"
	"crypto/x509"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/pipelineserver"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
)

// MockPipelineServerClient provides mock data for development
type MockPipelineServerClient struct{}

// NewMockPipelineServerClient creates a new mock pipeline server client
func NewMockPipelineServerClient() *MockPipelineServerClient {
	return &MockPipelineServerClient{}
}

// ListRuns returns mock pipeline run data
func (m *MockPipelineServerClient) ListRuns(ctx context.Context, params *pipelineserver.ListRunsParams) (*models.KFPipelineRunResponse, error) {
	pipelineID := "4b37f7d9-15a5-437f-841a-21ac9408c7ba"
	pipelineVersionID := "f9f93c7b-d5f4-4588-a7e0-c1d56243f6eb"

	return &models.KFPipelineRunResponse{
		Runs: []models.KFPipelineRun{
			{
				RunID:        "c5541098-01dc-47cd-82c1-d94536bd35d0",
				ExperimentID: "e77f84f2-9cef-41cf-ba36-ca7521b89954",
				DisplayName:  "AutoRAG Optimization Run 1",
				Description:  "Test optimization run with annotation filtering",
				StorageState: "AVAILABLE",
				PipelineVersionReference: &models.PipelineVersionReference{
					PipelineID:        pipelineID,
					PipelineVersionID: pipelineVersionID,
				},
				State:          "SUCCEEDED",
				ServiceAccount: "pipeline-runner-dspa",
				CreatedAt:      "2026-02-19T22:08:27Z",
				ScheduledAt:    "2026-02-19T22:08:27Z",
				FinishedAt:     "2026-02-19T22:14:40Z",
				RuntimeConfig: &models.RuntimeConfig{
					Parameters: map[string]interface{}{
						"input_data_bucket_name":  "autorag",
						"input_data_key":          "documents/",
						"input_data_secret_name":  "minio-secret",
						"llama_stack_secret_name": "test",
						"optimization_metric":     "faithfulness",
						"test_data_bucket_name":   "autorag",
						"test_data_key":           "test_data.json",
						"test_data_secret_name":   "minio-secret",
					},
				},
				StateHistory: []models.RuntimeStatus{
					{UpdateTime: "2026-02-19T22:08:27Z", State: "PENDING"},
					{UpdateTime: "2026-02-19T22:08:28Z", State: "RUNNING"},
					{UpdateTime: "2026-02-19T22:14:42Z", State: "SUCCEEDED"},
				},
				RunDetails: &models.RunDetails{
					TaskDetails: []models.TaskDetail{
						{
							RunID: "c5541098-01dc-47cd-82c1-d94536bd35d0", TaskID: "f31ff40e-4e0d-40ba-9ed6-18381696f364",
							DisplayName: "root-driver", CreateTime: "2026-02-19T22:08:27Z", StartTime: "2026-02-19T22:08:27Z", EndTime: "2026-02-19T22:08:31Z", State: "SUCCEEDED",
							StateHistory: []models.RuntimeStatus{{UpdateTime: "2026-02-19T22:08:28Z", State: "PENDING"}, {UpdateTime: "2026-02-19T22:08:38Z", State: "SUCCEEDED"}},
							ChildTasks:   []models.ChildTask{{PodName: "documents-rag-optimization-pipeline-v5dg9-382152251"}},
						},
						{
							RunID: "c5541098-01dc-47cd-82c1-d94536bd35d0", TaskID: "7a6051a6-e1c7-460e-b58f-ef507010c345",
							DisplayName: "test-data-loader", CreateTime: "2026-02-19T22:08:27Z", StartTime: "2026-02-19T22:08:47Z", EndTime: "2026-02-19T22:08:57Z", State: "SUCCEEDED",
							StateHistory: []models.RuntimeStatus{{UpdateTime: "2026-02-19T22:08:48Z", State: "RUNNING"}, {UpdateTime: "2026-02-19T22:08:58Z", State: "SUCCEEDED"}},
							ChildTasks:   []models.ChildTask{{PodName: "documents-rag-optimization-pipeline-v5dg9-2180753489"}},
						},
						{
							RunID: "c5541098-01dc-47cd-82c1-d94536bd35d0", TaskID: "7ae27466-fd96-4a6d-a1ac-1567cd673f03",
							DisplayName: "text-extraction", CreateTime: "2026-02-19T22:08:27Z", StartTime: "2026-02-19T22:09:28Z", EndTime: "2026-02-19T22:12:00Z", State: "SUCCEEDED",
							StateHistory: []models.RuntimeStatus{{UpdateTime: "2026-02-19T22:09:29Z", State: "RUNNING"}, {UpdateTime: "2026-02-19T22:12:01Z", State: "SUCCEEDED"}},
							ChildTasks:   []models.ChildTask{{PodName: "documents-rag-optimization-pipeline-v5dg9-2700541185"}},
						},
						{
							RunID: "c5541098-01dc-47cd-82c1-d94536bd35d0", TaskID: "93514c04-a363-460f-a2cf-6bc5a774d74d",
							DisplayName: "search-space-preparation", CreateTime: "2026-02-19T22:08:27Z", StartTime: "2026-02-19T22:12:10Z", EndTime: "2026-02-19T22:13:04Z", State: "SUCCEEDED",
							StateHistory: []models.RuntimeStatus{{UpdateTime: "2026-02-19T22:12:12Z", State: "RUNNING"}, {UpdateTime: "2026-02-19T22:13:05Z", State: "SUCCEEDED"}},
							ChildTasks:   []models.ChildTask{{PodName: "documents-rag-optimization-pipeline-v5dg9-2826239971"}},
						},
						{
							RunID: "c5541098-01dc-47cd-82c1-d94536bd35d0", TaskID: "cb8be660-73cc-4862-9cf9-d8f0e12f2472",
							DisplayName: "leaderboard-evaluation", CreateTime: "2026-02-19T22:08:27Z", StartTime: "2026-02-19T22:14:17Z", EndTime: "2026-02-19T22:14:40Z", State: "SUCCEEDED",
							StateHistory: []models.RuntimeStatus{{UpdateTime: "2026-02-19T22:14:19Z", State: "RUNNING"}, {UpdateTime: "2026-02-19T22:14:42Z", State: "SUCCEEDED"}},
							ChildTasks:   []models.ChildTask{{PodName: "documents-rag-optimization-pipeline-v5dg9-822984830"}},
						},
					},
				},
			},
			{
				RunID:        "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
				ExperimentID: "e77f84f2-9cef-41cf-ba36-ca7521b89954",
				DisplayName:  "AutoRAG Optimization Run 2",
				Description:  "Running optimization with custom models",
				StorageState: "AVAILABLE",
				PipelineVersionReference: &models.PipelineVersionReference{
					PipelineID:        pipelineID,
					PipelineVersionID: pipelineVersionID,
				},
				State:          "RUNNING",
				ServiceAccount: "pipeline-runner-dspa",
				CreatedAt:      "2026-02-24T12:00:00Z",
				ScheduledAt:    "2026-02-24T12:00:00Z",
				RuntimeConfig: &models.RuntimeConfig{
					Parameters: map[string]interface{}{
						"input_data_bucket_name":  "autorag",
						"input_data_key":          "docs-v2/",
						"input_data_secret_name":  "minio-secret",
						"llama_stack_secret_name": "llama-secret",
						"optimization_metric":     "answer_correctness",
						"test_data_bucket_name":   "autorag",
						"test_data_key":           "test_data_v2.json",
						"test_data_secret_name":   "minio-secret",
					},
				},
				StateHistory: []models.RuntimeStatus{
					{UpdateTime: "2026-02-24T12:00:00Z", State: "PENDING"},
					{UpdateTime: "2026-02-24T12:00:01Z", State: "RUNNING"},
				},
			},
			{
				RunID:        "f9e8d7c6-b5a4-3210-fedc-ba0987654321",
				ExperimentID: "e77f84f2-9cef-41cf-ba36-ca7521b89954",
				DisplayName:  "AutoRAG Baseline Run",
				Description:  "Baseline comparison run",
				StorageState: "AVAILABLE",
				PipelineVersionReference: &models.PipelineVersionReference{
					PipelineID:        pipelineID,
					PipelineVersionID: pipelineVersionID,
				},
				State:          "FAILED",
				ServiceAccount: "pipeline-runner-dspa",
				CreatedAt:      "2026-02-23T14:00:00Z",
				ScheduledAt:    "2026-02-23T14:00:00Z",
				FinishedAt:     "2026-02-23T14:30:00Z",
				RuntimeConfig: &models.RuntimeConfig{
					Parameters: map[string]interface{}{
						"input_data_bucket_name":  "autorag",
						"input_data_key":          "documents/",
						"input_data_secret_name":  "minio-secret",
						"llama_stack_secret_name": "test",
						"optimization_metric":     "context_correctness",
						"test_data_bucket_name":   "autorag",
						"test_data_key":           "test_data.json",
						"test_data_secret_name":   "minio-secret",
					},
				},
				StateHistory: []models.RuntimeStatus{
					{UpdateTime: "2026-02-23T14:00:00Z", State: "PENDING"},
					{UpdateTime: "2026-02-23T14:00:01Z", State: "RUNNING"},
					{UpdateTime: "2026-02-23T14:30:00Z", State: "FAILED"},
				},
			},
		},
		TotalSize:     3,
		NextPageToken: "",
	}, nil
}

// CreateRun returns a mock pipeline run response matching real KFP v2beta1 output
func (m *MockPipelineServerClient) CreateRun(_ context.Context, request models.CreatePipelineRunKFRequest) (*models.KFPipelineRun, error) {
	now := time.Now().UTC()
	runID := uuid.New().String()
	pipelineVersionID := uuid.New().String()

	return &models.KFPipelineRun{
		RunID:        runID,
		ExperimentID: uuid.New().String(),
		DisplayName:  request.DisplayName,
		Description:  request.Description,
		StorageState: "AVAILABLE",
		PipelineVersionReference: &models.PipelineVersionReference{
			PipelineID:        request.PipelineVersionReference.PipelineID,
			PipelineVersionID: pipelineVersionID,
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

// CreateClient creates a mock pipeline server client
func (f *MockClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) pipelineserver.PipelineServerClientInterface {
	return NewMockPipelineServerClient()
}
