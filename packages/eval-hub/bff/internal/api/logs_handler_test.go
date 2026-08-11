package api

import (
	"net/http"
	"testing"

	ehmocks "github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub/ehmocks"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetEvaluationJobLogsHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	body, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs?namespace=test-ns",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "text/plain; charset=utf-8", response.Header.Get("Content-Type"))
	assert.Contains(t, body, "eval-job-001")
	assert.Contains(t, body, "Starting evaluation")
}

func TestGetEvaluationJobLogsHandlerWithQueryParams(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	body, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs?namespace=test-ns&tail_lines=50&timestamps=true&since_seconds=300",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Contains(t, body, "eval-job-001")
}

func TestGetEvaluationJobLogsHandlerMissingNamespace(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobLogsHandlerClientError(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs?namespace=test-ns",
		nil, identity, &erroringEHClient{},
	)

	require.NoError(t, err)
	assert.True(t, response.StatusCode >= 400)
}

func TestGetEvaluationJobLogsHandlerInvalidTailLines(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	for _, tc := range []struct {
		name  string
		value string
	}{
		{"negative", "-10"},
		{"non-integer", "abc"},
		{"float", "3.5"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHubRaw(
				http.MethodGet,
				ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs?namespace=test-ns&tail_lines="+tc.value,
				nil, identity, mockClient,
			)
			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
		})
	}
}

func TestGetEvaluationJobLogsHandlerInvalidSinceSeconds(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	for _, tc := range []struct {
		name  string
		value string
	}{
		{"negative", "-1"},
		{"non-integer", "xyz"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHubRaw(
				http.MethodGet,
				ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs?namespace=test-ns&since_seconds="+tc.value,
				nil, identity, mockClient,
			)
			require.NoError(t, err)
			assert.Equal(t, http.StatusBadRequest, response.StatusCode)
		})
	}
}

func TestGetEvaluationJobLogsHandlerInvalidTimestamps(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/logs?namespace=test-ns&timestamps=yes",
		nil, identity, mockClient,
	)
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobBenchmarkLogsHandler(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	body, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/0/logs?namespace=test-ns",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, response.StatusCode)
	assert.Equal(t, "text/plain; charset=utf-8", response.Header.Get("Content-Type"))
	assert.Contains(t, body, "eval-job-001")
	assert.Contains(t, body, "benchmark 0")
}

func TestGetEvaluationJobBenchmarkLogsHandlerInvalidIndex(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/abc/logs?namespace=test-ns",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobBenchmarkLogsHandlerNegativeIndex(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/-1/logs?namespace=test-ns",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobBenchmarkLogsHandlerMissingNamespace(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/0/logs",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobBenchmarkLogsHandlerInvalidTailLines(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/0/logs?namespace=test-ns&tail_lines=-5",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobBenchmarkLogsHandlerInvalidSinceSeconds(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/0/logs?namespace=test-ns&since_seconds=abc",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}

func TestGetEvaluationJobBenchmarkLogsHandlerInvalidTimestamps(t *testing.T) {
	identity := &kubernetes.RequestIdentity{UserID: "user@example.com"}
	mockClient := ehmocks.NewMockEvalHubClient()

	_, response, err := setupApiTestWithEvalHubRaw(
		http.MethodGet,
		ApiPathPrefix+"/evaluations/jobs/eval-job-001/benchmarks/0/logs?namespace=test-ns&timestamps=1",
		nil, identity, mockClient,
	)

	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, response.StatusCode)
}
