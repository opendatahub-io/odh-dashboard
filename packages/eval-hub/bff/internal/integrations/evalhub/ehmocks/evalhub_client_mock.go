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

// ListCollections returns all mock benchmark collections.
func (m *MockEvalHubClient) ListCollections(_ context.Context) (evalhub.CollectionsResponse, error) {
	return evalhub.CollectionsResponse{Items: mockCollections()}, nil
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

// mockCollections returns the full catalogue used by all mock responses.
func mockCollections() []evalhub.Collection {
	return []evalhub.Collection{
		{
			Resource:    evalhub.CollectionResource{ID: "collection-001"},
			Name:        "Open LLM Leaderboard v2",
			Description: "Comprehensive evaluation suite for general-purpose language models.",
			Tags:        []string{"Comprehensive", "Industry Standard"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "arc_challenge", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "hellaswag", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "mmlu", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "truthfulqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "winogrande", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "gsm8k", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-002"},
			Name:        "Safety and Fairness",
			Description: "Evaluates model safety, bias, and fairness across diverse scenarios.",
			Tags:        []string{"Bias", "Fairness"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "bbq", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "bold", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "winobias", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "toxigen", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "crows_pairs", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "stereoset", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-003"},
			Name:        "Open-Telco LLM Benchmark",
			Description: "Specialized benchmarks for telecommunications industry applications.",
			Tags:        []string{"Industry", "Domain-specific"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "telco_qa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "network_config", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "telecom_ner", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "fault_diagnosis", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "telco_summarization", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-004"},
			Name:        "Healthcare Evaluation v5",
			Description: "Medical and healthcare domain-specific evaluation suite.",
			Tags:        []string{"Medical", "Domain-specific"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "medqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "medmcqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "pubmedqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "clinical_ner", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "icd_coding", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "radiology_vqa", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-005"},
			Name:        "Finance Evaluation v3",
			Description: "Financial services and banking domain evaluation suite.",
			Tags:        []string{"Banking", "Domain-specific"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "finqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "convfinqa", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "finbench", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "flue", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "fomc", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "fpb", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
		{
			Resource:    evalhub.CollectionResource{ID: "collection-006"},
			Name:        "Software Development v1",
			Description: "Code generation, debugging, and software development tasks.",
			Tags:        []string{"Software", "Engineering"},
			Benchmarks: []evalhub.CollectionBenchmark{
				{ID: "humaneval", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "mbpp", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "ds1000", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "swebench", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "codecontests", ProviderID: "lm_evaluation_harness", Weight: 1},
				{ID: "apps", ProviderID: "lm_evaluation_harness", Weight: 1},
			},
		},
	}
}
