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

func (m *MockEvalHubClient) ListEvaluationJobs(_ context.Context, _ evalhub.ListEvaluationJobsParams) ([]evalhub.EvaluationJob, error) {
	return []evalhub.EvaluationJob{
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-001",
				Tenant:    "GPT-4 Safety Assessment",
				CreatedAt: "2020-01-07T23:33:00Z",
				UpdatedAt: "2020-01-07T23:33:00Z",
			},
			Status: evalhub.JobStatus{State: "running"},
			Model:  evalhub.JobModel{Name: "gpt-4-turbo"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "Open LLM Leaderboard v2", ProviderID: "lm_evaluation_harness"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-002",
				Tenant:    "Healthcare Compliance Suite",
				CreatedAt: "2020-01-07T23:33:00Z",
				UpdatedAt: "2020-01-07T23:33:00Z",
			},
			Status: evalhub.JobStatus{State: "stopping"},
			Model:  evalhub.JobModel{Name: "llama-3-70b"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "Safety and Fairness", ProviderID: "lm_evaluation_harness"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-003",
				Tenant:    "MMLU Comprehensive",
				CreatedAt: "2020-01-07T23:33:00Z",
				UpdatedAt: "2020-01-07T23:33:00Z",
			},
			Status: evalhub.JobStatus{State: "failed"},
			Model:  evalhub.JobModel{Name: "claude-3-opus"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "MMLU Finance Subtasks", ProviderID: "lm_evaluation_harness"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-004",
				Tenant:    "Toxicity detection",
				CreatedAt: "2020-01-07T23:33:00Z",
				UpdatedAt: "2020-01-07T23:33:00Z",
			},
			Status: evalhub.JobStatus{State: "completed"},
			Results: evalhub.JobResults{
				TotalEvaluations: 1,
				Benchmarks: []evalhub.BenchmarkResult{
					{ID: "toxicity", Metrics: map[string]float64{"score": 0.46}},
				},
			},
			Model: evalhub.JobModel{Name: "Dataset [TBD]"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "Toxicity detection", ProviderID: "lm_evaluation_harness"},
			},
		},
		{
			Resource: evalhub.JobResource{
				ID:        "eval-job-005",
				Tenant:    "Telco Compliance Assessment",
				CreatedAt: "2020-01-07T23:33:00Z",
				UpdatedAt: "2020-01-07T23:33:00Z",
			},
			Status: evalhub.JobStatus{State: "stopped"},
			Model:  evalhub.JobModel{Name: "claude-3-opus"},
			Benchmarks: []evalhub.JobBenchmark{
				{ID: "Free Open-Telco LLM Benc...", ProviderID: "lm_evaluation_harness"},
			},
		},
	}, nil
}
