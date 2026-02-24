package ehmocks

import (
	"context"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
)

// MockEvalHubClient provides canned responses for development and testing.
type MockEvalHubClient struct{}

func NewMockEvalHubClient() *MockEvalHubClient {
	return &MockEvalHubClient{}
}

func (m *MockEvalHubClient) HealthCheck(_ context.Context) (*evalhub.HealthResponse, error) {
	return &evalhub.HealthResponse{Status: "healthy"}, nil
}

func (m *MockEvalHubClient) ListEvaluationJobs(_ context.Context) ([]evalhub.EvaluationJob, error) {
	return []evalhub.EvaluationJob{
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-001",
				CreatedAt: "2026-02-20T10:00:00Z",
				UpdatedAt: "2026-02-20T11:30:00Z",
			},
			Status: evalhub.JobStatus{State: "completed"},
			Model:  evalhub.JobModel{Name: "meta-llama/Llama-3.1-8B-Instruct"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "arc_easy", ProviderID: "lm_evaluation_harness"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-002",
				CreatedAt: "2026-02-24T08:00:00Z",
			},
			Status: evalhub.JobStatus{State: "running"},
			Model:  evalhub.JobModel{Name: "mistralai/Mistral-7B-v0.1"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "hellaswag", ProviderID: "lm_evaluation_harness"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-003",
				CreatedAt: "2026-02-24T09:15:00Z",
			},
			Status: evalhub.JobStatus{State: "pending"},
			Model:  evalhub.JobModel{Name: "meta-llama/Llama-3.1-70B-Instruct"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "mmlu", ProviderID: "lm_evaluation_harness"},
			},
		},
	}, nil
}
