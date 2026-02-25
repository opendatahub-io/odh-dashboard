package evalhub

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEvalHubClient_HealthCheck(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/health", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(HealthResponse{Status: "healthy"})
	}))
	defer server.Close()

	client := NewEvalHubClient(server.URL, "", false, nil, "/api/v1")
	resp, err := client.HealthCheck(context.Background())

	require.NoError(t, err)
	assert.Equal(t, "healthy", resp.Status)
}

func TestEvalHubClient_HealthCheck_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal error"))
	}))
	defer server.Close()

	client := NewEvalHubClient(server.URL, "", false, nil, "/api/v1")
	_, err := client.HealthCheck(context.Background())

	require.Error(t, err)
	var ehErr *EvalHubError
	require.ErrorAs(t, err, &ehErr)
	assert.Equal(t, ErrCodeInternalError, ehErr.Code)
}

func TestEvalHubClient_ListEvaluationJobs(t *testing.T) {
	resp := EvaluationJobsResponse{
		TotalCount: 2,
		Limit:      50,
		Items: []EvaluationJob{
			{
				Resource:   JobResource{ID: "job-1", CreatedAt: "2026-02-20T10:00:00Z"},
				Status:     JobStatus{State: "completed"},
				Model:      JobModel{Name: "test-model"},
				Benchmarks: []JobBenchmark{{ID: "arc_easy", ProviderID: "lm_evaluation_harness"}},
			},
			{
				Resource:   JobResource{ID: "job-2", CreatedAt: "2026-02-24T08:00:00Z"},
				Status:     JobStatus{State: "running"},
				Model:      JobModel{Name: "test-model-2"},
				Benchmarks: []JobBenchmark{{ID: "hellaswag", ProviderID: "lm_evaluation_harness"}},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/api/v1/evaluations/jobs", r.URL.Path)
		assert.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := NewEvalHubClient(server.URL, "test-token", false, nil, "/api/v1")
	result, err := client.ListEvaluationJobs(context.Background())

	require.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "job-1", result[0].Resource.ID)
	assert.Equal(t, "completed", result[0].Status.State)
	assert.Equal(t, "test-model", result[0].Model.Name)
}

func TestEvalHubClient_ListEvaluationJobs_ServerError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
		w.Write([]byte("service unavailable"))
	}))
	defer server.Close()

	client := NewEvalHubClient(server.URL, "", false, nil, "/api/v1")
	_, err := client.ListEvaluationJobs(context.Background())

	require.Error(t, err)
	var ehErr *EvalHubError
	require.ErrorAs(t, err, &ehErr)
	assert.Equal(t, ErrCodeServerUnavailable, ehErr.Code)
}

func TestEvalHubClient_ConnectionError(t *testing.T) {
	client := NewEvalHubClient("http://localhost:1", "", false, nil, "/api/v1")
	_, err := client.HealthCheck(context.Background())

	require.Error(t, err)
	var ehErr *EvalHubError
	require.ErrorAs(t, err, &ehErr)
	assert.Equal(t, ErrCodeConnectionFailed, ehErr.Code)
}

func TestEvalHubClient_NotFoundError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("not found"))
	}))
	defer server.Close()

	client := NewEvalHubClient(server.URL, "", false, nil, "/api/v1")
	_, err := client.ListEvaluationJobs(context.Background())

	require.Error(t, err)
	var ehErr *EvalHubError
	require.ErrorAs(t, err, &ehErr)
	assert.Equal(t, ErrCodeNotFound, ehErr.Code)
}

func TestEvalHubClient_UnauthorizedError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("unauthorized"))
	}))
	defer server.Close()

	client := NewEvalHubClient(server.URL, "", false, nil, "/api/v1")
	_, err := client.ListEvaluationJobs(context.Background())

	require.Error(t, err)
	var ehErr *EvalHubError
	require.ErrorAs(t, err, &ehErr)
	assert.Equal(t, ErrCodeUnauthorized, ehErr.Code)
}
